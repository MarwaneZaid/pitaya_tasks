-- Minimal test schema for RLS verification
CREATE SCHEMA IF NOT EXISTS auth;

-- Stub auth.uid() function
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('test.auth_uid', true)
  )::uuid;
$$;

-- Core tables (minimal from repo)
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'employee')),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),
  title TEXT NOT NULL,
  category TEXT DEFAULT 'nettoyage',
  priority TEXT DEFAULT 'moyenne',
  task_type TEXT DEFAULT 'quotidien',
  scheduled_for DATE NOT NULL,
  assigned_to TEXT,
  deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'todo',
  completed BOOLEAN DEFAULT false,
  completed_by TEXT,
  completed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  proof_note TEXT,
  post TEXT,
  checklist_id UUID,
  checklist_item_key TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Test data
INSERT INTO public.restaurants (id, name) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Restaurant 1'),
  ('22222222-2222-2222-2222-222222222222', 'Restaurant 2');

INSERT INTO public.user_roles (user_id, restaurant_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'manager'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'employee'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'employee');

INSERT INTO public.tasks (id, restaurant_id, title, status, completed, scheduled_for) VALUES
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'Test Task', 'todo', false, '2026-09-28');
