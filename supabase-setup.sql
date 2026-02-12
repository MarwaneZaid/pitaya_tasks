-- À exécuter dans Supabase : SQL Editor → New query → coller et Run
-- Crée la table de stockage partagé pour les tâches restaurant

create table if not exists app_storage (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- Permettre à tous (anon) de lire/écrire pour que les managers partagent les mêmes données
alter table app_storage enable row level security;

create policy "Allow anon read and write for app_storage"
  on app_storage for all
  to anon
  using (true)
  with check (true);
