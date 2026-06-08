import { describe, it, expect } from 'vitest';
import {
  checklistItemKey,
  templateAppliesOnDate,
  buildTasksFromChecklists,
} from './checklists';
import { CHECKLIST_RECURRENCE_DAILY, CHECKLIST_RECURRENCE_WEEKDAYS } from '../config/opsConstants';

describe('checklists', () => {
  const templateId = 'tpl-abc';

  it('checklistItemKey est stable pour un même titre', () => {
    const k1 = checklistItemKey(templateId, 'Contrôle frigos');
    const k2 = checklistItemKey(templateId, 'Contrôle frigos');
    expect(k1).toBe(k2);
    expect(k1.startsWith(`${templateId}:`)).toBe(true);
  });

  it('templateAppliesOnDate daily toujours vrai si actif', () => {
    expect(
      templateAppliesOnDate(
        { active: true, recurrence: CHECKLIST_RECURRENCE_DAILY },
        '2026-05-20'
      )
    ).toBe(true);
    expect(
      templateAppliesOnDate(
        { active: false, recurrence: CHECKLIST_RECURRENCE_DAILY },
        '2026-05-20'
      )
    ).toBe(false);
  });

  it('templateAppliesOnDate weekdays filtre le jour', () => {
    // 2026-05-20 = mercredi
    const tpl = {
      active: true,
      recurrence: CHECKLIST_RECURRENCE_WEEKDAYS,
      weekdayKeys: ['mercredi'],
    };
    expect(templateAppliesOnDate(tpl, '2026-05-20')).toBe(true);
    expect(
      templateAppliesOnDate(
        { ...tpl, weekdayKeys: ['lundi'] },
        '2026-05-20'
      )
    ).toBe(false);
  });

  it('buildTasksFromChecklists évite les doublons par checklistItemKey', () => {
    const templates = [
      {
        id: templateId,
        active: true,
        recurrence: CHECKLIST_RECURRENCE_DAILY,
        post: 'cuisine',
        items: [{ title: 'Nettoyage', priority: 'haute' }],
      },
    ];
    const existing = [
      { checklistItemKey: checklistItemKey(templateId, 'Nettoyage') },
    ];
    const created = buildTasksFromChecklists(
      templates,
      '2026-05-20',
      existing,
      'Manager'
    );
    expect(created).toHaveLength(0);

    const fresh = buildTasksFromChecklists(templates, '2026-05-20', [], 'Manager');
    expect(fresh).toHaveLength(1);
    expect(fresh[0].title).toBe('Nettoyage');
    expect(fresh[0].scheduledFor).toBe('2026-05-20');
    expect(fresh[0].checklistId).toBe(templateId);
  });
});
