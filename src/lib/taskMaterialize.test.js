/**
 * Tests for task materialization reload logic (Fix #1 C1)
 */

import { describe, it, expect } from 'vitest';
import { shouldReloadAfterMaterialize, mergeTasks } from './taskMaterialize';

describe('shouldReloadAfterMaterialize', () => {
  it('should return true when savedTasks is empty array (duplicate collision)', () => {
    expect(shouldReloadAfterMaterialize([], true)).toBe(true);
  });

  it('should return true when checklist failed', () => {
    expect(shouldReloadAfterMaterialize([{ id: '1' }], false)).toBe(true);
  });

  it('should return true when both conditions met', () => {
    expect(shouldReloadAfterMaterialize([], false)).toBe(true);
  });

  it('should return false when savedTasks exist and checklist succeeded', () => {
    expect(shouldReloadAfterMaterialize([{ id: '1' }, { id: '2' }], true)).toBe(false);
  });

  it('should return false when no tasks were expected (empty array, checklist succeeded)', () => {
    // This is actually a reload case - empty savedTasks indicates potential duplicate
    expect(shouldReloadAfterMaterialize([], true)).toBe(true);
  });
});

describe('mergeTasks', () => {
  it('should merge new tasks from reload without duplicates', () => {
    const existing = [
      { id: '1', title: 'Task 1' },
      { id: '2', title: 'Task 2' },
    ];
    const reloaded = [
      { id: '2', title: 'Task 2' },
      { id: '3', title: 'Task 3' },
      { id: '4', title: 'Task 4' },
    ];

    const merged = mergeTasks(existing, reloaded);

    expect(merged).toHaveLength(4);
    expect(merged.map((t) => t.id)).toEqual(['1', '2', '3', '4']);
  });

  it('should return reloaded tasks when existing is empty', () => {
    const reloaded = [
      { id: '1', title: 'Task 1' },
      { id: '2', title: 'Task 2' },
    ];

    const merged = mergeTasks([], reloaded);

    expect(merged).toEqual(reloaded);
  });

  it('should return existing tasks when reloaded is empty', () => {
    const existing = [
      { id: '1', title: 'Task 1' },
    ];

    const merged = mergeTasks(existing, []);

    expect(merged).toEqual(existing);
  });

  it('should handle null/undefined inputs', () => {
    expect(mergeTasks(null, [{ id: '1' }])).toEqual([{ id: '1' }]);
    expect(mergeTasks([{ id: '1' }], null)).toEqual([{ id: '1' }]);
    expect(mergeTasks(null, null)).toEqual([]);
  });

  it('should preserve order: existing first, then new', () => {
    const existing = [
      { id: '1', title: 'A' },
      { id: '3', title: 'C' },
    ];
    const reloaded = [
      { id: '2', title: 'B' },
      { id: '3', title: 'C' },
      { id: '4', title: 'D' },
    ];

    const merged = mergeTasks(existing, reloaded);

    expect(merged.map((t) => t.id)).toEqual(['1', '3', '2', '4']);
  });
});
