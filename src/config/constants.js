export const CATEGORY_LABELS = {
  cuisine: 'Cuisine',
  service: 'Service',
  nettoyage: 'Nettoyage',
  stock: 'Stock',
};

export const CATEGORY_COLORS = {
  cuisine: 'bg-orange-100 text-orange-800 border-orange-300',
  service: 'bg-blue-100 text-blue-800 border-blue-300',
  nettoyage: 'bg-green-100 text-green-800 border-green-300',
  stock: 'bg-purple-100 text-purple-800 border-purple-300',
};

export const PRIORITY_COLORS = {
  haute: 'bg-red-500',
  moyenne: 'bg-yellow-500',
  basse: 'bg-green-500',
};

/** Type de tâche : quotidien obligatoire (rouge), annexe (orange), à faire dans la semaine (vert) */
export const TASK_TYPE_QUOTIDIEN = 'quotidien';
export const TASK_TYPE_ANNEXE = 'annexe';
export const TASK_TYPE_SEMAINE = 'semaine';

export const TASK_TYPE_LABELS = {
  [TASK_TYPE_QUOTIDIEN]: 'Quotidien obligatoire',
  [TASK_TYPE_ANNEXE]: 'Annexe',
  [TASK_TYPE_SEMAINE]: 'À faire dans la semaine',
};

export const TASK_TYPE_COLORS = {
  [TASK_TYPE_QUOTIDIEN]: 'border-l-red-500 bg-red-50/40',
  [TASK_TYPE_ANNEXE]: 'border-l-orange-500 bg-orange-50/40',
  [TASK_TYPE_SEMAINE]: 'border-l-green-500 bg-green-50/40',
};

/** Filtres affichés : uniquement les 3 catégories de tâches + Toutes */
export const FILTER_OPTIONS = [
  { id: 'all', label: 'Toutes' },
  { id: 'quotidien', label: 'Quotidien obligatoire', color: 'red' },
  { id: 'annexe', label: 'Annexe', color: 'orange' },
  { id: 'semaine', label: 'À faire dans la semaine', color: 'green' },
];

export const STORAGE_KEY = 'restaurant-tasks-shared';
export const USER_NAME_KEY = 'restaurant-user-name';
