import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Users, ChefHat, AlertCircle,
  RefreshCw, Wifi, Edit, User, LogOut, Database, Calendar, Bell, ClipboardList,
} from 'lucide-react';
import {
  USER_NAME_KEY,
  DEFAULT_SITE_NAME,
  FILTER_OPTIONS,
  TASK_TYPE_QUOTIDIEN,
  TASK_TYPE_ANNEXE,
  TASK_TYPE_SEMAINE,
} from './config/constants';
import { applyAnnexeRollover } from './lib/taskRollover';
import { buildQuotidienTasksForDate } from './lib/planningDay';
import { shouldShowEndOfDayReminder } from './lib/reminder';
import {
  buildPlannedTasksNotification,
  getNotificationPermission,
  shouldFireDailyNotification,
  showPlannedTasksNotification,
} from './lib/taskNotifications';
import {
  readNotificationEnabled,
  readNotificationHour,
  readLastNotificationDate,
  saveLastNotificationDate,
} from './lib/notificationPrefs';
import {
  isSupabaseConfigured,
  isSupabaseEmbeddedInBuild,
  supabase,
  clearSupabaseCredentials,
} from './lib/storage-supabase';
import {
  getUserRestaurant,
  getTasks,
  saveTask,
  saveTasks,
  deleteTask,
  deleteTasks,
  getPlanningConfig,
  clearRestaurantCache,
  materializeChecklistsForDate,
} from './lib/db';
import { nextStatus, normalizeTaskFields } from './lib/taskStatus';
import {
  TASK_STATUS_DONE,
  OPS_POSTS,
  TASK_LIST_ALL,
  TASK_LIST_FILTER_OPTIONS,
} from './config/opsConstants';
import { clearLastAuthEmail } from './lib/authPrefs';
import LoginScreen from './components/LoginScreen';
import Onboarding from './components/Onboarding';
import PlanningSettings from './components/PlanningSettings';
import TeamModal from './components/TeamModal';
import YearCalendarPlanner from './components/YearCalendarPlanner';
import NotificationSettings from './components/NotificationSettings';
import StatsBar from './components/StatsBar';
import PlanningCard from './components/PlanningCard';
import TaskTypeSelector from './components/TaskTypeSelector';
import OpsProgressCard from './components/OpsProgressCard';
import ChecklistSettings from './components/ChecklistSettings';
import {
  isUrgent,
  isOverdue,
  displayName,
  getTodayYmd,
  groupTasksByDay,
  isTaskDone,
  taskScheduledDay,
  matchesTaskListFilter,
  shouldHideStaleNettoyageTask,
} from './lib/taskUtils';
import TaskListByDay from './components/TaskListByDay';
import { useToast } from './context/ToastContext.jsx';

function getTodayDate() {
  return getTodayYmd();
}

// ─── Rôles et permissions ──────────────────────────────────────────────────────
const ROLE_LABELS = {
  owner:    { label: '👑 Gérant',  color: 'bg-amber-100 text-amber-800 border-amber-300' },
  manager:  { label: '🔑 Manager', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  employee: { label: '👤 Employé', color: 'bg-slate-100 text-slate-700 border-slate-300' },
};

function canManage(role) { return role === 'owner' || role === 'manager'; }
function canAdmin(role)  { return role === 'owner'; }

// ─── Dashboard principal ───────────────────────────────────────────────────────
export default function Dashboard({ onResetConfig }) {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '', category: 'cuisine', priority: 'moyenne',
    taskType: TASK_TYPE_ANNEXE, assignedTo: '', deadline: '', scheduledFor: '',
  });
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [showEndOfDayReminder, setShowEndOfDayReminder] = useState(false);
  const [filter, setFilter] = useState('all');
  const [listFilter, setListFilter] = useState(TASK_LIST_ALL);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState(null); // 'owner' | 'manager' | 'employee'
  const [isNameSet, setIsNameSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [planningConfig, setPlanningConfig] = useState(null);
  const [showPlanningSettings, setShowPlanningSettings] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  /** Après login/inscription : attendre la résolution user_roles avant d’afficher le tableau (évite flash + latence perçue). */
  const [postAuthPending, setPostAuthPending] = useState(false);
  const [onboardingDefaultName, setOnboardingDefaultName] = useState('');
  const [showTeam, setShowTeam] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showYearCalendar, setShowYearCalendar] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showChecklistSettings, setShowChecklistSettings] = useState(false);
  const [generatingChecklists, setGeneratingChecklists] = useState(false);
  const [postFilter, setPostFilter] = useState('all');
  const realtimeChannelRef = useRef(null);
  /** Évite double getUserRestaurant + loadTasks quand getSession() et onAuthStateChange arrivent à la suite (latence reconnexion). */
  const sessionHydrateBurstRef = useRef({ uid: null, at: 0 });
  const loadTasksInFlightRef = useRef(null);
  /** false sur l’écran login : évite onAuthStateChange pendant signUp/signIn (fetch « aborted »). */
  const authScreenUnlockedRef = useRef(false);
  /** true pendant signIn + onEnter : bloque les hydratations parallèles (Safari mobile). */
  const authFlowInProgressRef = useRef(false);
  const hydrateSessionRef = useRef(null);

  // ─── Auth & session ──────────────────────────────────────────────────────────
  useEffect(() => {
    const shouldSkipDuplicateHydrate = (session) => {
      const uid = session.user.id;
      const now = Date.now();
      const { uid: prev, at } = sessionHydrateBurstRef.current;
      if (prev === uid && now - at < 1600) {
        queueMicrotask(() => setPostAuthPending(false));
        return true;
      }
      sessionHydrateBurstRef.current = { uid, at: now };
      return false;
    };

    const hydrateSession = async (session) => {
      if (shouldSkipDuplicateHydrate(session)) return;
      try {
        const metaName = session.user.user_metadata?.restaurant_name || '';
        const memberLabel = session.user.user_metadata?.member_display_name;
        setUserName(
          memberLabel ||
            (session.user.is_anonymous ? 'Équipe' : session.user.email) ||
            'Équipe'
        );
        setOnboardingDefaultName(metaName);
        const resto = await getUserRestaurant();
        if (!resto) {
          setNeedsOnboarding(true);
          setIsNameSet(true);
          setLoading(false);
        } else {
          setUserRole(resto.role);
          setNeedsOnboarding(false);
          setIsNameSet(true);
          loadTasks();
          setupRealtimeSync(resto.id);
        }
      } finally {
        queueMicrotask(() => setPostAuthPending(false));
      }
    };
    hydrateSessionRef.current = hydrateSession;

    const checkSession = async () => {
      if (supabase) {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          const msg = (sessionError.message || '').toLowerCase();
          if (msg.includes('refresh') || msg.includes('invalid jwt') || msg.includes('jwt expired')) {
            try {
              await supabase.auth.signOut();
            } catch (_) {}
          }
        }
        if (session) {
          authScreenUnlockedRef.current = true;
          await hydrateSession(session);
          return;
        }
      }
      authScreenUnlockedRef.current = false;
      setIsNameSet(false);
      setPostAuthPending(false);
      setLoading(false);
    };
    checkSession();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (authFlowInProgressRef.current) return;
        if (session) {
          if (authScreenUnlockedRef.current) {
            await hydrateSession(session);
          }
        } else {
          authScreenUnlockedRef.current = false;
          sessionHydrateBurstRef.current = { uid: null, at: 0 };
          setIsNameSet(false);
          setUserName('');
          setUserRole(null);
          setNeedsOnboarding(false);
          setPostAuthPending(false);
          if (realtimeChannelRef.current) {
            supabase.removeChannel(realtimeChannelRef.current);
            realtimeChannelRef.current = null;
          }
        }
      });
      return () => {
        subscription?.unsubscribe();
        if (realtimeChannelRef.current) supabase.removeChannel(realtimeChannelRef.current);
      };
    }
  }, []);

  useEffect(() => {
    if (!postAuthPending) return undefined;
    /** Filet de sécurité si l’hydratation reste bloquée (ne devrait plus arriver : onEnter a un finally). */
    const t = setTimeout(() => {
      setPostAuthPending(false);
      setLoading(false);
    }, 25000);
    return () => clearTimeout(t);
  }, [postAuthPending]);

  const setupRealtimeSync = (restaurantId) => {
    if (!supabase || realtimeChannelRef.current) return;
    const channel = supabase
      .channel(`tasks:${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        // Realtime: ne relance pas le pipeline complet (planning + rollover + upserts),
        // on rafraîchit seulement les tâches pour garder une UI fluide.
        loadTasks({ mode: 'realtime' });
      })
      .subscribe();
    realtimeChannelRef.current = channel;
  };

  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.filter(t => !t.completed).length;
    const urgent = tasks.filter(t => t.priority === 'haute' && !t.completed).length;
    return { total: tasks.length, completed, pending, urgent };
  }, [tasks]);

  // ─── Rappel fin de journée ────────────────────────────────────────────────────
  useEffect(() => {
    const hour = new Date().getHours();
    const pending = tasks.filter(t => !t.completed).length;
    if (shouldShowEndOfDayReminder(hour, pending, reminderDismissed, loading)) {
      setShowEndOfDayReminder(true);
    }
  }, [tasks, loading, reminderDismissed]);

  const tryPlannedTasksNotification = useMemo(
    () => () => {
      const enabled = readNotificationEnabled();
      if (!enabled || getNotificationPermission() !== 'granted' || loading) return;
      const today = getTodayDate();
      const hour = new Date().getHours();
      if (
        !shouldFireDailyNotification({
          todayYmd: today,
          currentHour: hour,
          reminderHour: readNotificationHour(),
          lastFiredYmd: readLastNotificationDate(),
          enabled: true,
        })
      ) {
        return;
      }
      const payload = buildPlannedTasksNotification(
        tasks,
        today,
        planningConfig?.siteName || DEFAULT_SITE_NAME
      );
      if (!payload) return;
      if (showPlannedTasksNotification(payload)) {
        saveLastNotificationDate(today);
      }
    },
    [tasks, planningConfig, loading]
  );

  useEffect(() => {
    if (!isNameSet || loading) return undefined;
    tryPlannedTasksNotification();
    const intervalId = setInterval(tryPlannedTasksNotification, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [isNameSet, loading, tryPlannedTasksNotification]);

  // ─── Chargement des tâches ────────────────────────────────────────────────────
  const loadTasks = async ({ mode = 'full' } = {}) => {
    const isRealtime = mode === 'realtime';
    if (loadTasksInFlightRef.current) {
      return loadTasksInFlightRef.current;
    }
    loadTasksInFlightRef.current = (async () => {
      if (!isRealtime) setLoading(true);
      try {
        if (isRealtime) {
          const dbTasks = supabase ? await getTasks() : [];
          setTasks([...(dbTasks || [])]);
          setLastUpdate(new Date());
          return;
        }

        const [currentConfig, dbTasks] = await Promise.all([
          supabase ? getPlanningConfig() : Promise.resolve(null),
          supabase ? getTasks() : Promise.resolve([]),
        ]);
        if (!currentConfig) {
          setPlanningConfig(null);
          setTasks([]);
          return;
        }

        let list = dbTasks || [];
        /** Aucune ligne `planning_templates` encore : proposer l’assistant (indépendant du nom du site en base). */
        const isFirstTime = currentConfig.hasPersistedPlanning !== true;
        setPlanningConfig(currentConfig);

        const today = getTodayDate();
        const { tasks: updated, changed, removedTaskIds } = applyAnnexeRollover(list, today);
        if (changed) {
          list = updated;
          await deleteTasks(removedTaskIds);
          if (list.length > 0) {
            list = await saveTasks(list);
          }
        }

        if (!isFirstTime && currentConfig) {
          const existing = new Set(
            list.filter((t) => !t.completed || t.scheduledFor === today).map((t) => t.title)
          );
          const newTasks = buildQuotidienTasksForDate(
            currentConfig,
            today,
            existing,
            userName || 'Système'
          );
          if (newTasks.length > 0) {
            const savedTasks = await saveTasks(newTasks);
            list.push(...savedTasks);
          }

          try {
            const checklistTasks = await materializeChecklistsForDate(
              today,
              userName || 'Système'
            );
            if (checklistTasks.length > 0) {
              list.push(...checklistTasks);
            }
          } catch (checklistErr) {
            console.warn('Checklists non matérialisées:', checklistErr);
          }
        }

        setTasks([...list]);
        setLastUpdate(new Date());
        if (isFirstTime) setShowPlanningSettings(true);
      } catch (e) {
        console.error(e);
        setTasks([]);
        if (!isRealtime) {
          showToast({
            message: 'Impossible de charger les tâches. Vérifiez la connexion et la configuration Supabase.',
            variant: 'error',
          });
        }
      } finally {
        if (!isRealtime) setLoading(false);
        loadTasksInFlightRef.current = null;
      }
    })();
    return loadTasksInFlightRef.current;
  };

  // ─── Actions sur les tâches ───────────────────────────────────────────────────
  const addTask = async () => {
    if (!newTask.title.trim()) return;
    const today = getTodayDate();
    const task = { ...newTask, scheduledFor: newTask.scheduledFor || today, completed: false, createdBy: userName };
    try {
      const savedTask = await saveTask(task);
      setTasks(prev => [...prev, savedTask]);
      setNewTask({ title: '', category: 'cuisine', priority: 'moyenne', taskType: TASK_TYPE_ANNEXE, assignedTo: '', deadline: '', scheduledFor: '' });
      setShowAddTask(false);
      showToast({ message: 'Tâche ajoutée.', variant: 'success' });
    } catch (e) {
      console.error(e);
      showToast({ message: "Erreur lors de l'ajout de la tâche.", variant: 'error' });
    }
  };

  const addWeeklyTasks = async () => {
    const toAddTemplate = planningConfig?.annexes || [];
    if (toAddTemplate.length === 0) {
      showToast({ message: 'Aucune tâche annexe configurée dans le planning.', variant: 'info' });
      return;
    }
    const existing = new Set(tasks.map(t => t.title));
    const toAdd = toAddTemplate.filter(t => t.title && String(t.title).trim() && !existing.has((t.title || '').trim()));
    if (toAdd.length === 0) {
      showToast({ message: 'Toutes les tâches hebdomadaires sont déjà dans la liste.', variant: 'info' });
      return;
    }
    const today = getTodayDate();
    const newTasks = toAdd.map(item => ({
      title: (item.title || '').trim(), category: 'nettoyage', priority: item.priority || 'moyenne',
      taskType: TASK_TYPE_ANNEXE, scheduledFor: today, assignedTo: '', deadline: '', completed: false, createdBy: userName,
    }));
    try {
      const added = await saveTasks(newTasks);
      setTasks(prev => [...prev, ...added]);
      showToast({ message: `${added.length} tâche(s) hebdomadaire(s) ajoutée(s).`, variant: 'success' });
    } catch (e) {
      console.error(e);
      showToast({ message: 'Erreur lors de l\'ajout des tâches hebdomadaires.', variant: 'error' });
    }
  };

  const advanceTaskStatus = async (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const previous = [...tasks];
    const current = task.status || (task.completed ? TASK_STATUS_DONE : 'todo');
    const next = nextStatus(current);
    const norm = normalizeTaskFields({
      ...task,
      status: next,
      proofNote: task.proofNote,
      completedBy: next === TASK_STATUS_DONE ? userName : null,
    });
    const updated = { ...task, ...norm };
    setTasks(previous.map((t) => (t.id === id ? updated : t)));
    try {
      const saved = await saveTask(updated);
      setTasks((prev) => prev.map((t) => (t.id === id ? saved : t)));
    } catch (e) {
      console.error(e);
      setTasks(previous);
      showToast({ message: 'Impossible de mettre à jour la tâche. Réessayez.', variant: 'error' });
    }
  };

  const updateProofNote = async (id, proofNote) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const previous = [...tasks];
    const updated = { ...task, proofNote: proofNote.trim() || null };
    setTasks(previous.map((t) => (t.id === id ? updated : t)));
    try {
      const saved = await saveTask(updated);
      setTasks((prev) => prev.map((t) => (t.id === id ? saved : t)));
    } catch (e) {
      console.error(e);
      setTasks(previous);
    }
  };

  const handleGenerateChecklists = async () => {
    if (generatingChecklists) return;
    setGeneratingChecklists(true);
    try {
      const today = getTodayDate();
      const added = await materializeChecklistsForDate(today, userName || 'Système');
      if (added.length === 0) {
        showToast({
          message: 'Aucune nouvelle étape à générer (déjà créées ou aucun modèle actif).',
          variant: 'info',
        });
      } else {
        setTasks((prev) => [...prev, ...added]);
        showToast({
          message: `${added.length} étape(s) de checklist ajoutée(s).`,
          variant: 'success',
        });
      }
    } catch (e) {
      console.error(e);
      showToast({
        message: 'Impossible de générer les checklists. Vérifiez la migration Supabase (phase 1).',
        variant: 'error',
      });
    } finally {
      setGeneratingChecklists(false);
    }
  };

  const deleteTaskAction = async (id) => {
    const previous = [...tasks];
    setTasks(tasks.filter(t => t.id !== id));
    try {
      await deleteTask(id);
    } catch (e) {
      console.error(e);
      setTasks(previous);
    }
  };

  const clearCompleted = async () => {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return;
    const previous = [...tasks];
    setTasks(tasks.filter(t => !t.completed));
    try {
      await deleteTasks(completedTasks.map((t) => t.id));
    } catch (e) {
      console.error(e);
      setTasks(previous);
      showToast({ message: 'Erreur lors de la suppression des tâches terminées.', variant: 'error' });
    }
  };

  const resetAll = async () => {
    if (!confirm('Voulez-vous vraiment supprimer TOUTES les tâches ?')) return;
    const all = [...tasks];
    setTasks([]);
    try {
      await deleteTasks(all.map((t) => t.id));
    } catch (e) {
      console.error(e);
      setTasks(all);
      showToast({ message: 'Erreur : les tâches n\'ont pas été supprimées.', variant: 'error' });
    }
  };

  const handleSignOut = async () => {
    clearRestaurantCache();
    sessionHydrateBurstRef.current = { uid: null, at: 0 };
    clearLastAuthEmail();
    if (supabase) await supabase.auth.signOut();
    else { localStorage.removeItem(USER_NAME_KEY); setIsNameSet(false); setUserName(''); }
  };

  const handleResetConfig = () => {
    const msg = isSupabaseEmbeddedInBuild()
      ? 'Vous allez être déconnecté. La connexion à la base est gérée par l\'application.'
      : 'Reconfigurer la base de données ? Vous serez déconnecté.';
    if (!confirm(msg)) return;
    if (supabase) supabase.auth.signOut();
    clearRestaurantCache();
    sessionHydrateBurstRef.current = { uid: null, at: 0 };
    clearLastAuthEmail();
    clearSupabaseCredentials();
    if (onResetConfig) onResetConfig();
  };

  const getFilteredTasks = () => {
    let list;
    const todayYmd = getTodayDate();
    const visibleTasks = tasks.filter((t) => !shouldHideStaleNettoyageTask(t, todayYmd));
    switch (filter) {
      case 'active':
        list = visibleTasks.filter((t) => !t.completed && t.status !== TASK_STATUS_DONE);
        break;
      case 'completed':
        list = visibleTasks.filter((t) => t.completed || t.status === TASK_STATUS_DONE);
        break;
      case 'my-tasks':
        list = visibleTasks.filter((t) => t.assignedTo === userName);
        break;
      case TASK_TYPE_QUOTIDIEN:
      case TASK_TYPE_ANNEXE:
      case TASK_TYPE_SEMAINE:
        list = visibleTasks.filter((t) => (t.taskType || TASK_TYPE_ANNEXE) === filter);
        break;
      default:
        list = visibleTasks.filter((t) => {
          const day = taskScheduledDay(t, todayYmd);
          // Sur la vue principale, on garde l'historique non terminé;
          // les tâches terminées des jours passés restent consultables via le calendrier.
          if (day < todayYmd && isTaskDone(t)) return false;
          return true;
        });
    }
    if (postFilter !== 'all') {
      list = list.filter((t) => !t.post || t.post === postFilter || t.post === 'all');
    }
    if (listFilter !== TASK_LIST_ALL) {
      list = list.filter((t) => matchesTaskListFilter(t, listFilter));
    }
    return list;
  };

  // ─── Écrans de garde ──────────────────────────────────────────────────────────
  if (!isNameSet) {
    return (
      <LoginScreen
        onAuthFlowStart={() => {
          authFlowInProgressRef.current = true;
        }}
        onAuthFlowEnd={() => {
          authFlowInProgressRef.current = false;
        }}
        onEnter={async ({ session: loginSession } = {}) => {
          authFlowInProgressRef.current = true;
          setPostAuthPending(true);
          try {
            clearRestaurantCache();
            if (!supabase) {
              throw new Error("Supabase n'est pas configuré.");
            }
            let session = loginSession ?? null;
            if (!session) {
              session = (await supabase.auth.getSession()).data?.session ?? null;
            }
            if (!session) {
              await new Promise((resolve) => {
                setTimeout(resolve, 600);
              });
              session = (await supabase.auth.getSession()).data?.session ?? null;
            }
            if (session) {
              await new Promise((resolve) => {
                setTimeout(resolve, 150);
              });
            }
            if (!session || !hydrateSessionRef.current) {
              throw new Error(
                'Session introuvable après connexion. Réessayez ou videz le stockage du site (page clear-dailydo-storage).'
              );
            }
            await hydrateSessionRef.current(session);
            authScreenUnlockedRef.current = true;
          } catch (e) {
            console.error(e);
            authScreenUnlockedRef.current = false;
            setIsNameSet(false);
            const raw = (e?.message || '').toLowerCase();
            const message = raw.includes('abort') || raw.includes('without a reason')
              ? 'Connexion interrompue (réseau ou navigateur). Réessayez une fois, sans changer d’onglet.'
              : e?.message || 'Impossible de finaliser la connexion.';
            showToast({ message, variant: 'error' });
            throw e;
          } finally {
            authFlowInProgressRef.current = false;
            setPostAuthPending(false);
          }
        }}
      />
    );
  }
  if (postAuthPending) {
    return (
      <div
        id="app-main"
        className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3 p-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <RefreshCw className="w-8 h-8 animate-spin text-amber-400" aria-hidden />
        <p className="text-slate-400 text-sm">Connexion…</p>
      </div>
    );
  }
  if (needsOnboarding) return <Onboarding defaultName={onboardingDefaultName} onComplete={() => { setNeedsOnboarding(false); loadTasks(); }} />;

  const filtered = getFilteredTasks();
  const todayYmd = getTodayDate();
  const statusSortOrder = { in_progress: 0, todo: 1, done: 2 };
  const taskStatusKey = (t) => t.status || (t.completed ? 'done' : 'todo');

  const sortTasks = (list) =>
    [...list].sort((a, b) => {
      const aDone = a.completed || a.status === TASK_STATUS_DONE;
      const bDone = b.completed || b.status === TASK_STATUS_DONE;
      if (aDone !== bDone) return aDone ? 1 : -1;
      if (!aDone && !bDone) {
        const sa = statusSortOrder[taskStatusKey(a)] ?? 1;
        const sb = statusSortOrder[taskStatusKey(b)] ?? 1;
        if (sa !== sb) return sa - sb;
      }
      if (isOverdue(a) !== isOverdue(b)) return isOverdue(a) ? -1 : 1;
      if (isUrgent(a) !== isUrgent(b)) return isUrgent(a) ? -1 : 1;
      const order = { haute: 0, moyenne: 1, basse: 2 };
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
    });

  const sorted = sortTasks(filtered);
  const rawGroups = groupTasksByDay(sorted, todayYmd);
  const taskGroups = {
    ...rawGroups,
    today: sortTasks(rawGroups.today),
    yesterday: sortTasks(rawGroups.yesterday),
    other: sortTasks(rawGroups.other),
  };
  const totalVisible = sorted.length;

  const roleInfo  = ROLE_LABELS[userRole] || ROLE_LABELS.employee;
  const isManager = canManage(userRole);
  const isOwner   = canAdmin(userRole);

  // ─── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <div id="app-main" className="min-h-screen bg-slate-100">
      <div className="max-w-4xl mx-auto p-4 pb-8">

        {/* Rappel fin de journée */}
        {showEndOfDayReminder && stats.pending > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <strong>Rappel fin de journée</strong> : {stats.pending} tâche{stats.pending > 1 ? 's' : ''} non réalisée{stats.pending > 1 ? 's' : ''}.
            </span>
            <button
              type="button"
              onClick={() => { setShowEndOfDayReminder(false); setReminderDismissed(true); }}
              className="shrink-0 rounded-lg bg-amber-200 px-3 py-1.5 text-sm font-medium hover:bg-amber-300"
            >
              J'ai compris
            </button>
          </div>
        )}

        {/* Bandeau sync désactivée */}
        {!isSupabaseConfigured() && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white p-4 text-slate-700">
            <span className="flex items-center gap-2 text-sm">
              <Wifi className="w-4 h-4 text-slate-500 shrink-0" />
              <strong>Liste locale uniquement.</strong> Configurez la base de données pour synchroniser avec votre équipe.
            </span>
            <button
              type="button"
              onClick={handleResetConfig}
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
            >
              Configurer
            </button>
          </div>
        )}

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500 text-white">
                <ChefHat className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-800">DailyDo</h1>
                <p className="text-slate-500 text-sm">Tableau partagé · {planningConfig?.siteName || DEFAULT_SITE_NAME}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {isSupabaseConfigured() && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                  <Wifi className="w-3.5 h-3.5" /> Sync active
                </span>
              )}

              {/* Badge rôle */}
              {userRole && (
                <span className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              )}

              <span className="text-slate-500 text-sm hidden sm:inline">{displayName(userName)}</span>

              <button
                type="button"
                onClick={() => loadTasks()}
                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                title="Actualiser"
                aria-label="Actualiser la liste des tâches"
              >
                <RefreshCw className="w-5 h-5" aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => setShowYearCalendar(true)}
                className="p-2 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100"
                title="Calendrier annuel"
                aria-label="Ouvrir le calendrier de planification"
              >
                <Calendar className="w-5 h-5" aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => setShowNotificationSettings(true)}
                className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                title="Notifications des tâches planifiées"
                aria-label="Paramètres des notifications"
              >
                <Bell className="w-5 h-5" aria-hidden />
              </button>

              {/* Équipe (manager+) */}
              {isManager && (
                <button
                  type="button"
                  onClick={() => setShowTeam(true)}
                  className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                  title="Mon équipe"
                  aria-label="Ouvrir la gestion d'équipe"
                >
                  <Users className="w-5 h-5" aria-hidden />
                </button>
              )}

              {/* Planning (owner seulement) */}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setShowPlanningSettings(true)}
                  className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100"
                  title="Planning"
                  aria-label="Ouvrir les paramètres du planning"
                >
                  <Edit className="w-5 h-5" aria-hidden />
                </button>
              )}

              {isManager && (
                <button
                  type="button"
                  onClick={() => setShowChecklistSettings(true)}
                  className="p-2 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100"
                  title="Modèles de checklist"
                  aria-label="Ouvrir les modèles de checklist"
                >
                  <ClipboardList className="w-5 h-5" aria-hidden />
                </button>
              )}

              {/* Reset (owner seulement) */}
              {isOwner && (
                <button type="button" onClick={resetAll} className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                  Réinitialiser
                </button>
              )}

              {/* Déconnexion */}
              <button
                type="button"
                onClick={handleSignOut}
                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                title="Déconnexion"
                aria-label="Se déconnecter"
              >
                <LogOut className="w-5 h-5" aria-hidden />
              </button>

              {/* Reconfigurer DB (owner seulement) */}
              {isOwner && (
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                  title="Reconfigurer la base de données"
                  aria-label="Reconfigurer la base de données"
                >
                  <Database className="w-4 h-4" aria-hidden />
                </button>
              )}
            </div>
          </div>

          {lastUpdate && (
            <p className="text-xs text-slate-400 mt-3">Mis à jour à {lastUpdate.toLocaleTimeString('fr-FR')}</p>
          )}
          <div className="mt-4">
            <StatsBar stats={stats} />
          </div>
        </header>

        {/* Modales */}
        <PlanningSettings
          isOpen={showPlanningSettings}
          onClose={() => setShowPlanningSettings(false)}
          onSave={(newConf) => {
            setPlanningConfig(newConf);
            loadTasks();
          }}
        />

        <TeamModal
          isOpen={showTeam}
          onClose={() => setShowTeam(false)}
          onJoined={() => { setShowTeam(false); loadTasks(); }}
        />

        <YearCalendarPlanner
          isOpen={showYearCalendar}
          onClose={() => setShowYearCalendar(false)}
          planningConfig={planningConfig}
          userName={userName}
          isManager={isManager}
          onTasksChanged={() => loadTasks()}
        />

        <NotificationSettings
          isOpen={showNotificationSettings}
          onClose={() => setShowNotificationSettings(false)}
          onPrefsChange={tryPlannedTasksNotification}
        />

        <ChecklistSettings
          isOpen={showChecklistSettings}
          onClose={() => setShowChecklistSettings(false)}
          onSaved={() => loadTasks()}
        />

        <div className="space-y-4">
          <OpsProgressCard
            tasks={tasks}
            todayYmd={getTodayDate()}
            isManager={isManager}
            onGenerateChecklists={isManager ? handleGenerateChecklists : null}
            generating={generatingChecklists}
          />

          <PlanningCard
            onAddWeeklyTasks={isManager ? addWeeklyTasks : null}
            planningConfig={planningConfig}
            siteName={planningConfig?.siteName || DEFAULT_SITE_NAME}
          />

          {/* ── Formulaire ajout tâche (manager+) ────────────────────────── */}
          {isManager ? (
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAddTask(!showAddTask)}
                className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-slate-50 transition-colors text-left"
                aria-expanded={showAddTask}
                aria-controls="new-task-panel"
              >
                <span className="flex items-center gap-2 font-semibold text-slate-800">
                  <Plus className="w-5 h-5 text-amber-500" />
                  Nouvelle tâche
                </span>
                <span className="text-slate-400 text-sm">{showAddTask ? '▲' : '▼'}</span>
              </button>

              {showAddTask && (
                <div id="new-task-panel" className="border-t border-slate-100 p-4 md:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Titre */}
                    <input
                      type="text"
                      placeholder="Titre de la tâche..."
                      value={newTask.title}
                      onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addTask()}
                      className="col-span-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      autoFocus
                    />

                    {/* Sélecteur type de tâche */}
                    <TaskTypeSelector
                      value={newTask.taskType}
                      onChange={v => setNewTask(t => ({ ...t, taskType: v }))}
                    />

                    {/* Priorité */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-600">Priorité</label>
                      <select
                        value={newTask.priority}
                        onChange={e => setNewTask(t => ({ ...t, priority: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800"
                      >
                        <option value="basse">🟢 Basse</option>
                        <option value="moyenne">🟡 Moyenne</option>
                        <option value="haute">🔴 Haute</option>
                      </select>
                    </div>

                    {/* Assigné à */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-600">Assigné à (optionnel)</label>
                      <input
                        type="text"
                        placeholder="Nom du manager..."
                        value={newTask.assignedTo}
                        onChange={e => setNewTask(t => ({ ...t, assignedTo: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400"
                      />
                    </div>

                    {/* Deadline */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-600">Deadline (optionnel)</label>
                      <input
                        type="datetime-local"
                        value={newTask.deadline}
                        onChange={e => setNewTask(t => ({ ...t, deadline: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800"
                      />
                    </div>

                    {/* Boutons */}
                    <div className="col-span-full flex gap-2">
                      <button
                        type="button"
                        onClick={addTask}
                        disabled={!newTask.title.trim()}
                        className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        <Plus className="w-5 h-5" aria-hidden /> Ajouter la tâche
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddTask(false)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : (
            /* Bandeau info employé */
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
              <User className="w-5 h-5 shrink-0" />
              <span>
                En tant qu&apos;employé, avancez chaque tâche : à faire → en cours → terminée.
                Contactez votre manager pour ajouter des tâches.
              </span>
            </div>
          )}

          {/* ── Vue checklist / nettoyage ─────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600 mr-1">Vue :</span>
            {TASK_LIST_FILTER_OPTIONS.map(({ id, label }) => {
              const isActive = listFilter === id;
              const activeClass =
                id === 'checklist' ? 'bg-violet-600 text-white' :
                id === 'nettoyage' ? 'bg-emerald-600 text-white' :
                'bg-slate-700 text-white';
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => setListFilter(id)}
                  aria-pressed={isActive}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? activeClass : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* ── Filtres ───────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600 mr-1">Filtrer :</span>
            {FILTER_OPTIONS.map(({ id, label, color }) => {
              const isActive = filter === id;
              const activeClass =
                color === 'red'    ? 'bg-red-500 text-white' :
                color === 'orange' ? 'bg-orange-500 text-white' :
                color === 'green'  ? 'bg-green-500 text-white' :
                                     'bg-slate-700 text-white';
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => setFilter(id)}
                  aria-pressed={isActive}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? activeClass : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
            {isManager && (
              <select
                value={postFilter}
                onChange={(e) => setPostFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-600"
                aria-label="Filtrer par poste"
              >
                {OPS_POSTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
            {isManager && stats.completed > 0 && (
              <button type="button" onClick={clearCompleted} className="ml-auto px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                Effacer terminées
              </button>
            )}
          </div>

          {/* ── Liste des tâches ──────────────────────────────────────────── */}
          {loading ? (
            <div
              className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" aria-hidden />
              Chargement des tâches…
            </div>
          ) : totalVisible === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              {listFilter === 'checklist'
                ? 'Aucune tâche checklist pour ce filtre'
                : listFilter === 'nettoyage'
                  ? 'Aucune tâche de nettoyage planifiée pour ce filtre'
                  : filter === 'all'
                    ? '🎉 Aucune tâche pour aujourd\'hui'
                    : 'Aucune tâche dans ce filtre'}
            </div>
          ) : (
            <TaskListByDay
              groups={taskGroups}
              advanceTaskStatus={advanceTaskStatus}
              onProofNoteChange={updateProofNote}
              deleteTask={deleteTaskAction}
              canDelete={isManager}
            />
          )}
        </div>
      </div>
    </div>
  );
}
