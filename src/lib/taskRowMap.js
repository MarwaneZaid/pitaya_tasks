import { statusFromDbRow } from './taskStatus';

/** Mappe des lignes PostgREST `tasks` vers le modèle UI. */
export function mapTaskRows(data) {
  return (data || []).map((t) => {
    const status = statusFromDbRow(t);
    return {
      id: t.id,
      title: t.title,
      category: t.category,
      priority: t.priority,
      taskType: t.task_type,
      scheduledFor: t.scheduled_for,
      assignedTo: t.assigned_to,
      deadline: t.deadline || null,
      status,
      completed: status === 'done' || !!t.completed,
      post: t.post || null,
      checklistId: t.checklist_id || null,
      checklistItemKey: t.checklist_item_key || null,
      startedAt: t.started_at || null,
      proofNote: t.proof_note || null,
      createdAt: t.created_at,
      createdBy: t.created_by,
      completedAt: t.completed_at,
      completedBy: t.completed_by,
    };
  });
}
