-- Test 1: Employee attempts direct UPDATE on title (should FAIL)
SET test.auth_uid = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
\echo '=== Test 1: Employee direct UPDATE title (should FAIL) ==='
UPDATE public.tasks SET title = 'Hacked Title' WHERE id = '99999999-9999-9999-9999-999999999999';
\echo 'If you see this, the test PASSED (UPDATE blocked by RLS)'

-- Test 2: Employee calls RPC to change status (should SUCCEED)
\echo ''
\echo '=== Test 2: Employee RPC update status (should SUCCEED) ==='
SELECT public.update_task_status_employee(
  '99999999-9999-9999-9999-999999999999'::uuid,
  'in_progress',
  false,
  'Working on it',
  'Employee User'
);

-- Test 3: Manager direct UPDATE all fields (should SUCCEED)
SET test.auth_uid = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo ''
\echo '=== Test 3: Manager direct UPDATE (should SUCCEED) ==='
UPDATE public.tasks 
SET title = 'Manager Changed Title',
    deadline = '2026-09-30 18:00:00'::timestamptz
WHERE id = '99999999-9999-9999-9999-999999999999'
RETURNING id, title, deadline;

-- Test 4: Cross-restaurant access (should FAIL)
SET test.auth_uid = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
\echo ''
\echo '=== Test 4: Cross-restaurant access (should FAIL) ==='
SELECT public.update_task_status_employee(
  '99999999-9999-9999-9999-999999999999'::uuid,
  'done',
  true,
  'Hacked',
  'Attacker'
);
\echo 'If you see this, the test FAILED (cross-restaurant access allowed)'

-- Test 5: Owner can update all fields
SET test.auth_uid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
\echo ''
\echo '=== Test 5: Owner direct UPDATE (should SUCCEED) ==='
UPDATE public.tasks 
SET title = 'Owner Final Title',
    priority = 'haute',
    category = 'cuisine'
WHERE id = '99999999-9999-9999-9999-999999999999'
RETURNING id, title, priority, category;

-- Final state
\echo ''
\echo '=== Final task state ==='
SELECT id, title, status, completed, proof_note, deadline, priority, category
FROM public.tasks 
WHERE id = '99999999-9999-9999-9999-999999999999';
