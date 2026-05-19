import { describe, it, expect } from 'vitest';
import {
  formatDateYMD,
  getMonthGridCells,
  getMonthRange,
  parseDateYMD,
} from './calendarUtils';

describe('calendarUtils', () => {
  it('formatDateYMD pads month and day', () => {
    expect(formatDateYMD(2026, 0, 5)).toBe('2026-01-05');
  });

  it('parseDateYMD round-trips', () => {
    expect(parseDateYMD('2026-03-15')).toEqual({ year: 2026, monthIndex: 2, day: 15 });
  });

  it('getMonthRange returns inclusive bounds', () => {
    expect(getMonthRange(2026, 1)).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('getMonthGridCells starts on Monday', () => {
    const cells = getMonthGridCells(2026, 2);
    const firstDay = cells.find((c) => c !== null);
    expect(firstDay).toBe('2026-03-01');
    expect(cells[0]).toBeNull();
  });
});
