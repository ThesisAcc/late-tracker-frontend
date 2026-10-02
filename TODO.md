# Role-Based Dashboard Separation - Implementation Plan

## Overview
Separate worker and admin dashboards with role-based access control.
- Backend already has: `ADMIN` / `EMPLOYEE` roles, separate endpoints
- Frontend needs: route guards, role-based redirects, worker auto-bind

---

## Phase 1: Auth Types & Context

### 1.1 Update `src/lib/auth.ts`
- [x] Add `UserRole` type: `'ADMIN' | 'EMPLOYEE'`
- [x] Add `isAdmin(user)`, `isEmployee(user)` helpers
- [x] Ensure `AuthenticatedUser.role` matches backend values

### 1.2 Create `src/hooks/useAuth.ts`
- [x] Export `useAuth()` hook returning `{ user, isAuthenticated, isAdmin, isEmployee }`
- [x] Read from localStorage via existing `getAuthUser()`
- [x] Handle null/undefined gracefully

---

## Phase 2: Route Guard Component

### 2.1 Create `src/components/RequireRole.tsx`
- [x] Props: `allowedRoles: UserRole[]`, `children: ReactNode`, `fallback?: ReactNode`
- [x] Use `useAuth()` to get current user role
- [x] If unauthenticated → redirect to `/login`
- [x] If authenticated but role not allowed → show 403 or redirect to appropriate dashboard
- [x] Render children if allowed

---

## Phase 3: Update Routing (App.tsx)

### 3.1 Wrap Routes with Role Guards
- [x] `/manager` → `<RequireRole roles={['ADMIN']}><ManagerDashboard /></RequireRole>`
- [x] `/worker` → `<RequireRole roles={['EMPLOYEE']}><WorkerDashboard /></RequireRole>`

### 3.2 Add Default Route Redirect
- [x] `/` → redirect based on role: ADMIN → `/manager`, EMPLOYEE → `/worker`
- [x] Handle unauthenticated → `/login`

### 3.3 Post-Login Redirect
- [x] After successful login, navigate to role-appropriate dashboard
- [x] Update `LoginPage` or `App` to handle redirect

---

## Phase 4: Worker Dashboard - Auto-Bind to Logged-In Employee

### 4.1 Modify `src/features/worker/WorkerDashboard.tsx`
- [ ] Remove props: `selectedWorkerId`, `onWorkerChange`, `workers` array
- [ ] Remove worker dropdown UI (lines 54-79, 98-113)
- [ ] Use `fetchMyDashboard()` from `dashboardApi.ts` directly
- [ ] Add loading/error states
- [ ] Display single worker's data (from API response)
- [ ] Keep month selector, metric cards, monthly breakdown

### 4.2 Update WorkerDashboard Types
- [ ] New props interface: only `selectedMonth`, `onMonthChange`
- [ ] Internal state: `dashboardData`, `isLoading`, `error`

---

## Phase 5: Manager Dashboard - Verify Admin Data Flow

### 5.1 Verify `src/features/manager/ManagerDashboard.tsx`
- [ ] Confirm it works with admin dashboard API (already uses `serverRepository.load()`)
- [ ] Ensure `onOpenImport` still works for admins
- [ ] No changes needed if data flow works

### 5.2 Check Server Repository
- [ ] Confirm `serverRepository.ts` loads admin dashboard for ADMIN role
- [ ] Verify `load()` method handles both roles correctly (lines 92-96)

---

## Phase 6: AppHeader - Simplify Navigation

### 6.1 Update `src/components/AppHeader.tsx`
- [ ] Remove Manager/Worker view links (lines 37-43)
- [ ] Keep: brand, source badge, Import Excel (admin only), Sign out
- [ ] Optionally show current role badge

---

## Phase 7: Testing & Verification

### 7.1 Update Tests
- [ ] `App.test.tsx` - Add role-based redirect tests
- [ ] Test ADMIN login → redirects to `/manager`
- [ ] Test EMPLOYEE login → redirects to `/worker`
- [ ] Test unauthorized access → 403/redirect
- [ ] Test WorkerDashboard loads own data only

### 7.2 Manual Verification Checklist
- [ ] Login as ADMIN → lands on `/manager`, sees full dashboard + import
- [ ] Login as EMPLOYEE → lands on `/worker`, sees only own data, no dropdown
- [ ] Direct URL access: `/manager` as EMPLOYEE → 403/redirect
- [ ] Direct URL access: `/worker` as ADMIN → 403/redirect
- [ ] Sign out → returns to login
- [ ] Refresh page → maintains role-appropriate dashboard

---

## Phase 8: Cleanup & Polish

### 8.1 Remove Dead Code
- [ ] Unused imports in modified files
- [ ] Worker dropdown related code in WorkerDashboard
- [ ] Any unused types

### 8.2 Lint & Type Check
- [ ] Run `npm run lint`
- [ ] Run `npm run typecheck`
- [ ] Run `npm test`

---

## Notes

### Backend Role Mapping
| Backend | Frontend Display |
|---------|------------------|
| ADMIN   | "Manager" / "Admin" |
| EMPLOYEE| "Worker" / "Employee" |

### API Endpoints Used
- Employee: `GET /api/dashboard/my-stats` → `fetchMyDashboard()`
- Admin: `GET /api/admin/dashboard` → via `serverRepository.load()`

### Files Modified (Tracking)
- `src/lib/auth.ts`
- `src/hooks/useAuth.ts` (new)
- `src/components/RequireRole.tsx` (new)
- `src/App.tsx`
- `src/features/worker/WorkerDashboard.tsx`
- `src/components/AppHeader.tsx`
- `src/App.test.tsx` (updates)

---

## Resume Instructions
Run `cat TODO.md` to see progress. Check off items with `[x]` as completed.
Next session: Start with Phase 1 (Auth Types & Context).