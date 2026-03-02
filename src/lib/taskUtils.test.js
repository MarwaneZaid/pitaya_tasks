import { describe, it, expect } from 'vitest';

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
