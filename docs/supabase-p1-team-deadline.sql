-- =============================================================================
-- DailyDo P1 — display names, deadlines, promote manager (idempotent)
-- Déjà appliqué sur dailydo-saas via migration MCP ; garder pour nouveaux projets.
-- =============================================================================

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS display_name text;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS deadline timestamptz;

CREATE INDEX IF NOT EXISTS idx_tasks_restaurant_deadline
  ON public.tasks (restaurant_id, deadline)
  WHERE deadline IS NOT NULL;

CREATE OR REPLACE FUNCTION public.protect_task_employee_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
    AND restaurant_id = OLD.restaurant_id
  LIMIT 1;

  IF v_role = 'employee' THEN
    IF NEW.restaurant_id IS DISTINCT FROM OLD.restaurant_id
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.category IS DISTINCT FROM OLD.category
       OR NEW.priority IS DISTINCT FROM OLD.priority
       OR NEW.task_type IS DISTINCT FROM OLD.task_type
       OR NEW.scheduled_for IS DISTINCT FROM OLD.scheduled_for
       OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.deadline IS DISTINCT FROM OLD.deadline
       OR NEW.post IS DISTINCT FROM OLD.post
       OR NEW.checklist_id IS DISTINCT FROM OLD.checklist_id
       OR NEW.checklist_item_key IS DISTINCT FROM OLD.checklist_item_key
    THEN
      NEW.restaurant_id := OLD.restaurant_id;
      NEW.title := OLD.title;
      NEW.category := OLD.category;
      NEW.priority := OLD.priority;
      NEW.task_type := OLD.task_type;
      NEW.scheduled_for := OLD.scheduled_for;
      NEW.assigned_to := OLD.assigned_to;
      NEW.created_by := OLD.created_by;
      NEW.deadline := OLD.deadline;
      NEW.post := OLD.post;
      NEW.checklist_id := OLD.checklist_id;
      NEW.checklist_item_key := OLD.checklist_item_key;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_my_display_name(p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  v_clean := nullif(trim(p_name), '');
  IF v_clean IS NULL OR char_length(v_clean) < 2 THEN
    RAISE EXCEPTION 'Nom trop court (2 caractères minimum)';
  END IF;
  IF char_length(v_clean) > 40 THEN
    v_clean := left(v_clean, 40);
  END IF;

  UPDATE public.user_roles
  SET display_name = v_clean
  WHERE user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucun restaurant associé';
  END IF;

  RETURN v_clean;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_member_role(p_user_id uuid, p_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_my_role text;
  v_resto uuid;
  v_target_role text;
  v_target_resto uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  IF p_user_id IS NULL OR p_user_id = v_uid THEN
    RAISE EXCEPTION 'Action invalide';
  END IF;
  IF p_role NOT IN ('manager', 'employee') THEN
    RAISE EXCEPTION 'Rôle invalide (manager ou employee)';
  END IF;

  SELECT role, restaurant_id INTO v_my_role, v_resto
  FROM public.user_roles
  WHERE user_id = v_uid
  LIMIT 1;

  IF v_my_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Seul le gérant peut changer les rôles';
  END IF;

  SELECT role, restaurant_id INTO v_target_role, v_target_resto
  FROM public.user_roles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_target_resto IS NULL OR v_target_resto IS DISTINCT FROM v_resto THEN
    RAISE EXCEPTION 'Membre introuvable';
  END IF;
  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Impossible de modifier le gérant';
  END IF;

  UPDATE public.user_roles
  SET role = p_role
  WHERE user_id = p_user_id
    AND restaurant_id = v_resto;

  RETURN jsonb_build_object('user_id', p_user_id, 'role', p_role);
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_display_name(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_member_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_display_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_member_role(uuid, text) TO authenticated;
