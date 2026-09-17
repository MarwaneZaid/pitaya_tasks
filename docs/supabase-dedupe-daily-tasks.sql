-- =============================================================================
-- Dedup tâches quotidiennes + index uniques (idempotent)
-- Déjà appliqué sur dailydo-saas.
-- =============================================================================

-- Doublons planning (même resto / jour / titre, hors checklist)
DELETE FROM public.tasks
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY restaurant_id, scheduled_for, title
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM public.tasks
    WHERE checklist_item_key IS NULL
      AND task_type = 'quotidien'
  ) d
  WHERE rn > 1
);

-- Doublons checklist (même clé item / jour)
DELETE FROM public.tasks
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY restaurant_id, scheduled_for, checklist_item_key
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM public.tasks
    WHERE checklist_item_key IS NOT NULL
  ) d
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_unique_checklist_day
  ON public.tasks (restaurant_id, scheduled_for, checklist_item_key)
  WHERE checklist_item_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_unique_quotidien_day_title
  ON public.tasks (restaurant_id, scheduled_for, title)
  WHERE checklist_item_key IS NULL AND task_type = 'quotidien';
