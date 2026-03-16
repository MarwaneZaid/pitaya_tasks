-- ========================================================================================
-- DAILYDO SAAS - SCRIPT D'INITIALISATION SUPABASE (MULTI-TENANT)
-- ========================================================================================
-- Ce script configure la base de données pour un usage commercial (SaaS).
-- Il active la Row Level Security (RLS) pour isoler les données de chaque restaurant.
-- Prérequis : Supabase Authentication doit être activé (Email/Password).
-- ========================================================================================

-- 1. Table principale : RESTAURANTS
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    subscription_status TEXT DEFAULT 'active' -- 'active', 'trialing', 'canceled'
);

-- Active RLS sur restaurants
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- 2. Table de liaison : USER_ROLES (Lien entre Utilisateurs Auth et Restaurants)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    restaurant_id UUID REFERENCES public.restaurants(id) NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'employee')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, restaurant_id)
);

-- Active RLS sur user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Table des templates de planning : PLANNING_TEMPLATES
CREATE TABLE IF NOT EXISTS public.planning_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) NOT NULL,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche', 'annexes')),
    tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(restaurant_id, day_of_week)
);

-- Active RLS sur planning_templates
ALTER TABLE public.planning_templates ENABLE ROW LEVEL SECURITY;

-- 4. Table des tâches au jour le jour : TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'nettoyage',
    priority TEXT DEFAULT 'moyenne',
    task_type TEXT DEFAULT 'quotidien', -- 'quotidien', 'annexe'
    scheduled_for DATE NOT NULL,
    assigned_to TEXT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by TEXT, -- Nom de l'employé
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by TEXT
);

-- Active RLS sur tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;


-- ========================================================================================
-- POLITIQUES DE SECURITE (RLS) - ISOLATION DES DONNEES (MULTI-TENANT)
-- ========================================================================================

-- Fonction utilitaire pour récupérer le(s) restaurant_id d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_restaurant_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT restaurant_id FROM user_roles WHERE user_id = auth.uid();
$$;

-- RLS: RESTAURANTS
-- Un utilisateur ne peut voir que les restaurants dont il fait partie
CREATE POLICY "Users can view their own restaurants" ON public.restaurants
    FOR SELECT USING (id IN (SELECT get_user_restaurant_ids()));

-- RLS: USER_ROLES
-- Un utilisateur peut voir les rôles des employés de son restaurant
CREATE POLICY "Users can view roles in their restaurants" ON public.user_roles
    FOR SELECT USING (restaurant_id IN (SELECT get_user_restaurant_ids()));

-- RLS: PLANNING_TEMPLATES
-- Lecture: Tous les employés du restaurant
CREATE POLICY "Employees can view planning templates" ON public.planning_templates
    FOR SELECT USING (restaurant_id IN (SELECT get_user_restaurant_ids()));
-- Ecriture: Seuls les owners/managers (Simplifié ici pour l'exemple: Tous les membres peuvent éditer)
CREATE POLICY "Employees can manage planning templates" ON public.planning_templates
    FOR ALL USING (restaurant_id IN (SELECT get_user_restaurant_ids()));

-- RLS: TASKS
-- Les employés ne voient et ne gèrent que les tâches de leur restaurant
CREATE POLICY "Employees can view tasks of their restaurant" ON public.tasks
    FOR SELECT USING (restaurant_id IN (SELECT get_user_restaurant_ids()));
CREATE POLICY "Employees can insert tasks to their restaurant" ON public.tasks
    FOR INSERT WITH CHECK (restaurant_id IN (SELECT get_user_restaurant_ids()));
CREATE POLICY "Employees can update tasks of their restaurant" ON public.tasks
    FOR UPDATE USING (restaurant_id IN (SELECT get_user_restaurant_ids()));
CREATE POLICY "Employees can delete tasks of their restaurant" ON public.tasks
    FOR DELETE USING (restaurant_id IN (SELECT get_user_restaurant_ids()));


-- ========================================================================================
-- TRIGGERS DE MISE A JOUR DES DATES
-- ========================================================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_restaurants_modtime
    BEFORE UPDATE ON public.restaurants
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_planning_templates_modtime
    BEFORE UPDATE ON public.planning_templates
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
