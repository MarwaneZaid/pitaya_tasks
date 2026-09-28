-- P2 Employee RLS Verification (as authenticated role with RLS)

-- Setup test data as superuser
RESET ROLE;

INSERT INTO public.restaurants (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Restaurant 1'),
  ('22222222-2222-2222-2222-222222222222', 'Test Restaurant 2')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, restaurant_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'manager'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'employee'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'employee')
ON CONFLICT DO NOTHING;

DELETE FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

-- Create test task as manager
SET ROLE authenticated;
SET request.jwt.claims.sub TO 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

INSERT INTO public.tasks (id, restaurant_id, title, status, completed) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'Test Task', 'todo', false);

\echo '=== Test 1: Employee direct UPDATE of title (expect 0 rows) ==='
SET request.jwt.claims.sub TO 'cccccccc-cccc-cccc-cccc-cccccccccccc';

UPDATE public.tasks SET title = 'HACKED' WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
SELECT title FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo '=== Test 2: Employee RPC sets done ==='
SELECT update_task_status_employee(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'done', true, 'Done', 'Emp'
)->>'status' AS status;

SELECT status, completed_by, completed_at IS NOT NULL AS has_completed_at 
FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo '=== Test 3: Employee RPC undoes to todo (clears completed_at/by) ==='
SELECT update_task_status_employee(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'todo', false, NULL, NULL
)->>'status' AS status;

SELECT status, completed_by, completed_at, started_at
FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo '=== Test 4: Employee RPC in_progress (sets started_at once) ==='
SELECT update_task_status_employee(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'in_progress', NULL, 'Working', NULL
)->>'status' AS status;

SELECT started_at FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' \gset old_

SELECT pg_sleep(0.1);

\echo '=== Test 5: RPC to done (started_at should NOT change) ==='
SELECT update_task_status_employee(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'done', true, 'Done', 'Emp'
)->>'status' AS status;

SELECT 
  CASE WHEN started_at = :'old_started_at'::timestamptz 
    THEN 'started_at preserved' 
    ELSE 'started_at CHANGED (bug)' 
  END AS check
FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo '=== Test 6: Cross-restaurant access (expect error) ==='
SET request.jwt.claims.sub TO 'dddddddd-dddd-dddd-dddd-dddddddddddd';
SELECT update_task_status_employee('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'todo', NULL, NULL, NULL);

\echo '=== Test 7: Manager direct UPDATE title+deadline (expect success) ==='
SET request.jwt.claims.sub TO 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

UPDATE public.tasks SET title = 'Manager Title', deadline = now() + interval '2 days'
WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

SELECT title, deadline IS NOT NULL AS has_deadline 
FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo '=== Test 8: Owner direct UPDATE (expect success) ==='
SET request.jwt.claims.sub TO 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

UPDATE public.tasks SET title = 'Owner Title', priority = 'high'
WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

SELECT title, priority FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

RESET ROLE;
