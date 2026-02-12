import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Clock, Users, ChefHat, AlertCircle, RefreshCw, CalendarCheck, Settings } from 'lucide-react';
import { setSupabaseConfig, isSupabaseConfigured, getStoredSupabaseConfig, clearSupabaseConfig, initSupabaseStorage } from './storage-supabase.js';

// Planning nettoyage PITAYA BETHUNE – tâches indispensables par jour (Matin / Après-midi indicatif)
const PLANNING_NETTOYAGE = {
  lundi: [
    { title: 'Bouger toutes les tables et nettoyer en dessous', priority: 'haute' },
    { title: 'Nettoyer toutes les étagères du labo et changer les lavettes', priority: 'moyenne' },
    { title: 'Nettoyer les grilles en bas des saladettes et joint saladette', priority: 'moyenne' },
    { title: 'Nettoyer la porte du labo', priority: 'moyenne' },
    { title: 'Détartrage du bain marie et des passoires au vinaigre', priority: 'moyenne' },
  ],
  mardi: [
    { title: 'Nettoyer les crédences du labo', priority: 'haute' },
    { title: "Nettoyer l'intérieur de la poubelle labo", priority: 'haute' },
    { title: 'Intérieur frigo boisson', priority: 'moyenne' },
    { title: "Nettoyer l'intérieur de la poubelle alimentaire", priority: 'moyenne' },
    { title: 'Nettoyer le sol, la VMC et les étagères de la réserve', priority: 'moyenne' },
  ],
  mercredi: [
    { title: 'Bouger toutes les tables et nettoyer en dessous', priority: 'haute' },
    { title: 'Bouger les frigo du labo et nettoyer à l\'arrière', priority: 'haute' },
    { title: 'Nettoyer les distributeurs des produits à plonge', priority: 'moyenne' },
    { title: 'Intérieur saladette topping et saladette sauce', priority: 'moyenne' },
    { title: 'Nettoyer les crédences de la plonge', priority: 'moyenne' },
  ],
  jeudi: [
    { title: 'Nettoyer sous l\'escalier', priority: 'haute' },
    { title: 'Nettoyer les étagères à bol et celle de la plonge', priority: 'moyenne' },
    { title: 'Nettoyer sous les woks', priority: 'moyenne' },
    { title: "Nettoyer l'extérieur de la hotte", priority: 'moyenne' },
    { title: 'Faire les poussières', priority: 'moyenne' },
  ],
  vendredi: [
    { title: 'Bouger toutes les tables et nettoyer en dessous', priority: 'haute' },
    { title: 'Nettoyer le vestiaire = sol, mur, VMC, poubelle', priority: 'haute' },
    { title: 'Nettoyer le local poubelle', priority: 'moyenne' },
    { title: 'Bouger le meuble des toilettes et nettoyer derrière', priority: 'moyenne' },
  ],
  samedi: [],
  dimanche: [
    { title: "Nettoyer l'intérieur des frigo du labo et leurs vitres", priority: 'moyenne' },
    { title: 'Nettoyer derrière le frigo boisson et sous le maintien au chaud', priority: 'moyenne' },
    { title: "Nettoyer l'espace balai de la plonge", priority: 'moyenne' },
    { title: 'Nettoyage du piano (tour de bouton, plaque latérales, et dessous)', priority: 'moyenne' },
  ],
};

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export default function RestaurantTaskManagerShared() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    category: 'cuisine',
    priority: 'moyenne',
    assignedTo: '',
    deadline: ''
  });
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, urgent: 0 });
  const [userName, setUserName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Charger le nom d'utilisateur depuis le stockage local (personnel)
  useEffect(() => {
    const savedName = localStorage.getItem('restaurant-user-name');
    if (savedName) {
      setUserName(savedName);
      setIsNameSet(true);
    }
    loadSharedTasks();
  }, []);

  // Charger les tâches partagées
  const loadSharedTasks = async () => {
    setLoading(true);
    try {
      const result = await window.storage.get('restaurant-tasks-shared', true);
      if (result && result.value) {
        const parsedTasks = JSON.parse(result.value);
        setTasks(parsedTasks);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.log('Aucune donnée partagée trouvée, initialisation...');
      setTasks([]);
    }
    setLoading(false);
  };

  // Sauvegarder les tâches dans le stockage partagé
  const saveSharedTasks = async (updatedTasks) => {
    try {
      await window.storage.set('restaurant-tasks-shared', JSON.stringify(updatedTasks), true);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des données. Veuillez réessayer.');
    }
  };

  // Calculer les statistiques
  useEffect(() => {
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.filter(t => !t.completed).length;
    const urgent = tasks.filter(t => t.priority === 'haute' && !t.completed).length;

    setStats({
      total: tasks.length,
      completed,
      pending,
      urgent
    });
  }, [tasks]);

  // Définir le nom d'utilisateur
  const setUserNameHandler = () => {
    if (userName.trim()) {
      localStorage.setItem('restaurant-user-name', userName.trim());
      setIsNameSet(true);
    }
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;

    const task = {
      id: Date.now(),
      ...newTask,
      completed: false,
      createdAt: new Date().toISOString(),
      createdBy: userName,
      completedAt: null,
      completedBy: null
    };

    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    await saveSharedTasks(updatedTasks);

    setNewTask({
      title: '',
      category: 'cuisine',
      priority: 'moyenne',
      assignedTo: '',
      deadline: ''
    });
  };

  // Ajouter les tâches indispensables du jour (planning nettoyage Pitaya Béthune)
  const addIndispensableTasksForToday = async () => {
    const jourIndex = new Date().getDay();
    const jour = JOURS[jourIndex];
    const tasksDuJour = PLANNING_NETTOYAGE[jour] || [];
    if (tasksDuJour.length === 0) {
      alert('Aucune tâche de nettoyage prévue pour ce jour (samedi).');
      return;
    }
    const existingTitles = new Set(tasks.map(t => t.title));
    const toAdd = tasksDuJour.filter(t => !existingTitles.has(t.title));
    if (toAdd.length === 0) {
      alert('Les tâches indispensables du jour sont déjà dans la liste.');
      return;
    }
    const now = Date.now();
    const newTasks = toAdd.map((item, i) => ({
      id: now + i,
      title: item.title,
      category: 'nettoyage',
      priority: item.priority,
      assignedTo: '',
      deadline: '',
      completed: false,
      createdAt: new Date().toISOString(),
      createdBy: userName,
      completedAt: null,
      completedBy: null,
      indispensable: true,
    }));
    const updatedTasks = [...tasks, ...newTasks];
    setTasks(updatedTasks);
    await saveSharedTasks(updatedTasks);
  };

  const toggleTask = async (id) => {
    const updatedTasks = tasks.map(task =>
      task.id === id
        ? {
            ...task,
            completed: !task.completed,
            completedAt: !task.completed ? new Date().toISOString() : null,
            completedBy: !task.completed ? userName : null
          }
        : task
    );
    setTasks(updatedTasks);
    await saveSharedTasks(updatedTasks);
  };

  const deleteTask = async (id) => {
    const updatedTasks = tasks.filter(task => task.id !== id);
    setTasks(updatedTasks);
    await saveSharedTasks(updatedTasks);
  };

  const clearCompleted = async () => {
    const updatedTasks = tasks.filter(task => !task.completed);
    setTasks(updatedTasks);
    await saveSharedTasks(updatedTasks);
  };

  const resetAll = async () => {
    if (confirm('⚠️ ATTENTION: Cette action supprimera toutes les tâches pour TOUS les managers. Êtes-vous sûr ?')) {
      setTasks([]);
      try {
        await window.storage.delete('restaurant-tasks-shared', true);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Erreur lors de la suppression');
      }
    }
  };

  const refreshTasks = async () => {
    await loadSharedTasks();
  };

  const getFilteredTasks = () => {
    switch (filter) {
      case 'active':
        return tasks.filter(t => !t.completed);
      case 'completed':
        return tasks.filter(t => t.completed);
      case 'cuisine':
      case 'service':
      case 'nettoyage':
      case 'stock':
        return tasks.filter(t => t.category === filter);
      case 'my-tasks':
        return tasks.filter(t => t.assignedTo === userName);
      default:
        return tasks;
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      cuisine: 'bg-orange-100 text-orange-800 border-orange-300',
      service: 'bg-blue-100 text-blue-800 border-blue-300',
      nettoyage: 'bg-green-100 text-green-800 border-green-300',
      stock: 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      haute: 'bg-red-500',
      moyenne: 'bg-yellow-500',
      basse: 'bg-green-500'
    };
    return colors[priority] || 'bg-gray-500';
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'cuisine': return <ChefHat className="w-4 h-4" />;
      case 'service': return <Users className="w-4 h-4" />;
      case 'nettoyage': return '🧹';
      case 'stock': return '📦';
      default: return null;
    }
  };

  const isUrgent = (task) => {
    if (!task.deadline || task.completed) return false;
    const deadline = new Date(task.deadline);
    const now = new Date();
    const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);
    return hoursUntilDeadline <= 2 && hoursUntilDeadline > 0;
  };

  const isOverdue = (task) => {
    if (!task.deadline || task.completed) return false;
    return new Date(task.deadline) < new Date();
  };

  // Écran de connexion
  if (!isNameSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-2xl inline-block mb-4">
              <ChefHat className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestion Restaurant</h1>
            <p className="text-gray-600">Système partagé de suivi des tâches</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre nom ou identifiant
              </label>
              <input
                type="text"
                placeholder="Ex: Chef Pierre, Manager Sarah..."
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && setUserNameHandler()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg"
                autoFocus
              />
            </div>

            <button
              onClick={setUserNameHandler}
              disabled={!userName.trim()}
              className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
            >
              Accéder au tableau de bord
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Mode collaboratif :</strong> Toutes les tâches sont partagées entre tous les managers en temps réel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const filteredTasks = getFilteredTasks();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl shadow-lg">
                <ChefHat className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Gestion des Tâches</h1>
                <p className="text-gray-500">Restaurant - Tableau partagé</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-gray-500">Connecté en tant que</div>
                <div className="font-semibold text-orange-600">{userName}</div>
              </div>

              <button
                onClick={refreshTasks}
                className="p-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                title="Actualiser les données"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  const c = getStoredSupabaseConfig();
                  setSupabaseUrl(c.url);
                  setSupabaseKey(c.anonKey);
                  setShowSettings(true);
                  setSettingsSaved(false);
                }}
                className="p-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                title="Partager avec l'équipe"
              >
                <Settings className="w-5 h-5" />
              </button>

              <button
                onClick={resetAll}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                Réinitialiser tout
              </button>
            </div>
          </div>

          {/* Modal Paramètres - partage avec l'équipe */}
          {showSettings && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSettings(false)}>
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Partager avec l'équipe</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Pour que tous les managers voient les mêmes tâches (y compris sur téléphone), configurez Supabase une fois. Envoyez ensuite ce lien à tout le monde.
                </p>
                {isSupabaseConfigured() && (
                  <p className="text-sm text-green-600 mb-3 font-medium">Connexion partagée active.</p>
                )}
                <div className="space-y-3 mb-4">
                  <label className="block text-sm font-medium text-gray-700">URL Supabase</label>
                  <input
                    type="url"
                    placeholder="https://xxxxx.supabase.co"
                    value={supabaseUrl}
                    onChange={e => setSupabaseUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <label className="block text-sm font-medium text-gray-700">Clé anon (publique)</label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOi..."
                    value={supabaseKey}
                    onChange={e => setSupabaseKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSupabaseConfig(supabaseUrl, supabaseKey);
                      initSupabaseStorage();
                      setSettingsSaved(true);
                      setTimeout(() => window.location.reload(), 600);
                    }}
                    disabled={!supabaseUrl.trim() || !supabaseKey.trim()}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm font-medium"
                  >
                    Enregistrer
                  </button>
                  {isSupabaseConfigured() && (
                    <button
                      onClick={() => {
                        clearSupabaseConfig();
                        setTimeout(() => window.location.reload(), 400);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                    >
                      Désactiver le partage
                    </button>
                  )}
                  <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-gray-600 text-sm">Fermer</button>
                </div>
                {settingsSaved && <p className="text-sm text-green-600 mt-2">Rechargement...</p>}
              </div>
            </div>
          )}

          {lastUpdate && (
            <div className="text-xs text-gray-500 mb-4">
              Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
            </div>
          )}

          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <div className="text-sm text-blue-600 font-medium">Total</div>
              <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <div className="text-sm text-green-600 font-medium">Terminées</div>
              <div className="text-2xl font-bold text-green-900">{stats.completed}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
              <div className="text-sm text-orange-600 font-medium">En cours</div>
              <div className="text-2xl font-bold text-orange-900">{stats.pending}</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
              <div className="text-sm text-red-600 font-medium">Urgentes</div>
              <div className="text-2xl font-bold text-red-900">{stats.urgent}</div>
            </div>
          </div>
        </div>

        {/* Tâches indispensables du jour (planning nettoyage) */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 flex flex-wrap items-center gap-3">
          <CalendarCheck className="w-6 h-6 text-orange-500 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-gray-800">Planning nettoyage PITAYA BÉTHUNE</h2>
            <p className="text-sm text-gray-500">
              Matin / Après-midi à titre indicatif — Aujourd'hui ({JOURS[new Date().getDay()]}) : {PLANNING_NETTOYAGE[JOURS[new Date().getDay()]]?.length || 0} tâches indispensables
            </p>
          </div>
          <button
            type="button"
            onClick={addIndispensableTasksForToday}
            className="ml-auto px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-md flex items-center gap-2 font-medium"
          >
            <CalendarCheck className="w-5 h-5" />
            Ajouter les tâches du jour
          </button>
        </div>

        {/* Formulaire d'ajout */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Ajouter une tâche</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Titre de la tâche..."
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && addTask()}
              className="col-span-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />

            <select
              value={newTask.category}
              onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="cuisine">🍳 Cuisine</option>
              <option value="service">👥 Service</option>
              <option value="nettoyage">🧹 Nettoyage</option>
              <option value="stock">📦 Stock</option>
            </select>

            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="basse">🟢 Basse</option>
              <option value="moyenne">🟡 Moyenne</option>
              <option value="haute">🔴 Haute</option>
            </select>

            <input
              type="text"
              placeholder="Assigné à..."
              value={newTask.assignedTo}
              onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />

            <input
              type="datetime-local"
              value={newTask.deadline}
              onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />

            <button
              onClick={addTask}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              Ajouter
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {['all', 'active', 'completed', 'my-tasks', 'cuisine', 'service', 'nettoyage', 'stock'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === f
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? '📋 Toutes' :
                  f === 'active' ? '⚡ Actives' :
                    f === 'completed' ? '✅ Terminées' :
                      f === 'my-tasks' ? '👤 Mes tâches' :
                        f === 'cuisine' ? '🍳 Cuisine' :
                          f === 'service' ? '👥 Service' :
                            f === 'nettoyage' ? '🧹 Nettoyage' : '📦 Stock'}
              </button>
            ))}
            {stats.completed > 0 && (
              <button
                onClick={clearCompleted}
                className="ml-auto px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              >
                Effacer terminées
              </button>
            )}
          </div>
        </div>

        {/* Liste des tâches */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-gray-400 text-lg">Chargement des données partagées...</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="text-gray-400 text-lg">Aucune tâche à afficher</div>
              </div>
            ) : (
              filteredTasks
                .sort((a, b) => {
                  if (a.completed !== b.completed) return a.completed ? 1 : -1;
                  if (isOverdue(a) !== isOverdue(b)) return isOverdue(a) ? -1 : 1;
                  if (isUrgent(a) !== isUrgent(b)) return isUrgent(a) ? -1 : 1;
                  const priorityOrder = { haute: 0, moyenne: 1, basse: 2 };
                  return priorityOrder[a.priority] - priorityOrder[b.priority];
                })
                .map(task => (
                  <div
                    key={task.id}
                    className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-4 border-l-4 ${
                      task.completed ? 'opacity-60 border-green-500' :
                        isOverdue(task) ? 'border-red-500 bg-red-50' :
                          isUrgent(task) ? 'border-orange-500 bg-orange-50' :
                            'border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="mt-1 flex-shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-400 hover:text-orange-500 transition-colors" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className={`text-lg font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                            {task.title}
                          </h3>
                          {isOverdue(task) && (
                            <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              En retard
                            </span>
                          )}
                          {isUrgent(task) && (
                            <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Urgent
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 items-center text-sm mb-2">
                          <span className={`px-3 py-1 rounded-full border ${getCategoryColor(task.category)} flex items-center gap-1`}>
                            {getCategoryIcon(task.category)}
                            {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
                          </span>

                          <div className="flex items-center gap-1">
                            <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                            <span className="text-gray-600">
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </span>
                          </div>

                          {task.assignedTo && (
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {task.assignedTo}
                            </span>
                          )}

                          {task.deadline && (
                            <span className={`px-3 py-1 rounded-full border flex items-center gap-1 ${
                              isOverdue(task) ? 'bg-red-100 text-red-800 border-red-300' :
                                isUrgent(task) ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                  'bg-gray-100 text-gray-700 border-gray-300'
                            }`}>
                              <Clock className="w-3 h-3" />
                              {new Date(task.deadline).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 space-y-1">
                          <div>Créée par {task.createdBy} le {new Date(task.createdAt).toLocaleString('fr-FR')}</div>
                          {task.completed && task.completedBy && (
                            <div className="text-green-600">
                              ✓ Terminée par {task.completedBy} le {new Date(task.completedAt).toLocaleString('fr-FR')}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => deleteTask(task.id)}
                        className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
