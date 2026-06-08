/** Postes / zones opérationnelles (checklists & filtres). */
export const OPS_POSTS = [
  { id: 'all', label: 'Tout le restaurant' },
  { id: 'cuisine', label: 'Cuisine' },
  { id: 'salle', label: 'Salle' },
  { id: 'bar', label: 'Bar' },
  { id: 'stock', label: 'Stock' },
];

export const TASK_STATUS_TODO = 'todo';
export const TASK_STATUS_IN_PROGRESS = 'in_progress';
export const TASK_STATUS_DONE = 'done';

export const TASK_STATUS_LABELS = {
  [TASK_STATUS_TODO]: 'À faire',
  [TASK_STATUS_IN_PROGRESS]: 'En cours',
  [TASK_STATUS_DONE]: 'Terminée',
};

export const CHECKLIST_RECURRENCE_DAILY = 'daily';
export const CHECKLIST_RECURRENCE_WEEKDAYS = 'weekdays';

export const DEFAULT_CHECKLIST_TEMPLATES = [
  {
    name: 'Ouverture',
    post: 'all',
    recurrence: CHECKLIST_RECURRENCE_DAILY,
    weekdayKeys: null,
    sortOrder: 0,
    items: [
      { title: 'Allumer et contrôler les équipements', priority: 'haute' },
      { title: 'Vérifier températures frigos', priority: 'haute' },
      { title: 'Mise en place salle / cuisine', priority: 'moyenne' },
    ],
  },
  {
    name: 'Fermeture',
    post: 'all',
    recurrence: CHECKLIST_RECURRENCE_DAILY,
    weekdayKeys: null,
    sortOrder: 1,
    items: [
      { title: 'Nettoyage zones de production', priority: 'haute' },
      { title: 'Rangement stock', priority: 'moyenne' },
      { title: 'Extinction équipements', priority: 'haute' },
    ],
  },
];
