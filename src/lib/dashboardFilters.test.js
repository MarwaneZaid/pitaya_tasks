import { describe, it, expect } from 'vitest';
import { filterDashboardTasks } from './dashboardFilters';
import { isAssignedToMe } from './taskUtils';
import { TASK_TYPE_ANNEXE, TASK_TYPE_QUOTIDIEN } from '../config/constants';

describe('isAssignedToMe', () => {
  it('matches exact and display-name forms', () => {
    expect(isAssignedToMe({ assignedTo: 'Samir' }, 'Samir')).toBe(true);
    expect(isAssignedToMe({ assignedTo: 'samir' }, 'Samir')).toBe(true);
    expect(
      isAssignedToMe(
        { assignedTo: 'Pitaya bethune' },
        'pitaya-bethune@dailydo-saas.app'
      )
    ).toBe(true);
  });

  it('rejects empty or other people', () => {
    expect(isAssignedToMe({ assignedTo: '' }, 'Samir')).toBe(false);
    expect(isAssignedToMe({ assignedTo: 'Léa' }, 'Samir')).toBe(false);
  });
});

describe('filterDashboardTasks', () => {
  const today = '2026-09-17';
  const tasks = [
    {
      id: '1',
      title: 'Mine',
      assignedTo: 'Samir',
      completed: false,
      status: 'todo',
      taskType: TASK_TYPE_ANNEXE,
      scheduledFor: today,
    },
    {
      id: '2',
      title: 'Other',
      assignedTo: 'Léa',
      completed: false,
      status: 'todo',
      taskType: TASK_TYPE_QUOTIDIEN,
      scheduledFor: today,
    },
  ];

  it('filters my-tasks by display name', () => {
    const mine = filterDashboardTasks({
      tasks,
      filter: 'my-tasks',
      userName: 'Samir',
      todayYmd: today,
    });
    expect(mine).toHaveLength(1);
    expect(mine[0].id).toBe('1');
  });
});
