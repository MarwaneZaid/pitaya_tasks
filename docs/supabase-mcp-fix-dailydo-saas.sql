-- =============================================================================
-- DailyDo — correctif MCP (projet dailydo-saas / ref jgesheqrpskfygaxdncl)
-- Applique : RLS → role authenticated, (select auth.uid()), app_storage, RPC join,
-- contrainte rôle + manager, set_updated_at, revoke anon sur tables + fonctions,
-- publication Realtime tasks.
-- Idempotent autant que possible. À exécuter dans SQL Editor une fois.
-- =============================================================================

-- ── 0) Schéma user_roles : manager + un seul restaurant par utilisateur ─────

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('owner', 'manager', 'employee'));

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_restaurant_id_key;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- ── 1) Fonctions ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_restaurant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.user_roles WHERE user_id = (SELECT auth.uid());
$$;

DROP FUNCTION IF EXISTS public.create_restaurant(text);

CREATE OR REPLACE FUNCTION public.create_restaurant(p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_resto_id uuid;
  v_existing_role record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Utilisateur Auth introuvable en base. Déconnectez-vous et reconnectez-vous.';
  END IF;

  SELECT ur.restaurant_id, ur.role INTO v_existing_role
  FROM public.user_roles ur
  WHERE ur.user_id = v_user_id
  LIMIT 1;

  IF FOUND THEN
    IF v_existing_role.role = 'owner' THEN
      SELECT r.id INTO v_resto_id
      FROM public.restaurants r
      WHERE r.id = v_existing_role.restaurant_id;
      RETURN jsonb_build_object('id', v_resto_id);
    END IF;
    RAISE EXCEPTION 'Compte déjà lié à un restaurant (employé).';
  END IF;

  INSERT INTO public.restaurants (name)
  VALUES (p_name)
  RETURNING id INTO v_resto_id;

  INSERT INTO public.user_roles (user_id, restaurant_id, role)
  VALUES (v_user_id, v_resto_id, 'owner');

  RETURN jsonb_build_object('id', v_resto_id);
END;
$$;

DROP FUNCTION IF EXISTS public.join_restaurant_by_invite_code(text);

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
BEGIN
  v_uid := (SELECT auth.uid());
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_uid) THEN
    RAISE EXCEPTION 'Utilisateur Auth introuvable en base. Déconnectez-vous et reconnectez-vous.';
  END IF;
  IF p_code IS NULL OR length(trim(p_code)) < 8 THEN
    RAISE EXCEPTION 'Code d''invitation invalide.';
  END IF;

  SELECT id, name INTO v_resto
  FROM public.restaurants
  WHERE id::text ILIKE trim(lower(p_code)) || '%'
  LIMIT 1;

  IF v_resto.id IS NULL THEN
    RAISE EXCEPTION 'Code d''invitation invalide.';
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

REVOKE ALL ON FUNCTION public.create_restaurant(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_restaurant_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_restaurant_by_invite_code(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_restaurant(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_restaurant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_restaurant_by_invite_code(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_restaurant(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_restaurant_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_restaurant_by_invite_code(text) FROM anon;

-- ── 2) app_storage : supprimer toutes les politiques puis une seule (auth) ───

DO $$
DECLARE pol record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'app_storage'
  ) THEN
    RAISE NOTICE 'app_storage absent';
  ELSE
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'app_storage'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.app_storage', pol.policyname);
    END LOOP;
    ALTER TABLE public.app_storage ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.app_storage FROM anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_storage TO authenticated;
    CREATE POLICY app_storage_authenticated_rw ON public.app_storage
      FOR ALL TO authenticated
      USING ((SELECT auth.uid()) IS NOT NULL)
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
  END IF;
END $$;

-- ── 3) RLS cœur : uniquement authenticated + sous-requêtes auth.uid() ───────

DROP POLICY IF EXISTS restaurants_select ON public.restaurants;
DROP POLICY IF EXISTS restaurants_insert ON public.restaurants;
DROP POLICY IF EXISTS restaurants_update ON public.restaurants;

CREATE POLICY restaurants_select ON public.restaurants
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.my_restaurant_ids()));

CREATE POLICY restaurants_insert ON public.restaurants
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY restaurants_update ON public.restaurants
  FOR UPDATE TO authenticated
  USING (id IN (SELECT public.my_restaurant_ids()));

DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert ON public.user_roles;

CREATE POLICY user_roles_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.my_restaurant_ids()));

CREATE POLICY user_roles_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS planning_templates_all ON public.planning_templates;

CREATE POLICY planning_templates_all ON public.planning_templates
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.my_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.my_restaurant_ids()));

DROP POLICY IF EXISTS tasks_all ON public.tasks;

CREATE POLICY tasks_all ON public.tasks
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.my_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.my_restaurant_ids()));

-- Retirer l’énumération GraphQL « anon » sur les tables métier
REVOKE ALL ON TABLE public.restaurants FROM anon;
REVOKE ALL ON TABLE public.user_roles FROM anon;
REVOKE ALL ON TABLE public.planning_templates FROM anon;
REVOKE ALL ON TABLE public.tasks FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.restaurants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.planning_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;

-- ── 4) Realtime ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;

-- =============================================================================
-- Fin — vérifier : Database → Advisors + test connexion depuis l’app.
-- Authentication → Redirect URLs : https://www.dailydo-saas.app , localhost:5173
-- =============================================================================
