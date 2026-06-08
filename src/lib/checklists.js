import { JOURS } from '../config/planning';
import { TASK_TYPE_QUOTIDIEN } from '../config/constants';
import {
  CHECKLIST_RECURRENCE_DAILY,
  CHECKLIST_RECURRENCE_WEEKDAYS,
} from '../config/opsConstants';

export function checklistItemKey(templateId, title) {
  const slug = String(title || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return `${templateId}:${slug || 'item'}`;
}

export function templateAppliesOnDate(template, dateYmd) {
  if (!template?.active) return false;
  if (template.recurrence === CHECKLIST_RECURRENCE_DAILY) return true;
  if (template.recurrence === CHECKLIST_RECURRENCE_WEEKDAYS) {
    const jour = JOURS[new Date(`${dateYmd}T12:00:00`).getDay()];
    const keys = template.weekdayKeys || [];
    return keys.includes(jour);
  }
  return false;
}

/**
 * Tâches à créer depuis les modèles de checklist pour une date.
 */
export function buildTasksFromChecklists(templates, dateYmd, existingTasks, createdBy) {
  const existingKeys = new Set(
    (existingTasks || [])
      .filter((t) => t.checklistItemKey)
      .map((t) => t.checklistItemKey)
  );

  const out = [];
  for (const template of templates || []) {
    if (!templateAppliesOnDate(template, dateYmd)) continue;
    const items = Array.isArray(template.items) ? template.items : [];
    for (const item of items) {
      const title = (item.title || '').trim();
      if (!title) continue;
      const key = checklistItemKey(template.id, title);
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      out.push({
        title,
        category: template.post === 'cuisine' ? 'cuisine' : 'nettoyage',
        priority: item.priority || 'moyenne',
        taskType: TASK_TYPE_QUOTIDIEN,
        scheduledFor: dateYmd,
        assignedTo: item.assignedTo || '',
        post: template.post === 'all' ? null : template.post,
        checklistId: template.id,
        checklistItemKey: key,
        status: 'todo',
        completed: false,
        createdBy: createdBy || 'Système',
      });
    }
  }
  return out;
}

export function mapChecklistRow(row) {
  return {
    id: row.id,
    name: row.name,
    post: row.post || 'all',
    recurrence: row.recurrence || CHECKLIST_RECURRENCE_DAILY,
    weekdayKeys: row.weekday_keys || null,
    items: Array.isArray(row.items) ? row.items : [],
    sortOrder: row.sort_order ?? 0,
    active: row.active !== false,
  };
}
