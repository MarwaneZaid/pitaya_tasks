-- DailyDo — Rejoindre un restaurant avec le code d’espace (SECURITY DEFINER)
-- À exécuter dans Supabase → SQL Editor → Run
-- Install complète recommandée : docs/supabase-dailydo-complete-fix.sql (inclut cette RPC + RLS + create_restaurant).
--
-- Pourquoi : sans cette fonction, un utilisateur sans rôle ne peut pas lire `restaurants`
-- (RLS), donc la jointure par préfixe d’UUID échoue. La RPC lit en défini sécurité.
--
-- Prérequis : Authentication → Providers → activer « Anonymous sign-ins » pour le flux
-- « Équipe » (code seul, sans mot de passe).

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
