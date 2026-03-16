-- ============================================================
-- DailyDo SaaS — Schéma complet + RLS pour Supabase (dailydo-saas)
-- À exécuter dans Supabase → SQL Editor (New query) → Run
-- ============================================================

-- 1. Tables
-- ---------

-- Restaurants (un par établissement)
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Rôles utilisateur par restaurant (owner = créateur, employee = invité)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  role text not null check (role in ('owner', 'employee')),
  created_at timestamptz default now(),
  unique(user_id, restaurant_id)
);

-- Planning par jour + annexes (config hebdo)
create table if not exists public.planning_templates (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  day_of_week text not null,
  tasks jsonb default '[]'::jsonb,
  updated_at timestamptz default now(),
  primary key (restaurant_id, day_of_week)
);

-- Tâches du jour / semaine
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  title text not null,
  category text default 'nettoyage',
  priority text default 'moyenne',
  task_type text default 'quotidien',
  scheduled_for date,
  assigned_to text,
  completed boolean default false,
  created_by text,
  completed_at timestamptz,
  completed_by text,
  created_at timestamptz default now()
);

-- Stockage clé/valeur partagé (optionnel, utilisé par window.storage)
create table if not exists public.app_storage (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- Index utiles
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_restaurant_id on public.user_roles(restaurant_id);
create index if not exists idx_tasks_restaurant_id on public.tasks(restaurant_id);
create index if not exists idx_tasks_scheduled_for on public.tasks(scheduled_for);
create index if not exists idx_planning_templates_restaurant_id on public.planning_templates(restaurant_id);

-- 2. Row Level Security (RLS)
-- --------------------------
-- Chaque utilisateur ne voit que les données des restaurants dont il est membre.

alter table public.restaurants enable row level security;
alter table public.user_roles enable row level security;
alter table public.planning_templates enable row level security;
alter table public.tasks enable row level security;
alter table public.app_storage enable row level security;

-- Fonction helper : restaurant_ids pour l'utilisateur connecté
create or replace function public.my_restaurant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select restaurant_id from public.user_roles where user_id = auth.uid();
$$;

-- restaurants
drop policy if exists "restaurants_select" on public.restaurants;
create policy "restaurants_select" on public.restaurants
  for select using (id in (select public.my_restaurant_ids()));

drop policy if exists "restaurants_insert" on public.restaurants;
create policy "restaurants_insert" on public.restaurants
  for insert with check (auth.uid() is not null);

drop policy if exists "restaurants_update" on public.restaurants;
create policy "restaurants_update" on public.restaurants
  for update using (id in (select public.my_restaurant_ids()));

-- user_roles
drop policy if exists "user_roles_select" on public.user_roles;
create policy "user_roles_select" on public.user_roles
  for select using (restaurant_id in (select public.my_restaurant_ids()));

drop policy if exists "user_roles_insert" on public.user_roles;
create policy "user_roles_insert" on public.user_roles
  for insert with check (user_id = auth.uid());

-- planning_templates
drop policy if exists "planning_templates_all" on public.planning_templates;
create policy "planning_templates_all" on public.planning_templates
  for all
  using (restaurant_id in (select public.my_restaurant_ids()))
  with check (restaurant_id in (select public.my_restaurant_ids()));

-- tasks
drop policy if exists "tasks_all" on public.tasks;
create policy "tasks_all" on public.tasks
  for all
  using (restaurant_id in (select public.my_restaurant_ids()))
  with check (restaurant_id in (select public.my_restaurant_ids()));

-- app_storage : accès pour tout utilisateur connecté (stockage partagé global)
drop policy if exists "app_storage_all" on public.app_storage;
create policy "app_storage_all" on public.app_storage
  for all using (auth.uid() is not null);

-- 3. (Optionnel) Trigger updated_at pour planning_templates
-- --------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists planning_templates_updated_at on public.planning_templates;
create trigger planning_templates_updated_at
  before update on public.planning_templates
  for each row execute function public.set_updated_at();
