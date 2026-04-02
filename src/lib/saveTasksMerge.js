/** Champs stables pour apparier une ligne renvoyée par upsert à une entrée du batch (ordre non garanti côté API). */
function upsertBatchMatchKey(p) {
  return [
    p.title ?? '',
    String(p.scheduled_for ?? ''),
    p.task_type ?? '',
    p.category ?? '',
    p.priority ?? '',
    String(!!p.completed),
    p.assigned_to == null ? '' : String(p.assigned_to),
  ].join('\x1e');
}

/**
 * Réconcilie les tâches front avec les lignes renvoyées par un upsert groupé sans supposer l’ordre des rows.
 * @param {object[]} tasksArray
 * @param {object[]} payload - lignes snake_case envoyées à Supabase
 * @param {object[]|null} rows - réponse .select()
 */
export function mergeTasksWithUpsertRows(tasksArray, payload, rows) {
  const list = Array.isArray(rows) ? rows : [];
  const byId = new Map(list.map((r) => [r.id, r]));
  const usedRowIds = new Set();
  /** @type {Map<number, string>} */
  const indexToRowId = new Map();

  for (let i = 0; i < tasksArray.length; i++) {
    const pid = payload[i].id;
    if (pid && byId.has(pid)) {
      indexToRowId.set(i, pid);
      usedRowIds.add(pid);
    }
  }

  /** @type {Map<string, object[]>} */
  const rowQueues = new Map();
  for (const r of list) {
    if (usedRowIds.has(r.id)) continue;
    const k = upsertBatchMatchKey(r);
    if (!rowQueues.has(k)) rowQueues.set(k, []);
    rowQueues.get(k).push(r);
  }
  for (const q of rowQueues.values()) {
    q.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }

  for (let i = 0; i < tasksArray.length; i++) {
    if (indexToRowId.has(i)) continue;
    const k = upsertBatchMatchKey(payload[i]);
    const q = rowQueues.get(k);
    if (q?.length) {
      const r = q.shift();
      indexToRowId.set(i, r.id);
    }
  }

  return tasksArray.map((task, i) => {
    const id = indexToRowId.get(i);
    return id ? { ...task, id } : task;
  });
}
