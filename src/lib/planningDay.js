import { JOURS } from '../config/planning';
import { TASK_TYPE_QUOTIDIEN } from '../config/constants';

/** Clé planning (lundi, mardi, …) pour une date YYYY-MM-DD. */
export function weekdayKeyForDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return JOURS[d.getDay()];
}

/**
 * Tâches quotidiennes à créer pour une date à partir du modèle hebdomadaire.
 * @param {Set<string>|string[]} existingTitles - titres déjà planifiés ce jour-là
 */
export function buildQuotidienTasksForDate(planningConfig, dateStr, existingTitles, createdBy) {
  const jour = weekdayKeyForDate(dateStr);
  const templates = (planningConfig?.planning?.[jour] || []).filter(
    (t) => t.title && String(t.title).trim()
  );
  const existing = existingTitles instanceof Set
    ? existingTitles
    : new Set(existingTitles);

  return templates
    .filter((t) => !existing.has(String(t.title).trim()))
    .map((item) => ({
      title: String(item.title).trim(),
      category: 'nettoyage',
      priority: item.priority || 'moyenne',
      taskType: TASK_TYPE_QUOTIDIEN,
      scheduledFor: dateStr,
      assignedTo: '',
      completed: false,
      createdBy: createdBy || 'Système',
    }));
}
