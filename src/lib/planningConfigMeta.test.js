import { describe, it, expect } from 'vitest';
import { hasPersistedPlanningTemplates, toPersistablePlanningConfig } from './planningConfigMeta.js';

describe('planningConfigMeta', () => {
  it('hasPersistedPlanningTemplates', () => {
    expect(hasPersistedPlanningTemplates(undefined)).toBe(false);
    expect(hasPersistedPlanningTemplates(null)).toBe(false);
    expect(hasPersistedPlanningTemplates([])).toBe(false);
    expect(hasPersistedPlanningTemplates([{ day_of_week: 'lundi' }])).toBe(true);
  });

  it('toPersistablePlanningConfig ne garde que siteName, planning, annexes', () => {
    const x = toPersistablePlanningConfig({
      siteName: 'Brasserie',
      planning: { lundi: [{ title: 'Mop', priority: 'basse' }] },
      annexes: [{ title: 'Frigo', priority: 'moyenne' }],
      hasPersistedPlanning: true,
      extra: 'drop-me',
    });
    expect(x).toEqual({
      siteName: 'Brasserie',
      planning: { lundi: [{ title: 'Mop', priority: 'basse' }] },
      annexes: [{ title: 'Frigo', priority: 'moyenne' }],
    });
    expect('hasPersistedPlanning' in x).toBe(false);
  });
});
