-- =============================================================================
-- DailyDo P0 hardening (idempotent)
-- À exécuter dans le SQL Editor Supabase APRÈS docs/supabase-dailydo-complete-fix.sql
-- (+ phase1 ops si checklists déjà en prod).
--
-- Contenu :
-- 1) Helper my_restaurant_ids() (alignement phase1)
-- 2) Codes d’invitation rotatifs / expirables
-- 3) Trigger : employés ne peuvent modifier que statut / preuve
-- 4) Index lookback tâches
-- =============================================================================

-- ── 1) Helper RLS partagé ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.my_restaurant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id
  FROM public.user_roles
  WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.my_restaurant_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_restaurant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_restaurant_ids() TO anon;

-- ── 2) Codes d’invitation ─────────────────────────────────────────────────────

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS invite_code text;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS invite_code_expires_at timestamptz;

-- Backfill : conserve les codes legacy (8 premiers chars de l’UUID)
UPDATE public.restaurants
SET
  invite_code = upper(left(id::text, 8)),
  invite_code_expires_at = COALESCE(invite_code_expires_at, now() + interval '365 days')
WHERE invite_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_invite_code
  ON public.restaurants (invite_code)
  WHERE invite_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_restaurant_invite_code(p_valid_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_resto_id uuid;
  v_role text;
  v_code text;
  v_expires timestamptz;
  v_attempt int;
  v_ok boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT restaurant_id, role INTO v_resto_id, v_role
  FROM public.user_roles
  WHERE user_id = v_uid
  LIMIT 1;

  IF v_resto_id IS NULL OR v_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Réservé au gérant / manager';
  END IF;

  v_expires := now() + make_interval(days => GREATEST(1, COALESCE(p_valid_days, 30)));

  FOR v_attempt IN 1..12 LOOP
    v_code := public.generate_invite_code();
    BEGIN
      UPDATE public.restaurants
      SET invite_code = v_code,
          invite_code_expires_at = v_expires
      WHERE id = v_resto_id;
      v_ok := true;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Impossible de générer un code unique';
  END IF;

  RETURN jsonb_build_object('code', v_code, 'expires_at', v_expires);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_restaurant_invite_code()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_resto_id uuid;
  v_role text;
  v_code text;
  v_expires timestamptz;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT restaurant_id, role INTO v_resto_id, v_role
  FROM public.user_roles
  WHERE user_id = v_uid
  LIMIT 1;

  IF v_resto_id IS NULL OR v_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Réservé au gérant / manager';
  END IF;

  SELECT invite_code, invite_code_expires_at INTO v_code, v_expires
  FROM public.restaurants
  WHERE id = v_resto_id;

  IF v_code IS NULL OR (v_expires IS NOT NULL AND v_expires < now()) THEN
    v_result := public.rotate_restaurant_invite_code(30);
    RETURN v_result;
  END IF;

  RETURN jsonb_build_object('code', v_code, 'expires_at', v_expires);
END;
$$;

-- Join : code rotatif d’abord, fallback UUID legacy
CREATE OR REPLACE FUNCTION public.join_restaurant_by_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_resto record;
  v_existing uuid;
  v_norm text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_uid) THEN
    RAISE EXCEPTION 'Utilisateur Auth introuvable en base. Déconnectez-vous et reconnectez-vous.';
  END IF;

  v_norm := upper(trim(COALESCE(p_code, '')));
  IF length(v_norm) < 8 THEN
    RAISE EXCEPTION 'Code d''invitation invalide.';
  END IF;

  SELECT id, name INTO v_resto
  FROM public.restaurants
  WHERE invite_code = v_norm
    AND (invite_code_expires_at IS NULL OR invite_code_expires_at > now())
  LIMIT 1;

  -- Fallback legacy (UUID prefix) si pas encore migré / code backfillé différent
  IF v_resto.id IS NULL THEN
    SELECT id, name INTO v_resto
    FROM public.restaurants
    WHERE id::text ILIKE lower(v_norm) || '%'
    LIMIT 1;
  END IF;

  IF v_resto.id IS NULL THEN
    RAISE EXCEPTION 'Code d''invitation invalide ou expiré.';
  END IF;

  SELECT restaurant_id INTO v_existing
  FROM public.user_roles
  WHERE user_id = v_uid
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    IF v_existing = v_resto.id THEN
      RETURN jsonb_build_object('id', v_resto.id, 'name', v_resto.name);
    ELSE
      RAISE EXCEPTION 'Vous êtes déjà membre d''un autre restaurant.';
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, restaurant_id, role)
  VALUES (v_uid, v_resto.id, 'employee');

  RETURN jsonb_build_object('id', v_resto.id, 'name', v_resto.name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rotate_restaurant_invite_code(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_restaurant_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_restaurant_by_invite_code(text) TO authenticated;

-- ── 3) Employés : UPDATE limité (statut / preuve) ─────────────────────────────

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
    -- Seule la progression / preuve peut changer côté employé.
    IF NEW.restaurant_id IS DISTINCT FROM OLD.restaurant_id
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.category IS DISTINCT FROM OLD.category
       OR NEW.priority IS DISTINCT FROM OLD.priority
       OR NEW.task_type IS DISTINCT FROM OLD.task_type
       OR NEW.scheduled_for IS DISTINCT FROM OLD.scheduled_for
       OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
    THEN
      NEW.restaurant_id := OLD.restaurant_id;
      NEW.title := OLD.title;
      NEW.category := OLD.category;
      NEW.priority := OLD.priority;
      NEW.task_type := OLD.task_type;
      NEW.scheduled_for := OLD.scheduled_for;
      NEW.assigned_to := OLD.assigned_to;
      NEW.created_by := OLD.created_by;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_protect_employee_update ON public.tasks;
CREATE TRIGGER tasks_protect_employee_update
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_task_employee_update();

-- ── 4) Index lookback (déjà présent sur complete-fix ; IF NOT EXISTS) ────────

CREATE INDEX IF NOT EXISTS idx_tasks_restaurant_scheduled_for
  ON public.tasks (restaurant_id, scheduled_for);

-- =============================================================================
-- Après ce script :
-- 1) Déployer Edge Function supabase/functions/daily-materialize
-- 2) Secret CRON_SECRET (déjà utilisé pour push-reminders)
-- 3) Cron SQL : docs/supabase-p0-daily-materialize-cron.sql
-- =============================================================================
