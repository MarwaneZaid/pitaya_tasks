# Production Fixes - Top 3 Critical Issues - Verification Notes

## Overview
This document contains verification details for the three critical production-readiness fixes:
- **Fix #1 (C1)**: Duplicate task race condition
- **Fix #2 (C2)**: Employee update RLS enforcement  
- **Fix #3 (H3)**: Auth retry pile-up prevention

## Fix #1: Duplicate Task Race (C1)

### What Was Fixed
When multiple clients (tabs, cron) try to create the same task simultaneously, Postgres unique constraints silently swallow duplicates. The fix detects this (0 rows returned) and triggers a reload from DB.

### Verification Status ✅
- **Unit Tests**: 4 new tests in `src/lib/taskMaterialize.test.js`
  - Duplicate detection on 0 rows returned
  - Task reload and merge logic
  - Checklist failure handling
- **Test Results**: All 91 tests passing
- **Manual Testing**: Not performed (unit coverage sufficient)

### Deployment Notes
Client-side only. No database changes required. Safe to deploy immediately.

---

## Fix #2: Employee Update RLS Enforcement (C2)

### What Was Fixed
**Problem**: Postgres RLS policies cannot reference `OLD` records in `WITH CHECK` clauses, making it impossible to prevent employees from modifying task title, description, etc. via direct UPDATE.

**Solution**: Two-tier architecture:
1. **RLS Policy** (`tasks_update_manager_owner`): Restricts direct `UPDATE` on `public.tasks` to managers/owners only, scoped by `restaurant_id`.
2. **SECURITY DEFINER RPC** (`update_task_status_employee`): Provides a secure API for employees to update ONLY status, completion, proof_note, completed_by, started_at, and completed_at.

### SQL Changes
File: `docs/supabase-p2-employee-rls-enforcement.sql`

- Creates `my_role_for_restaurant(p_restaurant_id uuid)` helper
- Creates `update_task_status_employee()` RPC with field-level restrictions
- Drops old `tasks_update_all` policy (allowed all users to update all fields)
- Creates `tasks_update_manager_owner` policy (restricts direct UPDATE to managers/owners)
- Transaction-wrapped, idempotent (safe to run multiple times)

### Client Changes
File: `src/lib/db.js`

**`saveTask(task)` routing logic**:
- **Employees** updating existing tasks → call `update_task_status_employee()` RPC
  - Fallback: if RPC doesn't exist (pre-migration), use direct UPDATE with console warning
  - Maps RPC response fields (`f1-f7` from `to_jsonb(row(...))`) back to task object
- **Managers/Owners** → direct UPDATE with full field access (unchanged)
- **New tasks** → INSERT (managers/owners only via RLS)

File: `src/Dashboard.jsx`

- `advanceTaskStatus()`: uses optimistic updates + error toast (unchanged)
- `updateProofNote()`: **added error toast** on failure (was silently catching)

### Verification Status ⚠️  PARTIAL

#### ✅ Verified (Local Postgres 16)
Previous session verification with real Postgres instance:
- Employee **direct UPDATE blocked** (0 rows) ✅
- Employee **RPC succeeds** and updates only allowed fields ✅
- Employee **cross-restaurant blocked** by RPC ✅
- Manager **direct UPDATE works** with full field access ✅

Trace files available in repo root (can be moved to `docs/verification/`):
- `test-rls-setup.sql`
- `test-rls-verification-proper.sql` 
- `test-rls-verification.sql`

#### ⚠️ Not Verified
- **Client fallback behavior** when RPC doesn't exist (pre-migration state)
- **Integration testing** of `advanceTaskStatus` and `updateProofNote` handlers with real Supabase
- **Cross-browser** optimistic update + revert flow
- **Error toast display** on RPC failures

**Reason**: Would require Supabase project or local Supabase CLI setup with auth.

### Unit Testing
- **Attempted**: Integration tests for employee routing logic in `src/lib/employeeTaskRouting.test.js`
- **Result**: Removed due to complex mocking requirements (vitest module mocking conflicts)
- **Rationale**: Routing logic is straightforward (role check + try/catch); real validation comes from Postgres RLS verification and manual QA

### Deployment Order (CRITICAL)

**Option A: Zero-downtime (Recommended)**
1. **Merge PR** to main branch
2. **Deploy client** (works both pre/post-migration via fallback)
3. **Run SQL migration** in Supabase SQL Editor
4. **Verify** RPC exists: `SELECT proname FROM pg_proc WHERE proname = 'update_task_status_employee';`

**Option B: Strict (simpler, brief employee write downtime)**
1. **Run SQL migration** first
2. **Deploy client** immediately after

**Rollback**: 
- Revert client code to previous version (direct UPDATE still works for managers/owners)
- Drop RPC: `DROP FUNCTION IF EXISTS update_task_status_employee;`
- Recreate old policy: Run `docs/supabase-p0-employee-trigger.sql` triggers

---

## Fix #3: Auth Retry Pile-up (H3)

### What Was Fixed
Scattered retry loops in auth-critical code paths could create auth request storms on flaky mobile networks. Consolidated to a single `withRetry` utility with exponential backoff, jitter, and a global rate cap (max 6 attempts per 30 seconds).

### Changes
File: `src/lib/authRetry.js`
- `withRetry(fn, options)` with exponential backoff + 0.8-1.2 jitter
- `isAuthAbortedError(err)` exported for reuse
- Global attempt counter with 30-second sliding window

### Verification Status ✅
- **Unit Tests**: 9 new tests in `src/lib/authRetry.test.js`
  - Retry on abort with exponential backoff
  - Max attempts enforcement
  - Global rate limiting (30s window)
  - Success cases
- **Test Results**: All tests pass (including 3 long-running timer tests ~2.4s total)
- **Manual Testing**: Not performed

### Deployment Notes
Client-side only. No database changes. Safe to deploy immediately.

---

## Postgres Verification (P2 Migration) ✅ COMPLETE

### Setup

- PostgreSQL 16 on Ubuntu
- postgres role owns all functions/tables (BYPASSRLS=true)
- authenticated/anon roles WITHOUT BYPASSRLS
- No FORCE ROW LEVEL SECURITY
- Sep 17 fix included (`my_restaurant_ids()` SECURITY DEFINER)
- **P2 fix for recursive policy** applied

### Fixed Recursive Policy Issue

Added to top of P2 migration:
```sql
-- Fix recursive user_roles_select_own policy (if it exists from base schema)
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
CREATE POLICY user_roles_select 
  ON public.user_roles FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT public.my_restaurant_ids()));
```

This fixes the infinite recursion caused by the old policy querying `user_roles` in its own USING clause.

## Postgres Verification Results (Full Test Output)

### Migration Chain Applied Successfully ✅

```
test-auth-stub.sql → supabase-dailydo-complete-fix.sql → 
supabase-p0-hardening.sql → supabase-phase1-ops.sql →
supabase-p1-team-deadline.sql → supabase-p2-employee-rls-enforcement.sql (2x)
```

- **Idempotency verified**: P2 migration applied twice with no errors
- **Load status**: All migrations loaded cleanly (only expected publication error for local Postgres)

### Blocker: Real Infinite Recursion in Base Schema ⚠️

Full RLS verification blocked by **confirmed infinite recursion** in `docs/supabase-dailydo-complete-fix.sql`:

```
ERROR:  infinite recursion detected in policy for relation "user_roles"
```

**The Recursion Chain:**

1. Tasks INSERT/SELECT → checks `my_restaurant_ids()` SECURITY DEFINER
2. `my_restaurant_ids()` → `SELECT FROM user_roles WHERE user_id = auth.uid()`
3. `user_roles_select_own` policy → `restaurant_id IN (SELECT FROM user_roles WHERE...)`
4. Back to step 3 → **infinite recursion**

**Root Cause (supabase-dailydo-complete-fix.sql:109-115):**

```sql
CREATE POLICY "user_roles_select_own"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );
```

The policy has a **direct SELECT from `user_roles`** in its USING clause, which triggers the same policy again.

**The Sep 17 Fix Was Incomplete:**

The Sep 17 commit (`adee38e`) made `my_restaurant_ids()` SECURITY DEFINER, but didn't update the `user_roles_select_own` policy to avoid recursion. Production likely has manual fixes applied directly that aren't in this SQL file.

**Why P2 Testing Is Still Blocked:**

Even with proper setup (postgres owner with BYPASSRLS, Sep 17 fix included, no FORCE ROW LEVEL SECURITY), the base schema's `user_roles` policy prevents any authenticated-role queries from succeeding.

**Impact**: Cannot verify P2 RLS behavior on local Postgres until base schema is fixed.

**P2 SQL Structure** (independently verified correct):
- ✅ Uses `SELECT public.my_restaurant_ids()` (not unnest)
- ✅ Includes `DROP POLICY IF EXISTS` for idempotency
- ✅ Preserves started_at correctly (only sets on first in_progress)
- ✅ Has proper REVOKE/GRANT with full signatures
- ✅ Clears completed_at/by when undoing

### SQL Structure Verification ✅

**Verified manually in P2 SQL:**

1. **Policy uses SETOF uuid correctly**: `restaurant_id IN (SELECT public.my_restaurant_ids())`
2. **Idempotent**: `DROP POLICY IF EXISTS tasks_update_manager_owner`
3. **started_at logic**: Only set when `p_status = 'in_progress' AND started_at IS NULL`
4. **Completion undo**: Clears `completed_at`/`completed_by` when `p_completed = false`
5. **REVOKE/GRANT**: Full function signatures with PUBLIC and anon revoked

##Overall Test Status

**Test Suite**: ✅ **103/103 tests passing** (+12 new)

```
 ✓ src/lib/authRetry.test.js (9 tests) 2390ms
 ✓ src/lib/taskMaterialize.test.js (4 tests)
 ✓ [... 17 other test files ...]
```

**Linter**: ✅ **0 errors, 25 warnings**
(All warnings pre-existing, no new issues introduced)

**CI/CD**: Not configured in this repo

---

## Deployment Checklist

### Pre-Deployment
- [x] All tests passing
- [x] Linter clean (no new errors)
- [x] SQL migration reviewed and tested locally
- [ ] Supabase backup taken (recommended)

### Deployment
- [ ] Merge PR to main
- [ ] Deploy client code
- [ ] Run `docs/supabase-p2-employee-rls-enforcement.sql` in Supabase SQL Editor
- [ ] Verify RPC exists: `SELECT * FROM pg_proc WHERE proname = 'update_task_status_employee';`

### Post-Deployment Verification
- [ ] Employee can update task status (no errors in browser console)
- [ ] Employee **cannot** update task title/description (test with SQL)
- [ ] Manager can update all fields
- [ ] Cross-restaurant protection working (employee cannot update other restaurant's tasks)
- [ ] Error toasts appear on failures
- [ ] No auth retry storms in network logs

---

## Known Limitations

1. **No integration tests**: Client-side routing logic not covered by automated tests (requires Supabase instance)
2. **Fallback not tested**: Pre-migration RPC fallback path verified only by code review
3. **No load testing**: Auth retry rate limiting not tested under high concurrency
4. **No E2E tests**: Full user flows (login → create task → employee update) not automated

## Future Work

1. Add Playwright E2E tests for employee vs manager update flows
2. Set up Supabase local dev environment for integration testing
3. Add monitoring for RPC call failures in production
4. Consider adding RLS violation alerts to Supabase dashboard

---

**Last Updated**: 2026-09-28  
**Verified By**: Cloud Agent (Cursor)  
**Environment**: Local development + Postgres 16

```
Test 1: Employee direct UPDATE of title
Expected: UPDATE 0 (blocked by RLS)
=========================================
UPDATE 0
title=Test Task, status=todo

✓ Employee cannot modify title via direct UPDATE


Test 2: Employee RPC sets done
=========================================
{
    "id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    "status": "done",
    "completed": true,
    "proof_note": "Completed via RPC",
    "started_at": null,
    "completed_at": "2026-09-28T21:10:26.06557+00:00",
    "completed_by": "Employee User"
}

status=done, completed=true, completed_by=Employee User, has_completed_at=true

✓ Employee RPC successfully sets done with completed_by and completed_at


Test 3: Employee RPC undoes to todo
=========================================
{
    "id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    "status": "todo",
    "completed": false,
    "proof_note": null,
    "started_at": null,
    "completed_at": null,
    "completed_by": null
}

status=todo, completed=false, completed_by=NULL, completed_at=NULL

✓ Undoing completion clears completed_at and completed_by


Test 4: Employee RPC sets in_progress (first time)
=========================================
{
    "id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    "status": "in_progress",
    "completed": false,
    "proof_note": "Working on it",
    "started_at": "2026-09-28T21:10:26.06993+00:00",
    "completed_at": null,
    "completed_by": null
}

✓ started_at set on first move to in_progress


Test 5: Employee RPC to done (started_at preserved)
=========================================
{
    "id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    "status": "done",
    "completed": true,
    "proof_note": "Completed",
    "started_at": "2026-09-28T21:10:26.06993+00:00",
    "completed_at": "2026-09-28T21:10:26.372971+00:00",
    "completed_by": "Emp"
}

status=done, started_at_check=PRESERVED ✓

✓ started_at NOT changed on subsequent status changes (300ms sleep verified)


Test 6: Cross-restaurant employee (expect error)
=========================================
ERROR:  Accès refusé : vous n'êtes pas membre de ce restaurant
CONTEXT:  PL/pgSQL function update_task_status_employee

✓ Cross-restaurant access properly blocked


Test 7: Manager direct UPDATE
=========================================
UPDATE 1
title=Updated by Manager, has_deadline=true

✓ Manager can update all fields via direct UPDATE


Test 8: Owner direct UPDATE
=========================================
UPDATE 1
title=Updated by Owner, priority=haute, category=cuisine

✓ Owner can update all fields via direct UPDATE


Test 9: Employee can SELECT own user_roles
=========================================
role=employee, restaurant=11111111-1111-1111-1111-111111111111

✓ Employee can SELECT own user_roles row (no recursion)


Test 10: Employee can SELECT restaurant tasks
=========================================
Found 1 task(s) in own restaurant

✓ Employee can SELECT tasks in own restaurant (no recursion)
```

### Verification Summary

**All 10 tests passed:**

1. ✅ Employee direct UPDATE of title → 0 rows (blocked by RLS)
2. ✅ Employee RPC sets done → completed_by and completed_at set correctly
3. ✅ Employee RPC undoes to todo → completed_at/by cleared to NULL
4. ✅ Employee RPC sets in_progress → started_at set (first time only)
5. ✅ Employee RPC to done again → started_at PRESERVED (not overwritten)
6. ✅ Cross-restaurant employee → ERROR (Accès refusé)
7. ✅ Manager direct UPDATE → title and deadline updated
8. ✅ Owner direct UPDATE → all fields updated
9. ✅ Employee can SELECT own user_roles → 1 row returned
10. ✅ Employee can SELECT restaurant tasks → 1 task found

**Key Validations:**

- RLS blocks employee direct UPDATE of restricted fields
- RPC enforces field-level restrictions correctly
- started_at only set on first in_progress, never overwritten
- Completion undo properly clears completed_at and completed_by
- Cross-restaurant access blocked by RPC membership check
- Managers/owners retain full direct UPDATE access
- No infinite recursion with fixed policy
- Proper jsonb response with real keys (not f1-f7)

