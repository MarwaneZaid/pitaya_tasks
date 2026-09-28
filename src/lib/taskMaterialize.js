/**
 * Task materialization logic for duplicate detection and reload
 */

/**
 * Determine if we need to reload tasks from DB after materialization
 * @param {Array} savedTasks - Tasks returned from saveTasks()
 * @param {boolean} checklistSuccess - Whether checklist materialization succeeded
 * @returns {boolean} - true if reload needed
 */
export function shouldReloadAfterMaterialize(savedTasks, checklistSuccess) {
  // If no tasks were saved but we expected them, likely hit duplicate constraint
  const hasDuplicateCollision = Array.isArray(savedTasks) && savedTasks.length === 0;
  
  // If checklist generation failed, reload to get any partial success
  const checklistFailed = !checklistSuccess;
  
  return hasDuplicateCollision || checklistFailed;
}

/**
 * Merge reloaded tasks with existing tasks, preferring existing
 * @param {Array} existingTasks - Current tasks in state
 * @param {Array} reloadedTasks - Tasks fetched from DB
 * @returns {Array} - Merged task list
 */
export function mergeTasks(existingTasks, reloadedTasks) {
  if (!Array.isArray(existingTasks)) return reloadedTasks || [];
  if (!Array.isArray(reloadedTasks)) return existingTasks;
  
  const existingIds = new Set(existingTasks.map((t) => t.id));
  const newTasks = reloadedTasks.filter((t) => !existingIds.has(t.id));
  
  return [...existingTasks, ...newTasks];
}
