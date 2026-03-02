import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyAnnexeRollover } from './taskRollover';

describe('applyAnnexeRollover', () => {
  const today = '2025-02-12';
  const yesterday = '2025-02-11';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-12T10:00:00Z'));
  });

  it('ne modifie rien si aucune tâche annexe à reporter', () => {
    const tasks = [
      { id: 1, title: 'Nettoyer sol', taskType: 'quotidien', completed: false, scheduledFor: today },
      { id: 2, title: 'Vérifier stock', taskType: 'annexe', completed: false, scheduledFor: today },
    ];
    const { tasks: result, changed } = applyAnnexeRollover(tasks, today);
    expect(changed).toBe(false);
    expect(result).toHaveLength(2);
    expect(result).toEqual(tasks);
  });

  it('reporte les tâches annexes non faites programmées avant aujourd\'hui', () => {
    const tasks = [
      { id: 1, title: 'Commander fournitures', taskType: 'annexe', completed: false, scheduledFor: yesterday },
      { id: 2, title: 'Réunion équipe', taskType: 'annexe', completed: false, scheduledFor: '2025-02-10' },
    ];
    const { tasks: result, changed } = applyAnnexeRollover(tasks, today);
    expect(changed).toBe(true);
    expect(result).toHaveLength(2);
    const annexes = result.filter((t) => t.taskType === 'annexe');
    expect(annexes).toHaveLength(2);
    annexes.forEach((t) => {
      expect(t.scheduledFor).toBe(today);
      expect(t.completed).toBe(false);
      expect(t.completedAt).toBeNull();
    });
    expect(annexes.map((t) => t.title)).toContain('Commander fournitures');
    expect(annexes.map((t) => t.title)).toContain('Réunion équipe');
  });

  it('ne reporte pas les tâches annexes déjà complétées', () => {
    const tasks = [
      { id: 1, title: 'Commander fournitures', taskType: 'annexe', completed: true, scheduledFor: yesterday, completedAt: '2025-02-11T14:00:00Z' },
    ];
    const { tasks: result, changed } = applyAnnexeRollover(tasks, today);
    expect(changed).toBe(false);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].completed).toBe(true);
  });

  it('ne reporte pas les tâches quotidien ou semaine même si en retard', () => {
    const tasks = [
      { id: 1, title: 'Nettoyage cuisine', taskType: 'quotidien', completed: false, scheduledFor: yesterday },
      { id: 2, title: 'Inventaire', taskType: 'semaine', completed: false, scheduledFor: yesterday },
    ];
    const { tasks: result, changed } = applyAnnexeRollover(tasks, today);
    expect(changed).toBe(false);
    expect(result).toHaveLength(2);
    expect(result[0].scheduledFor).toBe(yesterday);
    expect(result[1].scheduledFor).toBe(yesterday);
  });

  it('utilise createdAt si scheduledFor est absent pour une annexe', () => {
    const tasks = [
      { id: 1, title: 'Rappeler fournisseur', taskType: 'annexe', completed: false, createdAt: '2025-02-10T09:00:00Z' },
    ];
    const { tasks: result, changed } = applyAnnexeRollover(tasks, today);
    expect(changed).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].scheduledFor).toBe(today);
    expect(result[0].title).toBe('Rappeler fournisseur');
  });

  it('enlève le suffixe "(reportée)" du titre lors du report', () => {
    const tasks = [
      { id: 1, title: 'Commander fournitures (reportée)', taskType: 'annexe', completed: false, scheduledFor: yesterday },
    ];
    const { tasks: result, changed } = applyAnnexeRollover(tasks, today);
    expect(changed).toBe(true);
    expect(result[0].title).toBe('Commander fournitures');
  });

  it('mélange tâches à garder et annexes à reporter', () => {
    const tasks = [
      { id: 10, title: 'Ouverture', taskType: 'quotidien', completed: false, scheduledFor: today },
      { id: 20, title: 'Commander gaz', taskType: 'annexe', completed: false, scheduledFor: yesterday },
      { id: 30, title: 'Fermeture', taskType: 'quotidien', completed: true, scheduledFor: today },
    ];
    const { tasks: result, changed } = applyAnnexeRollover(tasks, today);
    expect(changed).toBe(true);
    expect(result).toHaveLength(3);
    const quotidien = result.filter((t) => t.taskType === 'quotidien');
    expect(quotidien).toHaveLength(2);
    const annexe = result.filter((t) => t.taskType === 'annexe');
    expect(annexe).toHaveLength(1);
    expect(annexe[0].scheduledFor).toBe(today);
    expect(annexe[0].title).toBe('Commander gaz');
  });

  it('liste vide ne change pas', () => {
    const { tasks: result, changed } = applyAnnexeRollover([], today);
    expect(changed).toBe(false);
    expect(result).toHaveLength(0);
  });
});
