-- =============================================================================
-- DailyDo P2 — Employee update enforcement via RLS + RPC (idempotent)
-- =============================================================================
-- À exécuter APRÈS docs/supabase-p1-team-deadline.sql
--
-- Problème : l'ancienne politique tasks_update_all permettait à tous les utilisateurs
-- authentifiés de modifier n'importe quel champ. La protection employé reposait uniquement
-- sur le trigger protect_task_employee_update, ce qui créait un point de défaillance unique.
--
-- Solution :
--   1. RLS : seuls managers/owners peuvent UPDATE via requêtes directes
--   2. Employés utilisent update_task_status_employee() RPC qui ne modifie que
--      status, completed, proof_note, completed_by, started_at, completed_at
--
-- Le trigger reste actif comme défense en profondeur.
-- =============================================================================

BEGIN;

-- ── Helper : obtenir le rôle de l'utilisateur pour un restaurant ──────────────

CREATE OR REPLACE FUNCTION public.my_role_for_restaurant(p_restaurant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid()
    AND restaurant_id = p_restaurant_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_role_for_restaurant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_role_for_restaurant(uuid) TO authenticated;

-- ── RPC : employee update (status, completion, proof only) ────────────────────

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
  v_uid uuid := auth.uid();
  v_role text;
  v_restaurant_id uuid;
  v_updated_task jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Get task's restaurant and verify user has access
  SELECT restaurant_id INTO v_restaurant_id
  FROM public.tasks
  WHERE id = p_task_id;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Tâche introuvable';
  END IF;

  -- Verify user is member of this restaurant
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = v_uid
    AND restaurant_id = v_restaurant_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Accès refusé : vous n''êtes pas membre de ce restaurant';
  END IF;

  -- Update only allowed fields based on status
  -- Use explicit values, not COALESCE, to allow setting NULL
  UPDATE public.tasks
  SET
    status = CASE WHEN p_status IS NOT NULL THEN p_status ELSE status END,
    completed = CASE WHEN p_completed IS NOT NULL THEN p_completed ELSE completed END,
    proof_note = CASE WHEN p_proof_note IS NOT NULL THEN p_proof_note ELSE proof_note END,
    completed_by = CASE 
      WHEN p_completed_by IS NOT NULL THEN p_completed_by
      WHEN p_status = 'done' OR p_completed = true THEN completed_by
      ELSE completed_by
    END,
    completed_at = CASE
      WHEN (p_status = 'done' OR p_completed = true) AND completed_at IS NULL THEN now()
      ELSE completed_at
    END,
    started_at = CASE
      WHEN p_status = 'in_progress' AND started_at IS NULL THEN now()
      ELSE started_at
    END
  WHERE id = p_task_id
    AND restaurant_id = v_restaurant_id
  RETURNING to_jsonb(row(id, status, completed, proof_note, completed_by, completed_at, started_at)) INTO v_updated_task;

  IF v_updated_task IS NULL THEN
    RAISE EXCEPTION 'Mise à jour échouée';
  END IF;

  RETURN v_updated_task;
END;
$$;

REVOKE ALL ON FUNCTION public.update_task_status_employee(uuid, text, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_task_status_employee(uuid, text, boolean, text, text) TO authenticated;

-- ── RLS : Replace tasks_update_all with manager-only policy ────────────────────

DROP POLICY IF EXISTS "tasks_update_all" ON public.tasks;

-- Managers and owners can update all fields
-- Note: Must use subquery that doesn't reference tasks table in USING clause
DROP POLICY IF EXISTS "tasks_update_manager_owner" ON public.tasks;
CREATE POLICY "tasks_update_manager_owner"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('manager', 'owner')
    )
  );

-- ── SELECT policy unchanged (all authenticated members) ────────────────────────

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

COMMIT;

-- =============================================================================
-- Vérification post-migration :
--
-- 1. Employé tente UPDATE direct sur titre :
--    SET test.auth_uid = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
--    UPDATE tasks SET title = 'Hack' WHERE id = '...';
--    → Doit échouer avec « new row violates row-level security policy »
--
-- 2. Employé appelle RPC pour changer statut :
--    SELECT update_task_status_employee('...', 'done', true, 'Finished', 'Employee Name');
--    → Doit réussir et retourner les champs mis à jour
--
-- 3. Manager UPDATE direct (tous les champs) :
--    SET test.auth_uid = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
--    UPDATE tasks SET title = 'New Title', deadline = now() WHERE id = '...';
--    → Doit réussir
--
-- 4. Cross-restaurant : employé du restaurant 2 tente accès restaurant 1 :
--    SET test.auth_uid = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
--    SELECT update_task_status_employee('...' (task from restaurant 1), ...);
--    → Doit échouer avec « Accès refusé »
--
-- Note : le trigger protect_task_employee_update reste actif comme défense
-- en profondeur (empêche UPDATE direct même si la politique RLS échoue).
-- =============================================================================
