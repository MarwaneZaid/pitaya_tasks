/**
 * Employee RLS Enforcement - P2
 * 
 * Two-tier enforcement:
 * 1. RLS policy restricts direct UPDATE to managers/owners only
 * 2. SECURITY DEFINER RPC allows employees to update status/completion/proof only
 * 
 * Uses SECURITY DEFINER helpers to avoid Sep 17 user_roles RLS bug.
 * Idempotent: safe to run multiple times.
 */

BEGIN;

-- Helper: Get user's role for a specific restaurant (SECURITY DEFINER to bypass user_roles RLS)
CREATE OR REPLACE FUNCTION public.my_role_for_restaurant(p_restaurant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM user_roles
  WHERE user_id = auth.uid()
    AND restaurant_id = p_restaurant_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_role_for_restaurant(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_role_for_restaurant(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.my_role_for_restaurant(uuid) TO authenticated;

-- Employee task status update RPC (SECURITY DEFINER, field-restricted)
CREATE OR REPLACE FUNCTION public.update_task_status_employee(
  p_task_id uuid,
  p_status text DEFAULT NULL,
  p_completed boolean DEFAULT NULL,
  p_proof_note text DEFAULT NULL,
  p_completed_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_user_role text;
  v_task tasks%ROWTYPE;
BEGIN
  -- Get task's restaurant
  SELECT restaurant_id INTO v_restaurant_id
  FROM tasks
  WHERE id = p_task_id;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Tâche introuvable';
  END IF;

  -- Check user is member of this restaurant
  v_user_role := my_role_for_restaurant(v_restaurant_id);
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Accès refusé : vous n''êtes pas membre de ce restaurant';
  END IF;

  -- Update only allowed fields
  -- Match old client semantics: clear completion fields when undoing, set started_at only on first in_progress
  IF p_completed = false OR (p_completed IS NULL AND p_status IS DISTINCT FROM 'done') THEN
    -- Task is being undone or moved away from done
    UPDATE tasks
    SET
      status = COALESCE(p_status, status),
      completed = false,
      proof_note = p_proof_note,
      completed_by = NULL,
      completed_at = NULL,
      started_at = CASE 
        WHEN p_status = 'in_progress' AND started_at IS NULL THEN now()
        ELSE started_at
      END
    WHERE id = p_task_id
    RETURNING * INTO v_task;
  ELSE
    -- Task is being completed or status updated while still done
    UPDATE tasks
    SET
      status = COALESCE(p_status, status),
      completed = COALESCE(p_completed, completed),
      proof_note = p_proof_note,
      completed_by = COALESCE(p_completed_by, completed_by),
      completed_at = CASE 
        WHEN p_completed = true AND completed_at IS NULL THEN now()
        ELSE completed_at
      END,
      started_at = CASE 
        WHEN p_status = 'in_progress' AND started_at IS NULL THEN now()
        ELSE started_at
      END
    WHERE id = p_task_id
    RETURNING * INTO v_task;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Échec de la mise à jour';
  END IF;

  -- Return proper jsonb with real keys
  RETURN jsonb_build_object(
    'id', v_task.id,
    'status', v_task.status,
    'completed', v_task.completed,
    'proof_note', v_task.proof_note,
    'completed_by', v_task.completed_by,
    'completed_at', v_task.completed_at,
    'started_at', v_task.started_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_task_status_employee(uuid, text, boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_task_status_employee(uuid, text, boolean, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_task_status_employee(uuid, text, boolean, text, text) TO authenticated;

-- Drop old permissive policy
DROP POLICY IF EXISTS tasks_update_all ON public.tasks;

-- New policy: only managers/owners can UPDATE directly
-- Uses SECURITY DEFINER helper to avoid user_roles RLS issues
DROP POLICY IF EXISTS tasks_update_manager_owner ON public.tasks;
CREATE POLICY tasks_update_manager_owner ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    restaurant_id IN (SELECT public.my_restaurant_ids())
    AND my_role_for_restaurant(restaurant_id) IN ('manager', 'owner')
  );

COMMIT;
