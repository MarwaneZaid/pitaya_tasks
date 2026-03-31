-- ============================================================
-- DAILYDO — SCRIPT D'INITIALISATION SUPABASE
-- ============================================================
-- Instructions :
--   1. Créez un projet sur https://supabase.com (gratuit)
--   2. SQL Editor → New query → collez tout ce fichier → Run
--   3. Copiez l'URL et la clé "anon public" depuis
--      Project Settings → API
--   4. Entrez ces deux valeurs dans l'app DailyDo au premier lancement
-- ============================================================

-- ── 1. TABLE : RESTAURANTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.restaurants (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restaurants_select" ON public.restaurants;
CREATE POLICY "restaurants_select"
    ON public.restaurants FOR SELECT
    TO authenticated
    USING (
        id IN (
            SELECT restaurant_id FROM public.user_roles
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "restaurants_update_owner" ON public.restaurants;
CREATE POLICY "restaurants_update_owner"
    ON public.restaurants FOR UPDATE
    TO authenticated
    USING (
        id IN (
            SELECT restaurant_id FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- ── 2. TABLE : USER_ROLES ─────────────────────────────────────────────────────
-- Lie chaque utilisateur Supabase Auth à un restaurant, avec un rôle.
-- Rôles : 'owner' (gérant), 'manager', 'employee'
CREATE TABLE IF NOT EXISTS public.user_roles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'employee')),
    created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id)   -- Un utilisateur = un seul restaurant
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (
        restaurant_id IN (
            SELECT restaurant_id FROM public.user_roles
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "user_roles_insert_self" ON public.user_roles;
CREATE POLICY "user_roles_insert_self"
    ON public.user_roles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ── 3. TABLE : TASKS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    title         TEXT NOT NULL,
    category      TEXT DEFAULT 'nettoyage',
    priority      TEXT DEFAULT 'moyenne' CHECK (priority IN ('basse', 'moyenne', 'haute')),
    task_type     TEXT DEFAULT 'annexe' CHECK (task_type IN ('quotidien', 'annexe', 'semaine')),
    scheduled_for DATE NOT NULL,
    assigned_to   TEXT,
    completed     BOOLEAN DEFAULT false,
    created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by    TEXT,
    completed_at  TIMESTAMPTZ,
    completed_by  TEXT
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

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

-- ── 4. TABLE : PLANNING_TEMPLATES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.planning_templates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    day_of_week   TEXT NOT NULL CHECK (
        day_of_week IN ('lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche','annexes')
    ),
    tasks         JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(restaurant_id, day_of_week)
);

ALTER TABLE public.planning_templates ENABLE ROW LEVEL SECURITY;

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

-- ── 5. FONCTION : create_restaurant ──────────────────────────────────────────
-- Crée un restaurant et assigne le rôle 'owner' à l'utilisateur courant.
-- Appelée lors de l'inscription du premier gérant.
CREATE OR REPLACE FUNCTION public.create_restaurant(p_name TEXT)
RETURNS TABLE(id UUID, name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_restaurant_id UUID;
    v_user_id       UUID := auth.uid();
BEGIN
    -- Vérifier que l'utilisateur n'est pas déjà dans un restaurant
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id) THEN
        -- Retourner le restaurant existant sans erreur
        SELECT r.id, r.name INTO v_restaurant_id, p_name
        FROM public.restaurants r
        JOIN public.user_roles ur ON ur.restaurant_id = r.id
        WHERE ur.user_id = v_user_id;
        RETURN QUERY SELECT v_restaurant_id, p_name;
        RETURN;
    END IF;

    -- Créer le restaurant
    INSERT INTO public.restaurants(name)
    VALUES (p_name)
    RETURNING restaurants.id INTO v_restaurant_id;

    -- Assigner le rôle owner
    INSERT INTO public.user_roles(user_id, restaurant_id, role)
    VALUES (v_user_id, v_restaurant_id, 'owner');

    RETURN QUERY SELECT v_restaurant_id, p_name;
END;
$$;

-- ── 6. REALTIME : activer les changements en temps réel ──────────────────────
-- Permet la synchronisation live entre appareils.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    END IF;
END$$;

-- ── 7. AUTH : désactiver la confirmation email ────────────────────────────────
-- (Optionnel mais recommandé pour éviter les blocages à l'inscription)
-- À faire manuellement dans : Supabase Dashboard → Authentication → Email Templates
-- → Désactiver "Enable email confirmations"
-- OU via l'API SQL :
UPDATE auth.config SET confirm_email_address_enabled = false WHERE TRUE;

-- ============================================================
-- ✅ Setup terminé !
-- Copiez maintenant l'URL et la clé "anon public" depuis
-- Project Settings → API et entrez-les dans l'app DailyDo.
-- ============================================================
