import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, CheckCircle2, Users, ChefHat, AlertCircle,
  RefreshCw, Wifi, Edit, User, LogOut, Database
} from 'lucide-react';
import { JOURS } from './config/planning';
import {
  USER_NAME_KEY,
  DEFAULT_SITE_NAME,
  FILTER_OPTIONS,
  TASK_TYPE_QUOTIDIEN,
  TASK_TYPE_ANNEXE,
  TASK_TYPE_SEMAINE,
} from './config/constants';
import { applyAnnexeRollover } from './lib/taskRollover';
import { shouldShowEndOfDayReminder } from './lib/reminder';
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
  getPlanningConfig,
  savePlanningConfig,
  clearRestaurantCache,
} from './lib/db';
import LoginScreen from './components/LoginScreen';
import Onboarding from './components/Onboarding';
import PlanningSettings from './components/PlanningSettings';
import TeamModal from './components/TeamModal';
import StatsBar from './components/StatsBar';
import PlanningCard from './components/PlanningCard';
import TaskItem from './components/TaskItem';
import { isUrgent, isOverdue, displayName } from './lib/taskUtils';

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Rôles et permissions ──────────────────────────────────────────────────────
const ROLE_LABELS = {
  owner:    { label: '👑 Gérant',  color: 'bg-amber-100 text-amber-800 border-amber-300' },
  manager:  { label: '🔑 Manager', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  employee: { label: '👤 Employé', color: 'bg-slate-100 text-slate-700 border-slate-300' },
};

function canManage(role) { return role === 'owner' || role === 'manager'; }
function canAdmin(role)  { return role === 'owner'; }

// ─── Sélecteur visuel de type de tâche ────────────────────────────────────────
function TaskTypeSelector({ value, onChange }) {
  const types = [
    {
      id: TASK_TYPE_QUOTIDIEN,
      icon: '🔴', label: 'Quotidien', desc: 'Obligatoire du jour',
      active: 'bg-red-500 text-white border-red-500',
      inactive: 'bg-white text-slate-600 border-slate-200 hover:border-red-300',
    },
    {
      id: TASK_TYPE_ANNEXE,
      icon: '🟠', label: 'Annexe', desc: 'Reportée si non faite',
      active: 'bg-orange-500 text-white border-orange-500',
      inactive: 'bg-white text-slate-600 border-slate-200 hover:border-orange-300',
    },
    {
      id: TASK_TYPE_SEMAINE,
      icon: '🟢', label: 'Semaine', desc: 'À faire cette semaine',
      active: 'bg-green-500 text-white border-green-500',
      inactive: 'bg-white text-slate-600 border-slate-200 hover:border-green-300',
    },
  ];

  return (
    <div className="col-span-full">
      <label className="block text-sm font-medium text-slate-600 mb-2">Type de tâche</label>
      <div className="grid grid-cols-3 gap-2">
        {types.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all text-center ${value === t.id ? t.active : t.inactive}`}
          >
            <span className="text-xl">{t.icon}</span>
            <span className="text-xs font-semibold leading-tight">{t.label}</span>
            <span className={`text-xs leading-tight ${value === t.id ? 'text-white/80' : 'text-slate-400'}`}>{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard principal ───────────────────────────────────────────────────────
export default function Dashboard({ onResetConfig }) {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '', category: 'cuisine', priority: 'moyenne',
    taskType: TASK_TYPE_ANNEXE, assignedTo: '', deadline: '', scheduledFor: '',
  });
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [showEndOfDayReminder, setShowEndOfDayReminder] = useState(false);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, urgent: 0 });
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
  const realtimeChannelRef = useRef(null);
  /** Évite double getUserRestaurant + loadTasks quand getSession() et onAuthStateChange arrivent à la suite (latence reconnexion). */
  const sessionHydrateBurstRef = useRef({ uid: null, at: 0 });
  const loadTasksInFlightRef = useRef(null);

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
        setUserName(session.user.email);
        const metaName = session.user.user_metadata?.restaurant_name || '';
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

    const checkSession = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await hydrateSession(session);
          return;
        }
      }
      setIsNameSet(false);
      setPostAuthPending(false);
      setLoading(false);
    };
    checkSession();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          await hydrateSession(session);
        } else {
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
    const t = setTimeout(() => setPostAuthPending(false), 15000);
    return () => clearTimeout(t);
  }, [postAuthPending]);

  const setupRealtimeSync = (restaurantId) => {
    if (!supabase || realtimeChannelRef.current) return;
    const channel = supabase
      .channel(`tasks:${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        loadTasks();
      })
      .subscribe();
    realtimeChannelRef.current = channel;
  };

  // ─── Stats ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const completed = tasks.filter(t => t.completed).length;
    const pending   = tasks.filter(t => !t.completed).length;
    const urgent    = tasks.filter(t => t.priority === 'haute' && !t.completed).length;
    setStats({ total: tasks.length, completed, pending, urgent });
  }, [tasks]);

  // ─── Rappel fin de journée ────────────────────────────────────────────────────
  useEffect(() => {
    const hour = new Date().getHours();
    const pending = tasks.filter(t => !t.completed).length;
    if (shouldShowEndOfDayReminder(hour, pending, reminderDismissed, loading)) {
      setShowEndOfDayReminder(true);
    }
  }, [tasks, loading, reminderDismissed]);

  // ─── Chargement des tâches ────────────────────────────────────────────────────
  const loadTasks = async () => {
    if (loadTasksInFlightRef.current) {
      return loadTasksInFlightRef.current;
    }
    loadTasksInFlightRef.current = (async () => {
      setLoading(true);
      try {
        const [currentConfig, dbTasks] = await Promise.all([
          supabase ? getPlanningConfig() : Promise.resolve(null),
          supabase ? getTasks() : Promise.resolve([]),
        ]);
        if (!currentConfig) { setTasks([]); return; }

        let list = dbTasks || [];
        const isFirstTime = (!currentConfig.siteName && currentConfig.planning.lundi.length === 0);
        setPlanningConfig(currentConfig);

        const today = getTodayDate();
        const { tasks: updated, changed, removedTaskIds } = applyAnnexeRollover(list, today);
        if (changed) {
          list = updated;
          await Promise.all(removedTaskIds.map((id) => deleteTask(id)));
          await Promise.all(list.map(t => saveTask(t)));
        }

        if (!isFirstTime && currentConfig) {
          const jour = JOURS[new Date().getDay()];
          const tasksDuJour = (currentConfig.planning?.[jour] || []).filter(t => t.title && String(t.title).trim());
          if (tasksDuJour.length > 0) {
            const existing = new Set(list.filter(t => !t.completed || t.scheduledFor === today).map(t => t.title));
            const toAdd = tasksDuJour.filter(t => !existing.has(t.title.trim()));
            if (toAdd.length > 0) {
              const newTasks = toAdd.map(item => ({
                title: (item.title || '').trim(), category: 'nettoyage',
                priority: item.priority || 'moyenne', taskType: TASK_TYPE_QUOTIDIEN,
                scheduledFor: today, assignedTo: '', deadline: '', completed: false,
                createdBy: userName || 'Système',
              }));
              const savedTasks = await saveTasks(newTasks);
              list.push(...savedTasks);
            }
          }
        }

        setTasks([...list]);
        setLastUpdate(new Date());
        if (isFirstTime) setShowPlanningSettings(true);
      } catch (e) {
        console.error(e);
        setTasks([]);
      } finally {
        setLoading(false);
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
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'ajout.");
    }
  };

  const addWeeklyTasks = async () => {
    const toAddTemplate = planningConfig?.annexes || [];
    if (toAddTemplate.length === 0) { alert("Aucune tâche annexe configurée."); return; }
    const existing = new Set(tasks.map(t => t.title));
    const toAdd = toAddTemplate.filter(t => t.title && String(t.title).trim() && !existing.has((t.title || '').trim()));
    if (toAdd.length === 0) { alert('Toutes les tâches hebdomadaires sont déjà dans la liste.'); return; }
    const today = getTodayDate();
    const newTasks = toAdd.map(item => ({
      title: (item.title || '').trim(), category: 'nettoyage', priority: item.priority || 'moyenne',
      taskType: TASK_TYPE_ANNEXE, scheduledFor: today, assignedTo: '', deadline: '', completed: false, createdBy: userName,
    }));
    try {
      const added = await saveTasks(newTasks);
      setTasks(prev => [...prev, ...added]);
    } catch (e) { console.error(e); }
  };

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const toggled = {
      ...task, completed: !task.completed,
      completedAt: !task.completed ? new Date().toISOString() : null,
      completedBy: !task.completed ? userName : null,
    };
    setTasks(tasks.map(t => t.id === id ? toggled : t));
    try {
      await saveTask(toggled);
    } catch (e) {
      console.error(e);
      setTasks(tasks); // rollback
    }
  };

  const deleteTaskAction = async (id) => {
    setTasks(tasks.filter(t => t.id !== id));
    try {
      await deleteTask(id);
    } catch (e) {
      console.error(e);
      setTasks(tasks);
    }
  };

  const clearCompleted = async () => {
    const completedTasks = tasks.filter(t => t.completed);
    setTasks(tasks.filter(t => !t.completed));
    await Promise.all(completedTasks.map(t => deleteTask(t.id)));
  };

  const resetAll = async () => {
    if (!confirm('Voulez-vous vraiment supprimer TOUTES les tâches ?')) return;
    const all = [...tasks];
    setTasks([]);
    await Promise.all(all.map(t => deleteTask(t.id)));
  };

  const handleSignOut = async () => {
    clearRestaurantCache();
    sessionHydrateBurstRef.current = { uid: null, at: 0 };
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
    clearSupabaseCredentials();
    if (onResetConfig) onResetConfig();
  };

  const getFilteredTasks = () => {
    switch (filter) {
      case 'active':    return tasks.filter(t => !t.completed);
      case 'completed': return tasks.filter(t => t.completed);
      case 'my-tasks':  return tasks.filter(t => t.assignedTo === userName);
      case TASK_TYPE_QUOTIDIEN:
      case TASK_TYPE_ANNEXE:
      case TASK_TYPE_SEMAINE: return tasks.filter(t => (t.taskType || TASK_TYPE_ANNEXE) === filter);
      default: return tasks;
    }
  };

  // ─── Écrans de garde ──────────────────────────────────────────────────────────
  if (!isNameSet) {
    return (
      <LoginScreen
        onEnter={() => {
          setIsNameSet(true);
          setPostAuthPending(true);
        }}
      />
    );
  }
  if (postAuthPending) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3 p-4">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-400" aria-hidden />
        <p className="text-slate-400 text-sm">Connexion…</p>
      </div>
    );
  }
  if (needsOnboarding) return <Onboarding defaultName={onboardingDefaultName} onComplete={() => { setNeedsOnboarding(false); loadTasks(); }} />;

  const filtered = getFilteredTasks();
  const sorted = [...filtered].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (isOverdue(a) !== isOverdue(b)) return isOverdue(a) ? -1 : 1;
    if (isUrgent(a) !== isUrgent(b)) return isUrgent(a) ? -1 : 1;
    const order = { haute: 0, moyenne: 1, basse: 2 };
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
  });

  const roleInfo  = ROLE_LABELS[userRole] || ROLE_LABELS.employee;
  const isManager = canManage(userRole);
  const isOwner   = canAdmin(userRole);

  // ─── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-4xl mx-auto p-4 pb-8">

        {/* Rappel fin de journée */}
        {showEndOfDayReminder && stats.pending > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <strong>Rappel fin de journée</strong> : {stats.pending} tâche{stats.pending > 1 ? 's' : ''} non réalisée{stats.pending > 1 ? 's' : ''}.
            </span>
            <button
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
            <button onClick={handleResetConfig} className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600">
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

              <button onClick={loadTasks} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200" title="Actualiser">
                <RefreshCw className="w-5 h-5" />
              </button>

              {/* Équipe (manager+) */}
              {isManager && (
                <button onClick={() => setShowTeam(true)} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="Mon équipe">
                  <Users className="w-5 h-5" />
                </button>
              )}

              {/* Planning (owner seulement) */}
              {isOwner && (
                <button onClick={() => setShowPlanningSettings(true)} className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100" title="Planning">
                  <Edit className="w-5 h-5" />
                </button>
              )}

              {/* Reset (owner seulement) */}
              {isOwner && (
                <button onClick={resetAll} className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                  Réinitialiser
                </button>
              )}

              {/* Déconnexion */}
              <button onClick={handleSignOut} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200" title="Déconnexion">
                <LogOut className="w-5 h-5" />
              </button>

              {/* Reconfigurer DB (owner seulement) */}
              {isOwner && (
                <button onClick={handleResetConfig} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200" title="Reconfigurer la base de données">
                  <Database className="w-4 h-4" />
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
          onSave={async (newConf) => {
            await savePlanningConfig(newConf);
            setPlanningConfig(newConf);
            loadTasks();
          }}
        />

        <TeamModal
          isOpen={showTeam}
          onClose={() => setShowTeam(false)}
          onJoined={() => { setShowTeam(false); loadTasks(); }}
        />

        <div className="space-y-4">
          <PlanningCard
            onAddWeeklyTasks={isManager ? addWeeklyTasks : null}
            planningConfig={planningConfig}
            siteName={planningConfig?.siteName || DEFAULT_SITE_NAME}
          />

          {/* ── Formulaire ajout tâche (manager+) ────────────────────────── */}
          {isManager ? (
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={() => setShowAddTask(!showAddTask)}
                className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-slate-50 transition-colors text-left"
              >
                <span className="flex items-center gap-2 font-semibold text-slate-800">
                  <Plus className="w-5 h-5 text-amber-500" />
                  Nouvelle tâche
                </span>
                <span className="text-slate-400 text-sm">{showAddTask ? '▲' : '▼'}</span>
              </button>

              {showAddTask && (
                <div className="border-t border-slate-100 p-4 md:p-5">
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
                        onClick={addTask}
                        disabled={!newTask.title.trim()}
                        className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        <Plus className="w-5 h-5" /> Ajouter la tâche
                      </button>
                      <button
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
              <span>En tant qu'employé, vous pouvez cocher les tâches terminées. Contactez votre manager pour ajouter des tâches.</span>
            </div>
          )}

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
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? activeClass : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
            {isManager && stats.completed > 0 && (
              <button onClick={clearCompleted} className="ml-auto px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                Effacer terminées
              </button>
            )}
          </div>

          {/* ── Liste des tâches ──────────────────────────────────────────── */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
              Chargement...
            </div>
          ) : sorted.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              {filter === 'all' ? '🎉 Aucune tâche pour aujourd\'hui' : 'Aucune tâche dans ce filtre'}
            </div>
          ) : (
            <ul className="space-y-3">
              {sorted.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  toggleTask={toggleTask}
                  deleteTask={deleteTaskAction}
                  canDelete={isManager}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
