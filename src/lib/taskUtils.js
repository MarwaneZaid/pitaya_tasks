import { TASK_TYPE_QUOTIDIEN } from '../config/constants';
import {
  TASK_LIST_ALL,
  TASK_LIST_CHECKLIST,
  TASK_LIST_NETTOYAGE,
} from '../config/opsConstants';

export function getTodayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export function getYesterdayYmd(todayYmd = getTodayYmd()) {
  const d = new Date(`${todayYmd}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Date planifiée d’une tâche (YYYY-MM-DD). */
export function taskScheduledDay(task, fallbackToday = getTodayYmd()) {
  return task.scheduledFor || (task.createdAt && task.createdAt.slice(0, 10)) || fallbackToday;
}

function ymdToMs(ymd) {
  return new Date(`${ymd}T12:00:00`).getTime();
}

export function dayDiffFromToday(dayYmd, todayYmd = getTodayYmd()) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((ymdToMs(todayYmd) - ymdToMs(dayYmd)) / msPerDay);
}

export function formatDaySectionLabel(ymd, prefix) {
  const label = new Date(`${ymd}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return `${prefix} — ${label}`;
}

/**
 * Sépare les tâches en sections : aujourd’hui, hier, jours plus anciens.
 */
export function isTaskDone(task) {
  return task?.status === 'done' || !!task?.completed;
}

/** Tâche issue d’un modèle de checklist (ouverture, fermeture, hygiène…). */
export function isChecklistTask(task) {
  return Boolean(task?.checklistId);
}

/** Tâche du planning nettoyage hebdomadaire (quotidien, hors checklist). */
export function isNettoyagePlanningTask(task) {
  if (isChecklistTask(task)) return false;
  return (task?.taskType ?? null) === TASK_TYPE_QUOTIDIEN;
}

/**
 * Cache les tâches nettoyage quotidiennes non terminées trop anciennes.
 * Par défaut, on garde aujourd'hui et hier; au-delà, on masque.
 */
export function shouldHideStaleNettoyageTask(task, todayYmd = getTodayYmd(), keepDays = 1) {
  if (!isNettoyagePlanningTask(task) || isTaskDone(task)) return false;
  const taskDay = taskScheduledDay(task, todayYmd);
  return dayDiffFromToday(taskDay, todayYmd) > keepDays;
}

export function matchesTaskListFilter(task, listFilter) {
  switch (listFilter) {
    case TASK_LIST_ALL:
    case undefined:
      return true;
    case TASK_LIST_CHECKLIST:
      return isChecklistTask(task);
    case TASK_LIST_NETTOYAGE:
      return isNettoyagePlanningTask(task);
    default: {
      const unexpected = listFilter;
      void unexpected;
      return true;
    }
  }
}

/** Compteurs pour un jour (calendrier / récap). */
export function summarizeDayTasks(tasks) {
  const list = tasks || [];
  let done = 0;
  let inProgress = 0;
  let todo = 0;
  for (const t of list) {
    if (isTaskDone(t)) done += 1;
    else if (t.status === 'in_progress') inProgress += 1;
    else todo += 1;
  }
  const total = list.length;
  return {
    total,
    done,
    inProgress,
    todo,
    pending: inProgress + todo,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

export function groupTasksByDay(tasks, todayYmd = getTodayYmd()) {
  const yesterdayYmd = getYesterdayYmd(todayYmd);
  const today = [];
  const yesterday = [];
  const other = [];

  for (const task of tasks || []) {
    const day = taskScheduledDay(task, todayYmd);
    if (day === todayYmd) today.push(task);
    else if (day === yesterdayYmd) yesterday.push(task);
    else other.push(task);
  }

  return { today, yesterday, other, todayYmd, yesterdayYmd };
}

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
