import { describe, it, expect } from 'vitest';
import {
  displayName,
  dayDiffFromToday,
  getYesterdayYmd,
  groupTasksByDay,
  isBeforeYesterday,
  summarizeDayTasks,
  taskScheduledDay,
  isChecklistTask,
  isNettoyagePlanningTask,
  matchesTaskListFilter,
  shouldHideStaleNettoyageTask,
} from './taskUtils';
import { TASK_TYPE_QUOTIDIEN } from '../config/constants';
import { TASK_LIST_CHECKLIST, TASK_LIST_NETTOYAGE } from '../config/opsConstants';

/**
 * Logique de filtrage des tâches (répliquée depuis Dashboard pour tester)
 */
function getFilteredTasks(tasks, filter, userName, TASK_TYPE_ANNEXE) {
  switch (filter) {
    case 'active':
      return tasks.filter((t) => !t.completed);
    case 'completed':
      return tasks.filter((t) => t.completed);
    case 'my-tasks':
      return tasks.filter((t) => t.assignedTo === userName);
    case 'quotidien':
    case 'annexe':
    case 'semaine':
      return tasks.filter((t) => (t.taskType || TASK_TYPE_ANNEXE) === filter);
    default:
      return tasks;
  }
}

describe('taskUtils (filtrage)', () => {
  const TASK_TYPE_ANNEXE = 'annexe';
  const tasks = [
    { id: 1, title: 'A', completed: false, taskType: 'quotidien', assignedTo: 'Alice' },
    { id: 2, title: 'B', completed: true, taskType: 'annexe', assignedTo: 'Bob' },
    { id: 3, title: 'C', completed: false, taskType: 'annexe', assignedTo: 'Alice' },
    { id: 4, title: 'D', completed: false, taskType: 'semaine', assignedTo: 'Bob' },
  ];

  it('filter "all" retourne toutes les tâches', () => {
    expect(getFilteredTasks(tasks, 'all', 'Alice', TASK_TYPE_ANNEXE)).toHaveLength(4);
  });

  it('filter "active" retourne uniquement les non terminées', () => {
    const result = getFilteredTasks(tasks, 'active', 'Alice', TASK_TYPE_ANNEXE);
    expect(result).toHaveLength(3);
    expect(result.every((t) => !t.completed)).toBe(true);
  });

  it('filter "completed" retourne uniquement les terminées', () => {
    const result = getFilteredTasks(tasks, 'completed', 'Alice', TASK_TYPE_ANNEXE);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('B');
  });

  it('filter "quotidien" retourne uniquement les tâches quotidiennes', () => {
    const result = getFilteredTasks(tasks, 'quotidien', 'Alice', TASK_TYPE_ANNEXE);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A');
  });

  it('filter "annexe" retourne uniquement les annexes', () => {
    const result = getFilteredTasks(tasks, 'annexe', 'Alice', TASK_TYPE_ANNEXE);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.title)).toEqual(['B', 'C']);
  });

  it('filter "semaine" retourne uniquement les tâches semaine', () => {
    const result = getFilteredTasks(tasks, 'semaine', 'Alice', TASK_TYPE_ANNEXE);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('D');
  });

  it('filter "my-tasks" filtre par assigné', () => {
    const result = getFilteredTasks(tasks, 'my-tasks', 'Alice', TASK_TYPE_ANNEXE);
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.assignedTo === 'Alice')).toBe(true);
  });
});

describe('task list filter (checklist vs nettoyage)', () => {
  const mixed = [
    { id: 1, title: 'Checklist ouverture', taskType: TASK_TYPE_QUOTIDIEN, checklistId: 'cl-1' },
    { id: 2, title: 'Nettoyage sol', taskType: TASK_TYPE_QUOTIDIEN },
    { id: 3, title: 'Annexe', taskType: 'annexe' },
  ];

  it('isChecklistTask détecte checklistId', () => {
    expect(isChecklistTask(mixed[0])).toBe(true);
    expect(isChecklistTask(mixed[1])).toBe(false);
  });

  it('isNettoyagePlanningTask cible le planning quotidien sans checklist', () => {
    expect(isNettoyagePlanningTask(mixed[1])).toBe(true);
    expect(isNettoyagePlanningTask(mixed[0])).toBe(false);
    expect(isNettoyagePlanningTask(mixed[2])).toBe(false);
  });

  it('matchesTaskListFilter sépare les vues', () => {
    expect(mixed.filter((t) => matchesTaskListFilter(t, TASK_LIST_CHECKLIST))).toHaveLength(1);
    expect(mixed.filter((t) => matchesTaskListFilter(t, TASK_LIST_NETTOYAGE))).toHaveLength(1);
  });

  it('masque le nettoyage quotidien non fait vieux de plus de 2 jours', () => {
    const today = '2026-05-20';
    const oldNettoyage = {
      title: 'Nettoyage ancien',
      taskType: TASK_TYPE_QUOTIDIEN,
      scheduledFor: '2026-05-18',
      completed: false,
      status: 'todo',
    };
    const yesterdayNettoyage = {
      title: 'Nettoyage hier',
      taskType: TASK_TYPE_QUOTIDIEN,
      scheduledFor: '2026-05-19',
      completed: false,
      status: 'todo',
    };
    expect(dayDiffFromToday(oldNettoyage.scheduledFor, today)).toBe(2);
    expect(shouldHideStaleNettoyageTask(oldNettoyage, today)).toBe(true);
    expect(shouldHideStaleNettoyageTask(yesterdayNettoyage, today)).toBe(false);
  });
});

describe('groupTasksByDay', () => {
  const today = '2026-05-20';
  const yesterday = '2026-05-19';

  it('sépare aujourd’hui, hier et jours antérieurs', () => {
    const tasks = [
      { id: 1, scheduledFor: today, title: 'Aujourd\'hui' },
      { id: 2, scheduledFor: yesterday, title: 'Hier' },
      { id: 3, scheduledFor: '2026-05-18', title: 'Avant-hier' },
    ];
    const g = groupTasksByDay(tasks, today);
    expect(g.today).toHaveLength(1);
    expect(g.yesterday).toHaveLength(1);
    expect(g.other).toHaveLength(1);
    expect(g.yesterdayYmd).toBe(yesterday);
  });

  it('getYesterdayYmd recule d’un jour', () => {
    expect(getYesterdayYmd('2026-05-20')).toBe('2026-05-19');
  });

  it('taskScheduledDay utilise createdAt si scheduledFor absent', () => {
    expect(taskScheduledDay({ createdAt: '2026-05-19T10:00:00Z' }, today)).toBe('2026-05-19');
  });

  it('isBeforeYesterday masque les tâches avant hier', () => {
    expect(isBeforeYesterday({ scheduledFor: '2026-05-18' }, today)).toBe(true);
    expect(isBeforeYesterday({ scheduledFor: yesterday }, today)).toBe(false);
    expect(isBeforeYesterday({ scheduledFor: today }, today)).toBe(false);
  });
});

describe('summarizeDayTasks', () => {
  it('compte terminées, en cours et à faire', () => {
    const s = summarizeDayTasks([
      { status: 'done', completed: true },
      { status: 'in_progress', completed: false },
      { status: 'todo', completed: false },
    ]);
    expect(s).toEqual({
      total: 3,
      done: 1,
      inProgress: 1,
      todo: 1,
      pending: 2,
      percent: 33,
    });
  });
});

describe('displayName', () => {
  it('affiche un libellé pour les e-mails DailyDo', () => {
    expect(displayName('chez-pierre@dailydo.app')).toBe('Chez pierre');
    expect(displayName('slug@restaurant.dailydo.app')).toBe('Slug');
    expect(displayName('team@dailydo-saas.app')).toBe('Team');
  });

  it('masque les URLs et les valeurs vides', () => {
    expect(displayName('https://x.supabase.co')).toBe('Équipe');
    expect(displayName('')).toBe('');
  });
});
