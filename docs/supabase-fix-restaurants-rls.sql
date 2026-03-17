-- ============================================================
-- Fix RLS "new row violates row-level security policy" pour restaurants
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- Fonction qui crée le restaurant + le rôle owner en une seule opération (contourne RLS)
create or replace function public.create_restaurant(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_resto_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Non authentifié';
  end if;

  insert into public.restaurants (name)
  values (p_name)
  returning id into v_resto_id;

  insert into public.user_roles (user_id, restaurant_id, role)
  values (v_user_id, v_resto_id, 'owner');

  return jsonb_build_object('id', v_resto_id);
end;
$$;

-- Permettre à l'utilisateur authentifié d'appeler la fonction
grant execute on function public.create_restaurant(text) to authenticated;
grant execute on function public.create_restaurant(text) to anon;
