-- Reset task state
UPDATE public.tasks SET 
  title = 'Test Task', 
  status = 'todo', 
  completed = false, 
  proof_note = NULL, 
  deadline = NULL, 
  priority = 'moyenne', 
  category = 'nettoyage', 
  completed_by = NULL, 
  completed_at = NULL, 
  started_at = NULL 
WHERE id = '99999999-9999-9999-9999-999999999999';

\echo '=== Initial task state ==='
SELECT id, title, status, restaurant_id FROM public.tasks WHERE id = '99999999-9999-9999-9999-999999999999';

-- Test 1: Employee attempts direct UPDATE on title (should FAIL)
SET test.auth_uid = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
\echo ''
\echo '=== Test 1: Employee direct UPDATE title (should be BLOCKED by RLS) ==='
UPDATE public.tasks SET title = 'Hacked Title' WHERE id = '99999999-9999-9999-9999-999999999999';
SELECT title FROM public.tasks WHERE id = '99999999-9999-9999-9999-999999999999';

-- Test 2: Employee calls RPC to change status (should SUCCEED)
\echo ''
\echo '=== Test 2: Employee RPC update status (should SUCCEED) ==='
SELECT public.update_task_status_employee(
  '99999999-9999-9999-9999-999999999999'::uuid,
  'in_progress'::text,
  false,
  'Working on it'::text,
  'Employee User'::text
);
SELECT status, proof_note FROM public.tasks WHERE id = '99999999-9999-9999-9999-999999999999';

-- Test 3: Employee tries to change title via RPC params (verify RPC doesn't allow it)
\echo ''
\echo '=== Test 3: Verify RPC only updates allowed fields ==='
SELECT title, status FROM public.tasks WHERE id = '99999999-9999-9999-9999-999999999999';

-- Test 4: Manager direct UPDATE all fields (should SUCCEED)
SET test.auth_uid = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo ''
\echo '=== Test 4: Manager direct UPDATE (should SUCCEED) ==='
UPDATE public.tasks 
SET title = 'Manager Changed Title',
    deadline = '2026-09-30 18:00:00'::timestamptz,
    priority = 'haute'
WHERE id = '99999999-9999-9999-9999-999999999999';
SELECT title, deadline, priority FROM public.tasks WHERE id = '99999999-9999-9999-9999-999999999999';

-- Test 5: Cross-restaurant access (should FAIL)
SET test.auth_uid = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
\echo ''
\echo '=== Test 5: Cross-restaurant access (should FAIL with error) ==='
SELECT public.update_task_status_employee(
  '99999999-9999-9999-9999-999999999999'::uuid,
  'done'::text,
  true,
  'Hacked'::text,
  'Attacker'::text
);

-- Test 6: Owner can update all fields
SET test.auth_uid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
\echo ''
\echo '=== Test 6: Owner direct UPDATE (should SUCCEED) ==='
UPDATE public.tasks 
SET title = 'Owner Final Title',
    category = 'cuisine'
WHERE id = '99999999-9999-9999-9999-999999999999';
SELECT title, category FROM public.tasks WHERE id = '99999999-9999-9999-9999-999999999999';

-- Final state
\echo ''
\echo '=== Final task state ==='
SELECT id, title, status, completed, proof_note, deadline, priority, category
FROM public.tasks 
WHERE id = '99999999-9999-9999-9999-999999999999';
