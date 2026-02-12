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

export const FILTER_OPTIONS = [
  { id: 'all', label: 'Toutes' },
  { id: 'active', label: 'Actives' },
  { id: 'completed', label: 'Terminées' },
  { id: 'my-tasks', label: 'Mes tâches' },
  { id: 'cuisine', label: 'Cuisine' },
  { id: 'service', label: 'Service' },
  { id: 'nettoyage', label: 'Nettoyage' },
  { id: 'stock', label: 'Stock' },
];

export const STORAGE_KEY = 'restaurant-tasks-shared';
export const USER_NAME_KEY = 'restaurant-user-name';
