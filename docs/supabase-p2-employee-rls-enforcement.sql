/**
 * Employee RLS Enforcement - P2
 * 
 * Two-tier enforcement:
 * 1. RLS policy restricts direct UPDATE to managers/owners only
 * 2. SECURITY DEFINER RPC allows employees to update status/completion/proof only
 * 
 * Uses SECURITY DEFINER helpers to avoid Sep 17 user_roles RLS bug.
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
  -- When task is not completed, clear completion fields
  IF p_completed = false OR (p_completed IS NULL AND p_status IS DISTINCT FROM 'done') THEN
    UPDATE tasks
    SET
      status = COALESCE(p_status, status),
      completed = COALESCE(p_completed, false),
      proof_note = p_proof_note,
      completed_by = NULL,
      started_at = CASE WHEN p_status IS NOT NULL THEN now() ELSE started_at END,
      completed_at = NULL
    WHERE id = p_task_id
    RETURNING * INTO v_task;
  ELSE
    -- Task is being completed
    UPDATE tasks
    SET
      status = COALESCE(p_status, status),
      completed = COALESCE(p_completed, completed),
      proof_note = p_proof_note,
      completed_by = COALESCE(p_completed_by, completed_by),
      started_at = CASE WHEN p_status IS NOT NULL THEN now() ELSE started_at END,
      completed_at = CASE WHEN p_completed = true THEN now() ELSE completed_at END
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_task_status_employee TO authenticated;

-- Drop old permissive policy
DROP POLICY IF EXISTS tasks_update_all ON public.tasks;

-- New policy: only managers/owners can UPDATE directly
-- Uses SECURITY DEFINER helper to avoid user_roles RLS issues
CREATE POLICY tasks_update_manager_owner ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT unnest(my_restaurant_ids())
    )
    AND my_role_for_restaurant(restaurant_id) IN ('manager', 'owner')
  );

COMMIT;
