-- P2 Verification with full migration chain

-- Setup: Add test users to auth.users
INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner@test.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manager@test.com'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'employee@test.com'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'employee2@test.com')
ON CONFLICT DO NOTHING;

-- Create test restaurants
INSERT INTO public.restaurants (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Restaurant 1'),
  ('22222222-2222-2222-2222-222222222222', 'Restaurant 2')
ON CONFLICT DO NOTHING;

-- Assign roles
INSERT INTO public.user_roles (user_id, restaurant_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'manager'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'employee'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'employee')
ON CONFLICT DO NOTHING;

-- Create test task as manager
DELETE FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

SET ROLE authenticated;
SET request.jwt.claims.sub TO 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

INSERT INTO public.tasks (id, restaurant_id, title, status, completed, scheduled_for) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'Test Task', 'todo', false, current_date);

\echo '========================================='
\echo 'Test 1: Employee direct UPDATE of title'
\echo 'Expected: 0 rows updated'
\echo '========================================='
SET request.jwt.claims.sub TO 'cccccccc-cccc-cccc-cccc-cccccccccccc';

UPDATE public.tasks SET title = 'HACKED' WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
SELECT title, status FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo ''
\echo '========================================='
\echo 'Test 2: Employee RPC sets done'
\echo 'Expected: status=done, completed_by set'
\echo '========================================='
SELECT update_task_status_employee(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'done', true, 'Done via RPC', 'Employee User'
)->>'status' AS rpc_returned_status;

SELECT status, completed, completed_by, completed_at IS NOT NULL AS has_completed_at 
FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo ''
\echo '========================================='
\echo 'Test 3: Employee RPC undoes to todo'
\echo 'Expected: completed_at/by cleared'
\echo '========================================='
SELECT update_task_status_employee(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'todo', false, NULL, NULL
)->>'status' AS rpc_returned_status;

SELECT status, completed, completed_by, completed_at
FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo ''
\echo '========================================='
\echo 'Test 4: Employee RPC sets in_progress'
\echo 'Expected: started_at set (first time)'
\echo '========================================='
SELECT update_task_status_employee(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'in_progress', NULL, 'Working', NULL
)->>'status' AS rpc_returned_status;

SELECT status, started_at IS NOT NULL AS has_started_at, started_at::text AS started_value
FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' \gset

-- Wait to ensure timestamp would differ
SELECT pg_sleep(0.2);

\echo ''
\echo '========================================='
\echo 'Test 5: Employee RPC to done'
\echo 'Expected: started_at preserved (not changed)'
\echo '========================================='
SELECT update_task_status_employee(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'done', true, 'Completed', 'Emp'
)->>'status' AS rpc_returned_status;

SELECT 
  status,
  CASE WHEN started_at::text = :'started_value' 
    THEN 'preserved ✓' 
    ELSE 'CHANGED (bug) ✗' 
  END AS started_at_check
FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo ''
\echo '========================================='
\echo 'Test 6: Cross-restaurant access'
\echo 'Expected: ERROR Accès refusé'
\echo '========================================='
SET request.jwt.claims.sub TO 'dddddddd-dddd-dddd-dddd-dddddddddddd';
SELECT update_task_status_employee('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'todo', NULL, NULL, NULL);

\echo ''
\echo '========================================='
\echo 'Test 7: Manager direct UPDATE'
\echo 'Expected: UPDATE 1 row, title changed'
\echo '========================================='
SET request.jwt.claims.sub TO 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

UPDATE public.tasks SET title = 'Manager Title', deadline = now() + interval '2 days'
WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

SELECT title, deadline IS NOT NULL AS has_deadline 
FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo ''
\echo '========================================='
\echo 'Test 8: Owner direct UPDATE'
\echo 'Expected: UPDATE 1 row, title changed'
\echo '========================================='
SET request.jwt.claims.sub TO 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

UPDATE public.tasks SET title = 'Owner Title', priority = 'haute'
WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

SELECT title, priority FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo ''
\echo '========================================='
\echo 'All tests complete'
\echo '========================================='

RESET ROLE;
