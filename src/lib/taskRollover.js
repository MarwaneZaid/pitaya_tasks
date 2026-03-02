import { TASK_TYPE_ANNEXE } from '../config/constants';

/**
 * Applique le report des tâches annexes non faites au jour donné.
 * Les tâches annexe avec scheduledFor < today sont copiées pour today et retirées de la liste.
 * @param {Array} tasks - Liste des tâches
 * @param {string} today - Date au format YYYY-MM-DD
 * @returns {{ tasks: Array, changed: boolean }}
 */
export function applyAnnexeRollover(tasks, today) {
  const toRollover = [];
  const rest = tasks.filter((t) => {
    if (t.taskType !== TASK_TYPE_ANNEXE || t.completed) return true;
    const scheduled = t.scheduledFor || (t.createdAt && t.createdAt.slice(0, 10)) || today;
    if (scheduled < today) {
      toRollover.push(t);
      return false;
    }
    return true;
  });
  const copies = toRollover.map((t, i) => ({
    ...t,
    id: Date.now() + i,
    title: (t.title || '').replace(/\s*\(reportée\)\s*$/i, ''),
    scheduledFor: today,
    createdAt: new Date().toISOString(),
    createdBy: t.createdBy,
    completed: false,
    completedAt: null,
    completedBy: null,
  }));
  return {
    tasks: [...rest, ...copies],
    changed: copies.length > 0,
  };
}
