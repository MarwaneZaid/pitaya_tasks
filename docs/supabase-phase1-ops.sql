-- =============================================================================
-- DailyDo Phase 1 — Ops terrain : statuts, postes, modèles de checklist
-- Idempotent. Exécuter dans le SQL Editor Supabase (projet dailydo-saas).
-- =============================================================================

-- ── Tasks : statut opérationnel + métadonnées checklist ─────────────────────

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo';

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS post TEXT;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS checklist_id UUID;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS checklist_item_key TEXT;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS proof_note TEXT;

UPDATE public.tasks
SET status = CASE WHEN completed IS TRUE THEN 'done' ELSE 'todo' END
WHERE status IS NULL OR status NOT IN ('todo', 'in_progress', 'done');

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'done'));

CREATE INDEX IF NOT EXISTS idx_tasks_status_scheduled
  ON public.tasks (restaurant_id, scheduled_for, status);

-- ── Modèles de checklist (ouverture, fermeture, HACCP, etc.) ─────────────────

CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  post TEXT DEFAULT 'all',
  recurrence TEXT NOT NULL DEFAULT 'daily' CHECK (recurrence IN ('daily', 'weekdays')),
  weekday_keys TEXT[] DEFAULT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_checklist_templates_restaurant
  ON public.checklist_templates (restaurant_id);

DROP TRIGGER IF EXISTS checklist_templates_set_updated_at ON public.checklist_templates;
CREATE TRIGGER checklist_templates_set_updated_at
  BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FK optionnelle (si checklist supprimée, garder les tâches)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_checklist_id_fkey'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_checklist_id_fkey
      FOREIGN KEY (checklist_id) REFERENCES public.checklist_templates(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ── RLS checklist_templates (même logique que planning : membre du resto) ────

REVOKE ALL ON TABLE public.checklist_templates FROM anon;

DROP POLICY IF EXISTS checklist_select ON public.checklist_templates;
CREATE POLICY checklist_select
  ON public.checklist_templates FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.my_restaurant_ids()));

DROP POLICY IF EXISTS checklist_insert_manager ON public.checklist_templates;
CREATE POLICY checklist_insert_manager
  ON public.checklist_templates FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT ur.restaurant_id FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS checklist_update_manager ON public.checklist_templates;
CREATE POLICY checklist_update_manager
  ON public.checklist_templates FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS checklist_delete_manager ON public.checklist_templates;
CREATE POLICY checklist_delete_manager
  ON public.checklist_templates FOR DELETE TO authenticated
  USING (
    restaurant_id IN (
      SELECT ur.restaurant_id FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role IN ('owner', 'manager')
    )
  );
