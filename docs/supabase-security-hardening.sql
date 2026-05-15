-- =============================================================================
-- DailyDo — durcissement sécurité / perf (idempotent)
-- =============================================================================
-- PRÉREQUIS : exécuter d’abord `docs/supabase-dailydo-complete-fix.sql` (script
-- canonique), puis CE fichier dans une deuxième requête SQL — même ordre en prod
-- et en staging pour éviter les écarts doc / base.
-- Corrige notamment :
--   1) fonction `set_updated_at` sans search_path fixe (lint Supabase 0011)
--   2) table `app_storage` : politiques trop permissives pour `anon` + consolidation
--
-- Sans table `app_storage`, seule la section 1 s’applique réellement (no-op sur policies).
-- =============================================================================

-- ── 1) Trigger helper : search_path figé ─────────────────────────────────────

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

COMMENT ON FUNCTION public.set_updated_at() IS 'Trigger: met à jour updated_at ; search_path fixé pour le linter sécurité.';

-- ── 2) Table app_storage (si présente) : retirer l’accès anon, une seule policy ─

DO $$
DECLARE
  pol record;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'app_storage'
  ) THEN
    RAISE NOTICE 'Table public.app_storage absente — section 2 ignorée.';
  ELSE
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'app_storage'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.app_storage', pol.policyname);
    END LOOP;

    ALTER TABLE public.app_storage ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.app_storage FROM anon;

    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_storage TO authenticated;

    CREATE POLICY app_storage_authenticated_all
      ON public.app_storage
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;

--  Remarque : le linter peut encore signaler « rls_policy_always_true » sur
--  app_storage pour le rôle authenticated — acceptable pour un stockage KV
--  global legacy ; pour aller plus loin, restreindre par clé / restaurant.
