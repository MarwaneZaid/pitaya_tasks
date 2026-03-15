export function isUrgent(task) {
  if (!task.deadline || task.completed) return false;
  const deadline = new Date(task.deadline);
  const now = new Date();
  const hours = (deadline - now) / (1000 * 60 * 60);
  return hours <= 2 && hours > 0;
}

export function isOverdue(task) {
  if (!task.deadline || task.completed) return false;
  return new Date(task.deadline) < new Date();
}

/** Affiche un nom lisible : si c’est une URL (ex. Supabase), affiche "Équipe" */
export function displayName(value) {
  if (!value) return '';
  if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) return 'Équipe';
  return value;
}
