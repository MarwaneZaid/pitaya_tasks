import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Clock, Users, ChefHat, AlertCircle, RefreshCw, Settings, Wifi, Edit } from 'lucide-react';
import { JOURS } from './config/planning';
import {
  STORAGE_KEY,
  PLANNING_KEY,
  USER_NAME_KEY,
  DEFAULT_SITE_NAME,
  CATEGORY_COLORS,
  PRIORITY_COLORS,
  FILTER_OPTIONS,
  TASK_TYPE_QUOTIDIEN,
  TASK_TYPE_ANNEXE,
  TASK_TYPE_SEMAINE,
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
} from './config/constants';
import { applyAnnexeRollover } from './lib/taskRollover';
import { shouldShowEndOfDayReminder } from './lib/reminder';
import { getStoredSupabaseConfig, isSupabaseConfigured, initSupabaseStorage } from './lib/storage-supabase';
import LoginScreen from './components/LoginScreen';
import SettingsModal from './components/SettingsModal';
import PlanningSettings from './components/PlanningSettings';
import StatsBar from './components/StatsBar';
import PlanningCard from './components/PlanningCard';
import TaskItem from './components/TaskItem';
import { isUrgent, isOverdue, displayName } from './lib/taskUtils';



function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    category: 'cuisine',
    priority: 'moyenne',
    taskType: TASK_TYPE_ANNEXE,
    assignedTo: '',
    deadline: '',
    scheduledFor: '',
  });
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [showEndOfDayReminder, setShowEndOfDayReminder] = useState(false);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, urgent: 0 });
  const [userName, setUserName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlanningSettings, setShowPlanningSettings] = useState(false);
  const [planningConfig, setPlanningConfig] = useState(null);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(USER_NAME_KEY);
    if (saved) {
      setUserName(saved);
      setIsNameSet(true);
    }
    loadTasks();
  }, []);

  useEffect(() => {
    const completed = tasks.filter((t) => t.completed).length;
    const pending = tasks.filter((t) => !t.completed).length;
    const urgent = tasks.filter((t) => t.priority === 'haute' && !t.completed).length;
    setStats({ total: tasks.length, completed, pending, urgent });
  }, [tasks]);

  // Rappel fin de journée : après 18h, alerte si tâches non réalisées
  useEffect(() => {
    const hour = new Date().getHours();
    const pending = tasks.filter((t) => !t.completed).length;
    if (shouldShowEndOfDayReminder(hour, pending, reminderDismissed, loading)) {
      setShowEndOfDayReminder(true);
    }
  }, [tasks, loading, reminderDismissed]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const result = await window.storage.get(STORAGE_KEY, true);
      const confResult = await window.storage.get(PLANNING_KEY, true);
      
      let list = [];
      if (result?.value) list = JSON.parse(result.value);
      
      let currentConfig = null;
      let isFirstTime = false;
      if (confResult?.value) {
        currentConfig = JSON.parse(confResult.value);
      } else {
        currentConfig = {
          siteName: '',
          planning: {
            lundi: [], mardi: [], mercredi: [], jeudi: [], vendredi: [], samedi: [], dimanche: []
          },
          annexes: []
        };
        await window.storage.set(PLANNING_KEY, JSON.stringify(currentConfig), true);
        isFirstTime = true;
      }
      setPlanningConfig(currentConfig);
      
      let changedTasks = false;
      const today = getTodayDate();
      const { tasks: updated, changed } = applyAnnexeRollover(list, today);
      if (changed) {
        list = updated;
        changedTasks = true;
      }

      if (!isFirstTime && currentConfig) {
        const jour = JOURS[new Date().getDay()];
        const tasksDuJour = currentConfig.planning?.[jour] || [];
        if (tasksDuJour.length > 0) {
          const existing = new Set(list.filter(t => !t.completed || t.scheduledFor === today).map((t) => t.title));
          const toAdd = tasksDuJour.filter((t) => !existing.has(t.title));
          
          if (toAdd.length > 0) {
            const now = Date.now();
            const newTasks = toAdd.map((item, i) => ({
              id: now + i,
              title: item.title,
              category: 'nettoyage',
              priority: item.priority || 'moyenne',
              taskType: TASK_TYPE_QUOTIDIEN,
              scheduledFor: today,
              assignedTo: '',
              deadline: '',
              completed: false,
              createdAt: new Date().toISOString(),
              createdBy: userName || 'Système',
              completedAt: null,
              completedBy: null,
            }));
            list = [...list, ...newTasks];
            changedTasks = true;
          }
        }
      }

      if (changedTasks) {
        await window.storage.set(STORAGE_KEY, JSON.stringify(list), true);
      }
      
      setTasks(list);
      setLastUpdate(new Date());

      if (isFirstTime) {
        setShowPlanningSettings(true);
      }
    } catch {
      setTasks([]);
    }
    setLoading(false);
  };

  const saveTasks = async (updated) => {
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(updated), true);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la sauvegarde.');
    }
  };

  const addTask = () => {
    if (!newTask.title.trim()) return;
    const today = getTodayDate();
    const task = {
      id: Date.now(),
      ...newTask,
      scheduledFor: newTask.scheduledFor || today,
      completed: false,
      createdAt: new Date().toISOString(),
      createdBy: userName,
      completedAt: null,
      completedBy: null,
    };
    const updated = [...tasks, task];
    setTasks(updated);
    saveTasks(updated);
    setNewTask({
      title: '',
      category: 'cuisine',
      priority: 'moyenne',
      taskType: TASK_TYPE_ANNEXE,
      assignedTo: '',
      deadline: '',
      scheduledFor: '',
    });
  };

  const addIndispensableTasksForToday = async () => {
    const jour = JOURS[new Date().getDay()];
    const tasksDuJour = planningConfig?.planning?.[jour] || [];
    if (tasksDuJour.length === 0) {
      alert(`Aucune tâche prévue pour aujourd'hui (${jour}). Vérifiez la configuration du planning.`);
      return;
    }
    const existing = new Set(tasks.map((t) => t.title));
    const toAdd = tasksDuJour.filter((t) => !existing.has(t.title));
    if (toAdd.length === 0) {
      alert('Les tâches du jour sont déjà dans la liste.');
      return;
    }
    const now = Date.now();
    const today = getTodayDate();
    const newTasks = toAdd.map((item, i) => ({
      id: now + i,
      title: item.title,
      category: 'nettoyage',
      priority: item.priority || 'moyenne',
      taskType: TASK_TYPE_QUOTIDIEN,
      scheduledFor: today,
      assignedTo: '',
      deadline: '',
      completed: false,
      createdAt: new Date().toISOString(),
      createdBy: userName,
      completedAt: null,
      completedBy: null,
    }));
    const updated = [...tasks, ...newTasks];
    setTasks(updated);
    await saveTasks(updated);
  };

  const addWeeklyTasks = async () => {
    const toAddTemplate = planningConfig?.annexes || [];
    if (toAddTemplate.length === 0) {
      alert("Aucune tâche annexe n'est configurée pour ce restaurant.");
      return;
    }
    const existing = new Set(tasks.map((t) => t.title));
    const toAdd = toAddTemplate.filter((t) => !existing.has(t.title));
    if (toAdd.length === 0) {
      alert('Toutes les tâches hebdomadaires sont déjà dans la liste.');
      return;
    }
    const now = Date.now();
    const today = getTodayDate();
    const newTasks = toAdd.map((item, i) => ({
      id: now + i,
      title: item.title,
      category: 'nettoyage',
      priority: item.priority || 'moyenne',
      taskType: TASK_TYPE_ANNEXE,
      scheduledFor: today,
      assignedTo: '',
      deadline: '',
      completed: false,
      createdAt: new Date().toISOString(),
      createdBy: userName,
      completedAt: null,
      completedBy: null,
    }));
    const updated = [...tasks, ...newTasks];
    setTasks(updated);
    await saveTasks(updated);
  };

  const toggleTask = (id) => {
    const updated = tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            completed: !t.completed,
            completedAt: !t.completed ? new Date().toISOString() : null,
            completedBy: !t.completed ? userName : null,
          }
        : t
    );
    setTasks(updated);
    saveTasks(updated);
  };

  const deleteTask = (id) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    saveTasks(updated);
  };

  const clearCompleted = () => {
    const updated = tasks.filter((t) => !t.completed);
    setTasks(updated);
    saveTasks(updated);
  };

  const resetAll = () => {
    if (!confirm('Supprimer toutes les tâches pour tous les managers ?')) return;
    setTasks([]);
    window.storage.delete(STORAGE_KEY, true);
    setLastUpdate(new Date());
  };

  const getFilteredTasks = () => {
    switch (filter) {
      case 'active': return tasks.filter((t) => !t.completed);
      case 'completed': return tasks.filter((t) => t.completed);
      case 'my-tasks': return tasks.filter((t) => t.assignedTo === userName);
      case 'quotidien':
      case 'annexe':
      case 'semaine': return tasks.filter((t) => (t.taskType || TASK_TYPE_ANNEXE) === filter);
      default: return tasks;
    }
  };

  const openSettings = () => {
    const c = getStoredSupabaseConfig();
    setSupabaseUrl(c.url);
    setSupabaseKey(c.anonKey);
    setShowSettings(true);
  };

  if (!isNameSet) {
    return (
      <LoginScreen
        userName={userName}
        setUserName={setUserName}
        onEnter={() => {
          setUserName(localStorage.getItem(USER_NAME_KEY) || '');
          setIsNameSet(true);
        }}
      />
    );
  }

  const filtered = getFilteredTasks();
  const sorted = [...filtered].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (isOverdue(a) !== isOverdue(b)) return isOverdue(a) ? -1 : 1;
    if (isUrgent(a) !== isUrgent(b)) return isUrgent(a) ? -1 : 1;
    const order = { haute: 0, moyenne: 1, basse: 2 };
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
  });

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

        {/* Bandeau sync désactivée : explique pourquoi les tâches ne sont pas les mêmes entre appareils */}
        {!isSupabaseConfigured() && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-100 p-4 text-slate-700">
            <span className="flex items-center gap-2 text-sm">
              <Wifi className="w-4 h-4 text-slate-500 shrink-0" />
              <strong>Liste locale uniquement.</strong> Les tâches ne sont pas synchronisées avec les autres (téléphones, autres noms). Pour voir la même liste partout, configurez la synchronisation dans les Réglages (icône engrenage).
            </span>
            <button
              onClick={openSettings}
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
            >
              Configurer la sync
            </button>
          </div>
        )}

        {/* Header */}
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500 text-white">
                <ChefHat className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-800">DailyDo</h1>
                <p className="text-slate-500 text-sm">Tableau partagé · {planningConfig?.siteName || DEFAULT_SITE_NAME}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSupabaseConfigured() && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                  <Wifi className="w-3.5 h-3.5" /> Sync équipe
                </span>
              )}
              <span className="text-slate-500 text-sm hidden sm:inline">{displayName(userName)}</span>
              <button
                onClick={loadTasks}
                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                title="Actualiser"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button onClick={() => setShowPlanningSettings(true)} className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100" title="Configurer le planning et le site">
                <Edit className="w-5 h-5" />
              </button>
              <button onClick={openSettings} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200" title="Synchronisation">
                <Settings className="w-5 h-5" />
              </button>
              <button onClick={resetAll} className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                Réinitialiser
              </button>
            </div>
          </div>
          {lastUpdate && (
            <p className="text-xs text-slate-400 mt-3">Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}</p>
          )}
          <div className="mt-4">
            <StatsBar stats={stats} />
          </div>
        </header>

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          supabaseUrl={supabaseUrl}
          setSupabaseUrl={setSupabaseUrl}
          supabaseKey={supabaseKey}
          setSupabaseKey={setSupabaseKey}
        />

        <PlanningSettings
          isOpen={showPlanningSettings}
          onClose={() => setShowPlanningSettings(false)}
          onSave={(newConf) => {
            setPlanningConfig(newConf);
            loadTasks();
          }}
        />

        <div className="space-y-4">
          <PlanningCard
            onAddWeeklyTasks={addWeeklyTasks}
            planningConfig={planningConfig}
            siteName={planningConfig?.siteName || DEFAULT_SITE_NAME}
          />

          {/* Add task */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Nouvelle tâche</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Titre..."
                value={newTask.title}
                onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                className="col-span-full md:col-span-2 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask((t) => ({ ...t, priority: e.target.value }))}
                className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800"
              >
                <option value="basse">Basse</option>
                <option value="moyenne">Moyenne</option>
                <option value="haute">Haute</option>
              </select>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-600">Type de tâche</label>
                <select
                  value={newTask.taskType}
                  onChange={(e) => setNewTask((t) => ({ ...t, taskType: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800"
                  title="Rouge = quotidien, Orange = annexe, Vert = semaine"
                >
                  <option value={TASK_TYPE_QUOTIDIEN}>🔴 Quotidien obligatoire</option>
                  <option value={TASK_TYPE_ANNEXE}>🟠 Annexe</option>
                  <option value={TASK_TYPE_SEMAINE}>🟢 À faire dans la semaine</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Assigné à..."
                value={newTask.assignedTo}
                onChange={(e) => setNewTask((t) => ({ ...t, assignedTo: e.target.value }))}
                className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400"
              />
              <input
                type="datetime-local"
                value={newTask.deadline}
                onChange={(e) => setNewTask((t) => ({ ...t, deadline: e.target.value }))}
                className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800"
              />
              <button
                onClick={addTask}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Ajouter
              </button>
            </div>
          </section>

          {/* Filtres : Toutes / Quotidien / Annexe / Semaine */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600 mr-1">Filtrer :</span>
            {FILTER_OPTIONS.map(({ id, label, color }) => {
              const isActive = filter === id;
              const activeClass =
                color === 'red' ? 'bg-red-500 text-white hover:bg-red-600' :
                color === 'orange' ? 'bg-orange-500 text-white hover:bg-orange-600' :
                color === 'green' ? 'bg-green-500 text-white hover:bg-green-600' :
                'bg-slate-600 text-white hover:bg-slate-700';
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
            {stats.completed > 0 && (
              <button onClick={clearCompleted} className="ml-auto px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                Effacer terminées
              </button>
            )}
          </div>

          {/* Task list */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">Chargement...</div>
          ) : sorted.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">Aucune tâche</div>
          ) : (
            <ul className="space-y-3">
              {sorted.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  toggleTask={toggleTask}
                  deleteTask={deleteTask}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
