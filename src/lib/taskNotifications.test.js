import { describe, it, expect } from 'vitest';
import {
  getPendingTasksForDate,
  shouldFireDailyNotification,
  buildPlannedTasksNotification,
} from './taskNotifications';

describe('taskNotifications', () => {
  const tasks = [
    { title: 'A', completed: false, scheduledFor: '2026-05-20' },
    { title: 'B', completed: true, scheduledFor: '2026-05-20' },
    { title: 'C', completed: false, scheduledFor: '2026-05-21' },
  ];

  it('getPendingTasksForDate filters by date and completion', () => {
    expect(getPendingTasksForDate(tasks, '2026-05-20')).toHaveLength(1);
    expect(getPendingTasksForDate(tasks, '2026-05-20')[0].title).toBe('A');
  });

  it('shouldFireDailyNotification once per day after hour', () => {
    expect(
      shouldFireDailyNotification({
        todayYmd: '2026-05-20',
        currentHour: 9,
        reminderHour: 8,
        lastFiredYmd: '',
        enabled: true,
      })
    ).toBe(true);
    expect(
      shouldFireDailyNotification({
        todayYmd: '2026-05-20',
        currentHour: 9,
        reminderHour: 8,
        lastFiredYmd: '2026-05-20',
        enabled: true,
      })
    ).toBe(false);
  });

  it('buildPlannedTasksNotification returns null when empty', () => {
    expect(buildPlannedTasksNotification(tasks, '2026-05-99', 'Test')).toBeNull();
  });
});
