import { describe, it, expect } from 'vitest';
import {
  TASK_TYPE_QUOTIDIEN,
  TASK_TYPE_ANNEXE,
  TASK_TYPE_SEMAINE,
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  FILTER_OPTIONS,
  STORAGE_KEY,
  USER_NAME_KEY,
} from './constants';

describe('constants', () => {
  describe('TASK_TYPE_*', () => {
    it('définit les 3 types de tâches', () => {
      expect(TASK_TYPE_QUOTIDIEN).toBe('quotidien');
      expect(TASK_TYPE_ANNEXE).toBe('annexe');
      expect(TASK_TYPE_SEMAINE).toBe('semaine');
    });

    it('TASK_TYPE_LABELS a un libellé pour chaque type', () => {
      expect(TASK_TYPE_LABELS[TASK_TYPE_QUOTIDIEN]).toBe('Quotidien obligatoire');
      expect(TASK_TYPE_LABELS[TASK_TYPE_ANNEXE]).toBe('Annexe');
      expect(TASK_TYPE_LABELS[TASK_TYPE_SEMAINE]).toBe('À faire dans la semaine');
    });

    it('TASK_TYPE_COLORS a une classe pour chaque type', () => {
      expect(TASK_TYPE_COLORS[TASK_TYPE_QUOTIDIEN]).toContain('red');
      expect(TASK_TYPE_COLORS[TASK_TYPE_ANNEXE]).toContain('orange');
      expect(TASK_TYPE_COLORS[TASK_TYPE_SEMAINE]).toContain('green');
    });
  });

  describe('FILTER_OPTIONS', () => {
    it('contient Toutes + 3 catégories (quotidien, annexe, semaine)', () => {
      expect(FILTER_OPTIONS).toHaveLength(4);
      expect(FILTER_OPTIONS.map((f) => f.id)).toEqual(['all', 'quotidien', 'annexe', 'semaine']);
    });

    it('all n\'a pas de couleur, les 3 autres ont red/orange/green', () => {
      expect(FILTER_OPTIONS[0].color).toBeUndefined();
      expect(FILTER_OPTIONS[1].color).toBe('red');
      expect(FILTER_OPTIONS[2].color).toBe('orange');
      expect(FILTER_OPTIONS[3].color).toBe('green');
    });
  });

  describe('storage keys', () => {
    it('STORAGE_KEY et USER_NAME_KEY sont des chaînes non vides', () => {
      expect(typeof STORAGE_KEY).toBe('string');
      expect(STORAGE_KEY.length).toBeGreaterThan(0);
      expect(typeof USER_NAME_KEY).toBe('string');
      expect(USER_NAME_KEY.length).toBeGreaterThan(0);
    });
  });
});
