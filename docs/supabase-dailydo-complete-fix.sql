-- =============================================================================
-- DailyDo — script SQL CANONIQUE (schéma + RLS + RPC + Realtime)
-- =============================================================================
-- Où l’exécuter : Dashboard → SQL Editor → New query → coller tout ce fichier → Run.
--
-- ORDRE STABLE (évite l’écart doc / prod) :
--   1) CE FICHIER en entier (ci-dessous).
--   2) Ensuite, dans une nouvelle requête : docs/supabase-security-hardening.sql
--      (trigger set_updated_at / search_path, table app_storage si elle existe).
--
-- Ce script est idempotent : IF NOT EXISTS, DROP POLICY IF EXISTS, etc.
--
-- Dashboard Supabase — Authentication (après le SQL) :
--   • Flux « Équipe » / code sans e-mail classique : Authentication → Providers
--     → activer « Anonymous » (sinon signUp anonyme / flux équipe échoue).
--   • Confirmation e-mail : Authentication → Providers → Email → « Confirm email ».
--     Désactiver pour dev / tests rapides ; en production stricte, laisser activé
--     et configurer les Redirect URLs (voir docs/guides/DEPLOY_CHECKLIST.md).
--   • Variables front : VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY = ce projet.
--
-- Realtime : ce script ajoute public.tasks à la publication supabase_realtime et
-- définit REPLICA IDENTITY FULL (requis pour les filtres postgres_changes sur
-- restaurant_id). Vérifier dans le dashboard : Database → Publications →
-- supabase_realtime contient « tasks » ; Realtime activé pour le projet.
-- =============================================================================

-- ── Tables de base ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'employee')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.planning_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (
    day_of_week IN (
      'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche', 'annexes'
    )
  ),
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (restaurant_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'nettoyage',
  priority TEXT DEFAULT 'moyenne' CHECK (priority IN ('basse', 'moyenne', 'haute')),
  task_type TEXT DEFAULT 'annexe' CHECK (task_type IN ('quotidien', 'annexe', 'semaine')),
  scheduled_for DATE NOT NULL,
  assigned_to TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by TEXT,
  completed_at TIMESTAMPTZ,
  completed_by TEXT
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ── Performance : index critiques pour auth + chargement dashboard ────────────
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_restaurant_id ON public.user_roles(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_restaurant_id ON public.tasks(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_restaurant_scheduled_for ON public.tasks(restaurant_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_planning_templates_restaurant_id ON public.planning_templates(restaurant_id);

-- ── RLS : restaurants ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "restaurants_select" ON public.restaurants;
CREATE POLICY "restaurants_select"
  ON public.restaurants FOR SELECT TO authenticated
  USING (
    id IN (SELECT restaurant_id FROM public.user_roles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "restaurants_update_owner" ON public.restaurants;
CREATE POLICY "restaurants_update_owner"
  ON public.restaurants FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT restaurant_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ── RLS : user_roles ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "user_roles_insert_self" ON public.user_roles;
CREATE POLICY "user_roles_insert_self"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── RLS : planning_templates ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "planning_select" ON public.planning_templates;
CREATE POLICY "planning_select"
  ON public.planning_templates FOR SELECT TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "planning_upsert_owner" ON public.planning_templates;
CREATE POLICY "planning_upsert_owner"
  ON public.planning_templates FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Permet aux managers de modifier le planning (aligné avec l’app)
DROP POLICY IF EXISTS "planning_write_manager" ON public.planning_templates;
CREATE POLICY "planning_write_manager"
  ON public.planning_templates FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "planning_update_manager" ON public.planning_templates;
CREATE POLICY "planning_update_manager"
  ON public.planning_templates FOR UPDATE TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "planning_delete_manager" ON public.planning_templates;
CREATE POLICY "planning_delete_manager"
  ON public.planning_templates FOR DELETE TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ── RLS : tasks ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tasks_insert_manager" ON public.tasks;
CREATE POLICY "tasks_insert_manager"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "tasks_update_all" ON public.tasks;
CREATE POLICY "tasks_update_all"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tasks_delete_manager" ON public.tasks;
CREATE POLICY "tasks_delete_manager"
  ON public.tasks FOR DELETE TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ── RPC : create_restaurant — DOIT retourner du JSON { "id": "uuid" } pour l’app JS
-- Supprime les anciennes signatures possibles (TABLE vs jsonb).

DROP FUNCTION IF EXISTS public.create_restaurant(text);

CREATE OR REPLACE FUNCTION public.create_restaurant(p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
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

GRANT EXECUTE ON FUNCTION public.create_restaurant(text) TO authenticated;

-- ── RPC : rejoindre par code (contourne RLS lecture restaurants sans rôle)

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
  v_uid := auth.uid();
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

GRANT EXECUTE ON FUNCTION public.join_restaurant_by_invite_code(text) TO authenticated;

-- ── Realtime : tâches (publication + replica identity pour filtres côté client) ─
-- Le Dashboard filtre par restaurant_id=eq.<uuid>. Sans REPLICA IDENTITY FULL,
-- certains UPDATE/DELETE peuvent ne pas émettre d’événement filtré correctement.

ALTER TABLE public.tasks REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    RAISE NOTICE 'DailyDo: public.tasks ajoutée à supabase_realtime.';
  ELSE
    RAISE NOTICE 'DailyDo: public.tasks déjà publiée dans supabase_realtime.';
  END IF;
END $$;

-- =============================================================================
-- Fin du script canonique. Étape suivie obligatoire : exécuter
-- docs/supabase-security-hardening.sql dans une nouvelle requête.
-- Puis : Authentication (Anonymous si équipe, Confirm email selon env).
-- Tester : inscrire un gérant (nom + mot de passe) et vérifier la sync Realtime
-- entre deux onglets sur les tâches.
-- =============================================================================
