import { describe, it, expect } from 'vitest';
import {
  statusFromDbRow,
  normalizeTaskFields,
  nextStatus,
  computeDayProgress,
} from './taskStatus';
import {
  TASK_STATUS_DONE,
  TASK_STATUS_IN_PROGRESS,
  TASK_STATUS_TODO,
} from '../config/opsConstants';

describe('taskStatus', () => {
  it('statusFromDbRow utilise la colonne status si présente', () => {
    expect(statusFromDbRow({ status: 'in_progress', completed: false })).toBe('in_progress');
  });

  it('statusFromDbRow déduit done depuis completed', () => {
    expect(statusFromDbRow({ completed: true })).toBe(TASK_STATUS_DONE);
    expect(statusFromDbRow({ completed: false })).toBe(TASK_STATUS_TODO);
  });

  it('nextStatus cycle todo → in_progress → done → todo', () => {
    expect(nextStatus(TASK_STATUS_TODO)).toBe(TASK_STATUS_IN_PROGRESS);
    expect(nextStatus(TASK_STATUS_IN_PROGRESS)).toBe(TASK_STATUS_DONE);
    expect(nextStatus(TASK_STATUS_DONE)).toBe(TASK_STATUS_TODO);
  });

  it('normalizeTaskFields aligne completed et timestamps', () => {
    const done = normalizeTaskFields({ status: TASK_STATUS_DONE, completedBy: 'Alice' });
    expect(done.completed).toBe(true);
    expect(done.status).toBe(TASK_STATUS_DONE);
    expect(done.completedBy).toBe('Alice');

    const prog = normalizeTaskFields({ status: TASK_STATUS_IN_PROGRESS });
    expect(prog.completed).toBe(false);
    expect(prog.startedAt).toBeTruthy();
  });

  it('computeDayProgress pour la date du jour', () => {
    const today = '2026-05-20';
    const tasks = [
      { scheduledFor: today, status: TASK_STATUS_DONE, completed: true },
      { scheduledFor: today, status: TASK_STATUS_IN_PROGRESS, completed: false },
      { scheduledFor: today, status: TASK_STATUS_TODO, completed: false },
      { scheduledFor: '2026-05-19', status: TASK_STATUS_DONE, completed: true },
    ];
    const p = computeDayProgress(tasks, today);
    expect(p.total).toBe(3);
    expect(p.done).toBe(1);
    expect(p.inProgress).toBe(1);
    expect(p.pending).toBe(1);
    expect(p.percent).toBe(33);
  });
});
