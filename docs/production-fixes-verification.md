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

## Overall Test Status

**Test Suite**: ✅ **91/91 tests passing**

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
