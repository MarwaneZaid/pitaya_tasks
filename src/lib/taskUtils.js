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
  const s = String(value).trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return 'Équipe';
  if (
    s.includes('@') &&
    (s.endsWith('@dailydo.app') ||
      s.endsWith('@restaurant.dailydo.app') ||
      s.endsWith('@dailydo-saas.app'))
  ) {
    const local = s.slice(0, s.indexOf('@')).replace(/-/g, ' ');
    return local ? local.charAt(0).toUpperCase() + local.slice(1) : s;
  }
  return s;
}
