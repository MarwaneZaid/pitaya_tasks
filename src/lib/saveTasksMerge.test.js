import { describe, it, expect } from 'vitest';
import { mergeTasksWithUpsertRows } from './saveTasksMerge';

const basePayload = (overrides) => ({
  restaurant_id: 'r1',
  title: 'T',
  category: 'nettoyage',
  priority: 'moyenne',
  task_type: 'quotidien',
  scheduled_for: '2025-02-12',
  assigned_to: null,
  completed: false,
  created_by: 'u',
  completed_at: null,
  completed_by: null,
  ...overrides,
});

describe('mergeTasksWithUpsertRows', () => {
  it('apparie les mises à jour par id même si les rows sont dans le désordre', () => {
    const tasks = [
      { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeaaaa', title: 'A', taskType: 'quotidien', scheduledFor: '2025-02-12' },
      { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeebbbb', title: 'B', taskType: 'quotidien', scheduledFor: '2025-02-12' },
    ];
    const payload = [
      basePayload({ id: tasks[0].id, title: 'A', scheduled_for: '2025-02-12' }),
      basePayload({ id: tasks[1].id, title: 'B', scheduled_for: '2025-02-12' }),
    ];
    const rows = [
      { id: tasks[1].id, title: 'B', category: 'nettoyage', priority: 'moyenne', task_type: 'quotidien', scheduled_for: '2025-02-12', assigned_to: null, completed: false },
      { id: tasks[0].id, title: 'A', category: 'nettoyage', priority: 'moyenne', task_type: 'quotidien', scheduled_for: '2025-02-12', assigned_to: null, completed: false },
    ];
    const out = mergeTasksWithUpsertRows(tasks, payload, rows);
    expect(out[0].id).toBe(tasks[0].id);
    expect(out[1].id).toBe(tasks[1].id);
  });

  it('apparie les inserts sans id par signature (ordre des rows permuté)', () => {
    const tasks = [
      { title: 'Première', taskType: 'annexe', scheduledFor: '2025-02-12' },
      { title: 'Deuxième', taskType: 'annexe', scheduledFor: '2025-02-12' },
    ];
    const payload = [
      basePayload({ title: 'Première', task_type: 'annexe', scheduled_for: '2025-02-12' }),
      basePayload({ title: 'Deuxième', task_type: 'annexe', scheduled_for: '2025-02-12' }),
    ];
    const rows = [
      { id: 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz', title: 'Deuxième', category: 'nettoyage', priority: 'moyenne', task_type: 'annexe', scheduled_for: '2025-02-12', assigned_to: null, completed: false },
      { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', title: 'Première', category: 'nettoyage', priority: 'moyenne', task_type: 'annexe', scheduled_for: '2025-02-12', assigned_to: null, completed: false },
    ];
    const out = mergeTasksWithUpsertRows(tasks, payload, rows);
    expect(out[0].id).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(out[1].id).toBe('zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz');
  });

  it('distribue plusieurs lignes à signature identique par ordre d’index et id trié', () => {
    const tasks = [
      { title: 'Même', taskType: 'quotidien', scheduledFor: '2025-02-12' },
      { title: 'Même', taskType: 'quotidien', scheduledFor: '2025-02-12' },
    ];
    const payload = [
      basePayload({ title: 'Même', scheduled_for: '2025-02-12' }),
      basePayload({ title: 'Même', scheduled_for: '2025-02-12' }),
    ];
    const rows = [
      { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', title: 'Même', category: 'nettoyage', priority: 'moyenne', task_type: 'quotidien', scheduled_for: '2025-02-12', assigned_to: null, completed: false },
      { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', title: 'Même', category: 'nettoyage', priority: 'moyenne', task_type: 'quotidien', scheduled_for: '2025-02-12', assigned_to: null, completed: false },
    ];
    const out = mergeTasksWithUpsertRows(tasks, payload, rows);
    expect(out[0].id).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(out[1].id).toBe('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  });
});
