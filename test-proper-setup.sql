-- Proper test setup matching Supabase behavior

-- Drop and recreate database
\c postgres
DROP DATABASE IF EXISTS dailydo_proper_test;
CREATE DATABASE dailydo_proper_test;
\c dailydo_proper_test

-- Minimal auth schema
CREATE SCHEMA auth;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text
);

-- auth.uid() reads from GUC (just like Supabase)
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claims.sub', true), '')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Create roles WITHOUT BYPASSRLS (like Supabase authenticated/anon)
DROP ROLE IF EXISTS authenticated;
DROP ROLE IF EXISTS anon;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE anon NOLOGIN NOINHERIT;

-- Grant basic schema access
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;

-- All tables and functions will be owned by postgres (superuser with BYPASSRLS)
-- This matches Supabase where everything is owned by postgres
