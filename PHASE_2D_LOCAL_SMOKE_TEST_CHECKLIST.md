# Phase 2D — Local nlc-v2 Smoke Test Checklist

Date: 2026-06-10

Scope: manual local smoke test checklist for the app running against the new Supabase project `nlc-v2`.

This document is operational only. It does not execute DB queries, migrations, env changes, Vercel changes, Supabase changes, or Production changes.

## Safety Rules

- Do not print `.env.local` contents.
- Do not paste secrets, tokens, passwords, service-role keys, OAuth secrets, or full connection strings into reports or chat.
- Do not run `psql`, `npm run db:*`, `prisma migrate`, or `prisma db push` during this smoke test.
- Do not change Vercel Production.
- Do not change Supabase Production.
- Do not manually zip the repo for this phase.
- If test data is created, delete it through the UI before closing the session.
- If delete behavior is unclear, do not create persistent test data in a real workspace.

## Preconditions

Before starting local smoke testing, confirm these are true:

- Phase 2A repository/archive hygiene is complete.
- Phase 2B secret rotation checklist exists and no rotation is in progress.
- Phase 2C splash hydration fix is applied or consciously deferred.
- Local app is intended to target `nlc-v2`, not old production.
- Supabase Auth Google provider is configured for `nlc-v2`.
- Supabase Auth local redirect URLs include:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/**`
- Real users test with the same normalized email addresses used in the restored data.

## Local Env Verification Without Values

Do not open or print `.env.local`. Verify only presence and shape.

Manual checks:

- [ ] `.env.local` exists locally if needed.
- [ ] `.env.local` is ignored by git.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is configured.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` points to the `nlc-v2` project base URL, not `/auth/v1/callback`.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is configured for `nlc-v2`.
- [ ] `DATABASE_URL` is configured for local runtime.
- [ ] For final Vercel runtime parity, `DATABASE_URL` shape is Transaction pooler `:6543` with `pgbouncer=true`.
- [ ] `DIRECT_URL` is configured only if needed for local maintenance tooling.
- [ ] `DIRECT_URL` shape is Session pooler `:5432` if present.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is absent unless the app explicitly needs it server-side.
- [ ] No value from `.env.local` is copied into this checklist or results file.

Allowed non-secret checks:

```bash
git status --short
```

Do not run DB target scripts in this phase because the prompt forbids `npm run db:*` and DB checks.

## Start Local App

Use the normal dev command only after dependencies are available:

```bash
npm run dev
```

If dependencies are missing, stop and record the blocker in `PHASE_2D_LOCAL_SMOKE_TEST_RESULTS.md`.

## Browser Setup

Recommended browser procedure:

- [ ] Open a fresh private/incognito window.
- [ ] Open developer console.
- [ ] Preserve logs if possible.
- [ ] Clear existing app cookies/session for `localhost:3000` if previous auth state may interfere.
- [ ] Navigate to `http://localhost:3000`.

Do not paste secrets into browser console.

## Smoke Test Flow

### 1. Initial Load and Splash

- [ ] App loads without a white screen.
- [ ] Splash displays and exits normally.
- [ ] Console has no hydration mismatch for `FlameSplash`, `AppSplash`, `SplashGate`, or `RootLayout`.
- [ ] No uncaught client errors appear before login.

### 2. Login Page

- [ ] `/login` loads.
- [ ] Google login button/control is visible.
- [ ] Login copy and controls are usable on mobile width.
- [ ] No provider/config error appears before clicking login.

### 3. Google Login

- [ ] Click Google login.
- [ ] Google account chooser opens.
- [ ] Select an approved real test account.
- [ ] OAuth completes without warning or provider error.
- [ ] App redirects back to the local app.

### 4. `/auth/callback`

- [ ] Browser reaches `/auth/callback` during the flow.
- [ ] Callback does not show an error page.
- [ ] Callback completes and redirects to the authenticated app route.
- [ ] No stale old-project auth URL appears in the address bar or console.

### 5. Dashboard

- [ ] Dashboard loads after login.
- [ ] Dashboard is not empty for a user expected to have restored data.
- [ ] Totals/cards render without server or client error.
- [ ] Recent entries or expected summaries are visible.
- [ ] No workspace bootstrap/onboarding screen appears unexpectedly for an existing user.

### 6. Workspace Context

- [ ] Workspace switcher or workspace shell is visible where expected.
- [ ] Current workspace is the expected restored workspace for this user.
- [ ] Workspace is not an unexpected empty private workspace.
- [ ] Existing memberships are visible where the UI exposes them.
- [ ] Switching between available workspaces does not expose data from unauthorized workspaces.

### 7. Entries

- [ ] Entries page loads.
- [ ] Old entries are visible for the expected workspace.
- [ ] Entry category labels render.
- [ ] Entry person/member/beneficiary display does not crash.
- [ ] Pagination or list loading works if present.
- [ ] Empty state does not appear when restored entries are expected.

### 8. Create/Edit/Delete Entry Test

Use a clearly identifiable temporary entry name, for example `Smoke test local nlc-v2`.

- [ ] Create entry form opens.
- [ ] Required fields can be filled.
- [ ] Category selection works.
- [ ] Amount parsing works for a normal euro amount.
- [ ] Save creates the entry.
- [ ] Created entry appears in the expected workspace.
- [ ] Edit the temporary entry.
- [ ] Edited values persist after navigation or refresh.
- [ ] Delete the temporary entry.
- [ ] Deleted entry no longer appears.
- [ ] If delete is not available or uncertain, record the entry ID/title and stop before creating more test data.

### 9. Stats

- [ ] Stats page loads.
- [ ] Charts/summary sections render.
- [ ] Category/time summaries do not show obvious zero-only data when restored data exists.
- [ ] No client chart error appears in console.
- [ ] Mobile layout remains readable.

### 10. Habits

- [ ] Habits page loads.
- [ ] Existing habits are visible where expected.
- [ ] Habit occurrence controls render.
- [ ] Marking/toggling is not tested unless safe for the selected workspace.
- [ ] If a safe toggle is tested, revert it before closing the session.

### 11. Goals

- [ ] Goals page loads.
- [ ] Existing goals are visible where expected.
- [ ] Goal progress renders without crash.
- [ ] Create/edit actions are not tested unless safe and reversible.

### 12. Workspace Members

- [ ] Workspace members page or section loads.
- [ ] Expected members are visible for the current workspace.
- [ ] Roles/status labels render correctly.
- [ ] No unknown user appears unexpectedly.
- [ ] No member from a different workspace appears unexpectedly.

### 13. Logout/Login

- [ ] Logout works.
- [ ] User returns to public/login state.
- [ ] Refresh after logout does not restore authenticated app accidentally.
- [ ] Login again with the same Google account.
- [ ] App returns to the same expected workspace and restored data.

## Legacy Workspace/User Notes

Use neutral labels in result files. Do not record personal emails, secrets, or OAuth details.

Recommended labels:

- `Real user A`: primary restored account.
- `Real user B`: second restored account, if available.
- `Shared legacy workspace`: restored shared workspace with old data.
- `Private restored workspace`: restored private workspace for a single user.

Checks:

- [ ] Real user A sees the expected shared legacy workspace.
- [ ] Real user A sees expected old entries.
- [ ] Real user B sees the expected shared legacy workspace, if applicable.
- [ ] Real user B sees expected old entries, if applicable.
- [ ] Private restored workspace user sees only their expected private data.
- [ ] No real user lands in a brand-new empty workspace unless that is expected for that account.

Hard stop:

- If any restored user lands in an empty workspace unexpectedly, stop. This suggests auth/email mapping, env target, or workspace provisioning is wrong.

## Error Collection

For each failure, record:

- Step name.
- URL path only, not full URL with tokens or query secrets.
- User label only, not email.
- Expected result.
- Actual result.
- Console error summary, redacted.
- Screenshot filename if one is captured locally.

Do not paste auth callback tokens, cookies, local storage values, or full request URLs.

## Pass Criteria

Local smoke test passes only if:

- Google login works.
- `/auth/callback` completes.
- Dashboard loads.
- Expected restored data is visible.
- Workspace is not unexpectedly empty.
- Entries, stats, habits, goals, and workspace members load.
- Create/edit/delete entry test passes or is explicitly skipped with a safe reason.
- Logout/login cycle works.
- No hydration mismatch appears for the splash stack.
- No DB/auth errors appear in browser-visible UI.

## Fail Criteria

Fail and stop if:

- Login targets old Supabase unexpectedly.
- `/auth/callback` fails.
- Existing user lands in an empty workspace unexpectedly.
- Old data is not visible for an account that should have restored data.
- Any cross-workspace data exposure is suspected.
- Entry create/edit/delete writes into the wrong workspace.
- Console shows persistent auth/session/workspace errors.

## Output

Record results in:

```text
PHASE_2D_LOCAL_SMOKE_TEST_RESULTS.md
```
