-- =============================================================================
-- DailyDo — alignement prod (dailydo-saas) : RLS par rôle, Realtime, schéma
-- Idempotent. Appliqué via migration MCP ou SQL Editor.
-- =============================================================================

-- ── Schéma ───────────────────────────────────────────────────────────────────

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.restaurants SET updated_at = COALESCE(updated_at, created_at, now())
  WHERE updated_at IS NULL;

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

DROP TRIGGER IF EXISTS restaurants_set_updated_at ON public.restaurants;
CREATE TRIGGER restaurants_set_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS planning_templates_set_updated_at ON public.planning_templates;
CREATE TRIGGER planning_templates_set_updated_at
  BEFORE UPDATE ON public.planning_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Realtime (filtres restaurant_id côté client) ─────────────────────────────

ALTER TABLE public.tasks REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;

-- ── Index perf ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tasks_restaurant_scheduled_for
  ON public.tasks (restaurant_id, scheduled_for);

-- ── Révoquer anon sur tables métier ──────────────────────────────────────────

REVOKE ALL ON TABLE public.restaurants FROM anon;
REVOKE ALL ON TABLE public.user_roles FROM anon;
REVOKE ALL ON TABLE public.planning_templates FROM anon;
REVOKE ALL ON TABLE public.tasks FROM anon;

-- ── Restaurants : pas d’INSERT direct (création via RPC create_restaurant) ──

DROP POLICY IF EXISTS restaurants_insert ON public.restaurants;
DROP POLICY IF EXISTS restaurants_update ON public.restaurants;

CREATE POLICY restaurants_update_owner
  ON public.restaurants FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT ur.restaurant_id FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT ur.restaurant_id FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'owner'
    )
  );

-- ── Tasks : remplacer tasks_all (DELETE réservé gérant/manager) ────────────────

DROP POLICY IF EXISTS tasks_all ON public.tasks;

CREATE POLICY tasks_select
  ON public.tasks FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.my_restaurant_ids()));

CREATE POLICY tasks_insert_manager
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT ur.restaurant_id FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role IN ('owner', 'manager')
    )
  );

CREATE POLICY tasks_update_member
  ON public.tasks FOR UPDATE TO authenticated
  USING (restaurant_id IN (SELECT public.my_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.my_restaurant_ids()));

CREATE POLICY tasks_delete_manager
  ON public.tasks FOR DELETE TO authenticated
  USING (
    restaurant_id IN (
      SELECT ur.restaurant_id FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role IN ('owner', 'manager')
    )
  );

-- ── Planning : lecture équipe, écriture owner/manager ─────────────────────────

DROP POLICY IF EXISTS planning_templates_all ON public.planning_templates;

CREATE POLICY planning_select
  ON public.planning_templates FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.my_restaurant_ids()));

CREATE POLICY planning_insert_manager
  ON public.planning_templates FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT ur.restaurant_id FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role IN ('owner', 'manager')
    )
  );

CREATE POLICY planning_update_manager
  ON public.planning_templates FOR UPDATE TO authenticated
  USING (
    restaurant_id IN (
      SELECT ur.restaurant_id FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT ur.restaurant_id FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role IN ('owner', 'manager')
    )
  );

CREATE POLICY planning_delete_manager
  ON public.planning_templates FOR DELETE TO authenticated
  USING (
    restaurant_id IN (
      SELECT ur.restaurant_id FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role IN ('owner', 'manager')
    )
  );

-- ── app_storage : retirer anon ───────────────────────────────────────────────

DO $$
DECLARE pol record;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'app_storage'
  ) THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'app_storage'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.app_storage', pol.policyname);
    END LOOP;
    REVOKE ALL ON TABLE public.app_storage FROM anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_storage TO authenticated;
    CREATE POLICY app_storage_authenticated_rw
      ON public.app_storage FOR ALL TO authenticated
      USING ((SELECT auth.uid()) IS NOT NULL)
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
  END IF;
END $$;
