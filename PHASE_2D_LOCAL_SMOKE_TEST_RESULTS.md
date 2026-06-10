# Phase 2D — Local nlc-v2 Smoke Test Results

Date: 2026-06-10
Tester:
Environment: Local app against `nlc-v2`

No secrets, passwords, tokens, service-role keys, OAuth secrets, cookies, auth callback tokens, or full connection strings should be recorded here.

## Summary

| Item | Result | Notes |
|---|---|---|
| Local env shape verified without values | Not run | |
| App started locally | Not run | |
| Google login | Not run | |
| `/auth/callback` | Not run | |
| Dashboard | Not run | |
| Restored data visible | Not run | |
| Workspace not unexpectedly empty | Not run | |
| Entries | Not run | |
| Create/edit/delete entry | Not run | |
| Stats | Not run | |
| Habits | Not run | |
| Goals | Not run | |
| Workspace members | Not run | |
| Logout/login | Not run | |
| Splash hydration console check | Not run | |

Overall result: Not run

## Automation Precheck

These commands are allowed for Phase 2D and were run by Codex in this environment.

| Command | Result | Notes |
|---|---|---|
| `git status --short` | Completed | Repo has existing staged/modified work from previous phases. |
| `npm run prisma:validate` | Blocked | `prisma: command not found` |
| `npm run lint` | Blocked | `eslint: command not found` |
| `npm run typecheck` | Blocked | `tsc: command not found` |
| `npm run test` | Blocked | `tsx: command not found` |

## Local Env Shape Checklist

Do not paste values.

- [ ] `.env.local` exists locally if needed.
- [ ] `.env.local` is ignored by git.
- [ ] `NEXT_PUBLIC_SUPABASE_URL=<redacted project base url>` is configured.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is not an auth callback URL.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY=<redacted anon public key>` is configured.
- [ ] `DATABASE_URL=<redacted runtime database url>` is configured.
- [ ] `DIRECT_URL=<redacted maintenance database url>` is configured if needed.
- [ ] No old production Supabase keys are intentionally used for this local `nlc-v2` smoke test.

Notes:

```text

```

## Manual Smoke Test Results

Use `Pass`, `Fail`, `Skipped`, or `Blocked`.

| Step | Result | Notes |
|---|---|---|
| Initial load and splash | Not run | |
| `/login` loads | Not run | |
| Google login opens | Not run | |
| Google OAuth completes | Not run | |
| `/auth/callback` completes | Not run | |
| Dashboard loads | Not run | |
| Expected restored data visible | Not run | |
| Workspace is not unexpectedly empty | Not run | |
| Workspace switcher/context correct | Not run | |
| Entries page loads | Not run | |
| Old entries visible | Not run | |
| Create temporary entry | Not run | |
| Edit temporary entry | Not run | |
| Delete temporary entry | Not run | |
| Stats page loads | Not run | |
| Habits page loads | Not run | |
| Goals page loads | Not run | |
| Workspace members visible | Not run | |
| Logout works | Not run | |
| Login again works | Not run | |
| No splash hydration mismatch | Not run | |
| No auth/session/workspace console errors | Not run | |

## User/Workspace Matrix

Use neutral labels only. Do not record names, emails, or secrets.

| Test identity | Expected workspace | Result | Notes |
|---|---|---|---|
| Real user A | Shared legacy workspace | Not run | |
| Real user B | Shared legacy workspace | Not run | |
| Real user C | Private restored workspace | Not run | |

## Temporary Test Entry

Only fill this if a temporary entry was created.

| Field | Value |
|---|---|
| Temporary title | |
| Workspace label | |
| Created | Not run |
| Edited | Not run |
| Deleted | Not run |
| Cleanup complete | Not run |

## Failures / Blockers

| Step | Severity | Redacted details | Owner | Next action |
|---|---|---|---|---|
| | | | | |

## Final Decision

- [ ] Pass: local `nlc-v2` smoke test is clean.
- [ ] Blocked: cannot run locally due to environment/tooling.
- [ ] Fail: do not proceed to Vercel Preview.

Decision notes:

```text

```
