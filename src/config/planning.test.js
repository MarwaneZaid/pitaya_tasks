import { describe, it, expect } from 'vitest';
import { PLANNING_NETTOYAGE, JOURS } from './planning';

describe('planning', () => {
  describe('JOURS', () => {
    it('contient 7 jours dans l\'ordre dimanche -> samedi', () => {
      expect(JOURS).toHaveLength(7);
      expect(JOURS[0]).toBe('dimanche');
      expect(JOURS[6]).toBe('samedi');
      expect(JOURS).toContain('lundi');
      expect(JOURS).toContain('vendredi');
    });
  });

  describe('PLANNING_NETTOYAGE', () => {
    it('a une entrée pour chaque jour', () => {
      JOURS.forEach((jour) => {
        expect(PLANNING_NETTOYAGE).toHaveProperty(jour);
        expect(Array.isArray(PLANNING_NETTOYAGE[jour])).toBe(true);
      });
    });

    it('samedi a 0 tâche', () => {
      expect(PLANNING_NETTOYAGE.samedi).toEqual([]);
    });

    it('lundi a au moins une tâche avec priority haute', () => {
      const lundi = PLANNING_NETTOYAGE.lundi;
      expect(lundi.length).toBeGreaterThan(0);
      const haute = lundi.filter((t) => t.priority === 'haute');
      expect(haute.length).toBeGreaterThan(0);
    });

    it('chaque tâche a title et priority', () => {
      JOURS.forEach((jour) => {
        PLANNING_NETTOYAGE[jour].forEach((t) => {
          expect(t).toHaveProperty('title');
          expect(typeof t.title).toBe('string');
          expect(t.title.length).toBeGreaterThan(0);
          expect(t).toHaveProperty('priority');
          expect(['haute', 'moyenne', 'basse']).toContain(t.priority);
        });
      });
    });
  });
});
