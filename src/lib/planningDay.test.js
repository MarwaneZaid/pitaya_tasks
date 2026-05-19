import { describe, it, expect } from 'vitest';
import { buildQuotidienTasksForDate, weekdayKeyForDate } from './planningDay';

describe('planningDay', () => {
  it('weekdayKeyForDate maps Sunday to dimanche', () => {
    expect(weekdayKeyForDate('2026-03-15')).toBe('dimanche');
  });

  it('buildQuotidienTasksForDate skips existing titles', () => {
    const config = {
      planning: {
        lundi: [],
        mardi: [],
        mercredi: [],
        jeudi: [],
        vendredi: [],
        samedi: [],
        dimanche: [{ title: 'Nettoyage sol', priority: 'haute' }],
      },
    };
    const created = buildQuotidienTasksForDate(
      config,
      '2026-03-15',
      ['Nettoyage sol'],
      'Chef'
    );
    expect(created).toHaveLength(0);
  });

  it('buildQuotidienTasksForDate creates quotidien for date', () => {
    const config = {
      planning: {
        lundi: [],
        mardi: [],
        mercredi: [],
        jeudi: [],
        vendredi: [],
        samedi: [],
        dimanche: [{ title: 'Ouverture', priority: 'moyenne' }],
      },
    };
    const created = buildQuotidienTasksForDate(config, '2026-03-15', [], 'Chef');
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      title: 'Ouverture',
      scheduledFor: '2026-03-15',
      taskType: 'quotidien',
    });
  });
});
