import {
  TASK_STATUS_DONE,
  TASK_STATUS_IN_PROGRESS,
  TASK_STATUS_TODO,
} from '../config/opsConstants';

export function statusFromDbRow(row) {
  const s = row?.status;
  if (s === TASK_STATUS_TODO || s === TASK_STATUS_IN_PROGRESS || s === TASK_STATUS_DONE) {
    return s;
  }
  return row?.completed ? TASK_STATUS_DONE : TASK_STATUS_TODO;
}

/** Harmonise statut + booléen completed pour l’API et l’UI. */
export function normalizeTaskFields(task) {
  let status = task.status;
  if (!status) {
    status = task.completed ? TASK_STATUS_DONE : TASK_STATUS_TODO;
  }
  if (status === TASK_STATUS_DONE) {
    return {
      status: TASK_STATUS_DONE,
      completed: true,
      startedAt: task.startedAt || task.completedAt || null,
      completedAt: task.completedAt || new Date().toISOString(),
      completedBy: task.completedBy || null,
    };
  }
  if (status === TASK_STATUS_IN_PROGRESS) {
    return {
      status: TASK_STATUS_IN_PROGRESS,
      completed: false,
      startedAt: task.startedAt || new Date().toISOString(),
      completedAt: null,
      completedBy: null,
    };
  }
  return {
    status: TASK_STATUS_TODO,
    completed: false,
    startedAt: null,
    completedAt: null,
    completedBy: null,
  };
}

export function nextStatus(current) {
  if (current === TASK_STATUS_TODO) return TASK_STATUS_IN_PROGRESS;
  if (current === TASK_STATUS_IN_PROGRESS) return TASK_STATUS_DONE;
  return TASK_STATUS_TODO;
}

export function computeDayProgress(tasks, dateYmd) {
  const dayTasks = (tasks || []).filter((t) => t.scheduledFor === dateYmd);
  const total = dayTasks.length;
  if (total === 0) return { total: 0, done: 0, inProgress: 0, pending: 0, percent: 0 };
  const done = dayTasks.filter((t) => t.status === TASK_STATUS_DONE || t.completed).length;
  const inProgress = dayTasks.filter((t) => t.status === TASK_STATUS_IN_PROGRESS).length;
  const pending = total - done - inProgress;
  return {
    total,
    done,
    inProgress,
    pending,
    percent: Math.round((done / total) * 100),
  };
}
