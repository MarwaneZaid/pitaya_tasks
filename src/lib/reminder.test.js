import { describe, it, expect } from 'vitest';
import { shouldShowEndOfDayReminder } from './reminder';

describe('shouldShowEndOfDayReminder', () => {
  it('affiche le rappel après 18h avec des tâches en attente', () => {
    expect(shouldShowEndOfDayReminder(18, 3, false, false)).toBe(true);
    expect(shouldShowEndOfDayReminder(19, 1, false, false)).toBe(true);
    expect(shouldShowEndOfDayReminder(23, 5, false, false)).toBe(true);
  });

  it('n\'affiche pas le rappel avant 18h', () => {
    expect(shouldShowEndOfDayReminder(17, 5, false, false)).toBe(false);
    expect(shouldShowEndOfDayReminder(12, 3, false, false)).toBe(false);
    expect(shouldShowEndOfDayReminder(0, 2, false, false)).toBe(false);
  });

  it('n\'affiche pas le rappel si aucune tâche en attente', () => {
    expect(shouldShowEndOfDayReminder(18, 0, false, false)).toBe(false);
    expect(shouldShowEndOfDayReminder(20, 0, false, false)).toBe(false);
  });

  it('n\'affiche pas le rappel si l\'utilisateur l\'a fermé', () => {
    expect(shouldShowEndOfDayReminder(18, 5, true, false)).toBe(false);
    expect(shouldShowEndOfDayReminder(22, 1, true, false)).toBe(false);
  });

  it('n\'affiche pas le rappel pendant le chargement', () => {
    expect(shouldShowEndOfDayReminder(18, 5, false, true)).toBe(false);
    expect(shouldShowEndOfDayReminder(20, 3, false, true)).toBe(false);
  });

  it('combinaisons : rappel uniquement à 18h+, pending > 0, non dismissé, pas loading', () => {
    expect(shouldShowEndOfDayReminder(18, 1, false, false)).toBe(true);
    expect(shouldShowEndOfDayReminder(18, 1, true, false)).toBe(false);
    expect(shouldShowEndOfDayReminder(18, 0, false, false)).toBe(false);
    expect(shouldShowEndOfDayReminder(17, 1, false, false)).toBe(false);
  });
});
