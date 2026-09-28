-- Add test users
INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner@test.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manager@test.com'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'employee@test.com'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'employee2@test.com')
ON CONFLICT DO NOTHING;

INSERT INTO public.restaurants (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'R1'),
  ('22222222-2222-2222-2222-222222222222', 'R2')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, restaurant_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'manager'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'employee'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'employee')
ON CONFLICT DO NOTHING;

DELETE FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

SET ROLE authenticated;
SET request.jwt.claims.sub TO 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

INSERT INTO public.tasks (id, restaurant_id, title, status, scheduled_for) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'Test', 'todo', current_date);

\echo '=== T1: Employee UPDATE title (expect 0) ==='
SET request.jwt.claims.sub TO 'cccccccc-cccc-cccc-cccc-cccccccccccc';
UPDATE public.tasks SET title = 'HACK' WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
SELECT title FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo '=== T2: Employee RPC done ==='
SELECT update_task_status_employee('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'done', true, 'Done', 'Emp')->>'status';
SELECT status, completed_by FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo '=== T3: Employee RPC undo to todo ==='
SELECT update_task_status_employee('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'todo', false, NULL, NULL)->>'status';
SELECT status, completed_by, completed_at FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo '=== T4: Employee RPC in_progress ==='
SELECT update_task_status_employee('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'in_progress', NULL, NULL, NULL)->>'status';
SELECT started_at FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' \gset old_
SELECT pg_sleep(0.2);

\echo '=== T5: RPC done (started_at preserved?) ==='
SELECT update_task_status_employee('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'done', true, 'Done', 'E')->>'status';
SELECT CASE WHEN started_at::text = :'old_started_at' THEN 'preserved' ELSE 'CHANGED' END FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo '=== T6: Cross-restaurant (expect error) ==='
SET request.jwt.claims.sub TO 'dddddddd-dddd-dddd-dddd-dddddddddddd';
SELECT update_task_status_employee('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'todo', NULL, NULL, NULL);

\echo '=== T7: Manager UPDATE ==='
SET request.jwt.claims.sub TO 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
UPDATE public.tasks SET title = 'Mgr', deadline = now() + interval '1 day' WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
SELECT title FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo '=== T8: Owner UPDATE ==='
SET request.jwt.claims.sub TO 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
UPDATE public.tasks SET title = 'Own', priority = 'haute' WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
SELECT title, priority FROM public.tasks WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

RESET ROLE;
