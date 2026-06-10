# Phase 2F — Production Cutover Runbook

Date: 2026-06-10

Scope: production cutover plan from old Supabase production to new Supabase `nlc-v2`.

Status: runbook only. This phase does not execute Production cutover.

No Vercel Production command, Vercel env change, Supabase env change, database command, migration, backup, restore, secret rotation, or old Supabase deletion was executed while creating this runbook.

## Operating Principle

Production cutover is allowed only after Vercel Preview is green against `nlc-v2`.

This runbook assumes:

- Preview deployment has already been validated.
- Preview login works.
- Restored data is visible in Preview.
- Preview logs have no DB/auth/runtime errors.
- The release artifact/repo hygiene work from Phase 2A is complete.
- Secret rotation is planned but not executed until after cutover verification.

## Target

| Field | Value |
|---|---|
| Target Supabase project name | `nlc-v2` |
| Target Supabase project ref | `nohezhrghqstxyyxbfhs` |
| Production cutover status | Not executed by this runbook |

No secrets or full connection strings are stored in this document.

## Prerequisites

### Preview Prerequisites

All must be true before touching Production:

- [ ] Phase 2E Vercel Preview deployment completed.
- [ ] Preview env uses `nlc-v2`, not old Supabase.
- [ ] Preview `NEXT_PUBLIC_SUPABASE_URL` is the project base URL, not `/auth/v1/callback`.
- [ ] Preview `DATABASE_URL` is Transaction pooler `:6543` with `pgbouncer=true`.
- [ ] Preview `DIRECT_URL` is Session pooler `:5432` or approved maintenance URL.
- [ ] Preview Google login works.
- [ ] Preview `/auth/callback` completes.
- [ ] Dashboard loads in Preview.
- [ ] Existing restored data is visible in Preview.
- [ ] No existing user lands in an unexpected empty workspace.
- [ ] Entries, stats, habits, goals, and workspace members load in Preview.
- [ ] Create/edit/delete entry smoke test passes or is explicitly skipped for a safe reason.
- [ ] Logout/login cycle works in Preview.
- [ ] Vercel Preview logs show no DB/auth/runtime errors.

### Repository / Build Prerequisites

- [ ] Phase 2A archive hygiene is clean.
- [ ] Release archive is generated via `npm run release:archive`, not manual zip.
- [ ] `unzip -l` archive denylist is clean.
- [ ] `.env.local` is ignored, untracked, and absent from archive.
- [ ] No dumps or local backup files are tracked/staged.
- [ ] The exact code to deploy is committed or otherwise intentionally selected.
- [ ] `npm run prisma:validate` passes in a dependency-complete environment.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] Production build passes in Preview or CI.

### Supabase Auth Prerequisites

For the `nlc-v2` project:

- [ ] Google provider is enabled.
- [ ] Google Client ID is configured.
- [ ] Google Client Secret is configured.
- [ ] Production domain callback is allowed.
- [ ] Production domain wildcard is allowed if required by project policy.
- [ ] Site URL is set to the intended canonical Production URL when ready.

Required Production redirect entries:

```text
https://<production-domain>/auth/callback
https://<production-domain>/**
```

Do not paste Google secrets into this or any report.

## Go / No-Go Gates

### Go

Proceed only if all are true:

- [ ] Preview is green.
- [ ] Current Production env values are securely saved for rollback.
- [ ] Decision is made: use existing validated `nlc-v2` or perform a fresh restore.
- [ ] If old production changed since the last dump, a fresh restore/migration/repair/check cycle has been completed on the cutover target.
- [ ] Final `nlc-v2` target checks are green.
- [ ] Production env values are prepared in redacted form.
- [ ] Rollback owner and timing are agreed.
- [ ] Old Supabase will remain online through rollback window.

### No-Go / Hard Stop

Stop immediately if any are true:

- [ ] Preview was not tested or failed.
- [ ] Any user lands in an unexpected empty workspace.
- [ ] Any cross-workspace data exposure is suspected.
- [ ] Production env rollback values were not saved securely.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is a callback URL instead of project base URL.
- [ ] `DATABASE_URL` is not Transaction pooler `:6543` with `pgbouncer=true`.
- [ ] `DIRECT_URL` target is missing or ambiguous.
- [ ] Final target DB state is stale because old production received new data after the restore and no fresh restore decision was made.
- [ ] Secret rotation is being attempted before cutover verification without an active incident.
- [ ] Old Supabase is scheduled for deletion before rollback window completion.

## Decision: Use Existing nlc-v2 or Fresh Restore

Before updating Vercel Production env, decide which path applies.

### Path A — Use Existing Validated `nlc-v2`

Use this path only if:

- [ ] Old production has had no meaningful new data since the fresh dump restored into `nlc-v2`.
- [ ] Phase 1D validation is still considered current.
- [ ] Preview has verified the same `nlc-v2` target.
- [ ] Product owner accepts that `nlc-v2` is the final cutover target.

Required evidence:

```text
Decision: Use existing validated nlc-v2
Approved by: <name>
Approval time: <timestamp>
Reason: <brief redacted note>
```

### Path B — Fresh Restore Into `nlc-v2` Before Cutover

Use this path if old production changed after the dump used for the current `nlc-v2` state.

This path requires a separate approved DB runbook execution. Do not run it from this document creation phase.

Required sequence in the approved DB runbook:

1. Take final read-only backup/dump of old production.
2. Restore into the intended cutover target.
3. Verify target identity using sanitized output only.
4. Apply migrations if needed.
5. Run approved repair scripts only on the verified target.
6. Run final workspace preflight/postflight checks.
7. Run final auth/email cutover checks.
8. Run app quality checks.
9. Re-run local/Preview smoke tests if the target changed.

Required evidence:

```text
Decision: Fresh restore before cutover
Approved by: <name>
Approval time: <timestamp>
Reason: old production changed after previous dump
Final validation report: <path>
```

## Securely Save Current Vercel Production Env For Rollback

Before changing Production env, save current Vercel Production env values securely.

Rules:

- Do not paste values into markdown.
- Do not paste values into chat.
- Do not commit values.
- Do not store values in `.env.local` unless that file is local-only, ignored, and access-controlled.
- Prefer a password manager or approved secret manager.
- Record only metadata in reports.

Redacted rollback record format:

```text
Rollback env saved: yes/no
Saved by: <name>
Storage: <password-manager-or-secret-store-name>
Timestamp: <timestamp>
Variables captured:
- NEXT_PUBLIC_SUPABASE_URL=<redacted old project base url>
- NEXT_PUBLIC_SUPABASE_ANON_KEY=<redacted old anon public key>
- DATABASE_URL=<redacted old runtime db url>
- DIRECT_URL=<redacted old maintenance db url>
- SUPABASE_SERVICE_ROLE_KEY=<absent or redacted if present>
```

Hard stop: do not proceed if rollback env is not saved.

## Production Env Update Shape

Update Vercel Production env only during the actual cutover window. Do not update during this document-only phase.

Required Production env shape:

```text
NEXT_PUBLIC_SUPABASE_URL=<redacted nlc-v2 project base url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<redacted nlc-v2 anon public key>
DATABASE_URL=<redacted nlc-v2 transaction pooler :6543 pgbouncer=true>
DIRECT_URL=<redacted nlc-v2 session pooler :5432>
```

Optional only if the app actually uses it server-side:

```text
SUPABASE_SERVICE_ROLE_KEY=<redacted nlc-v2 server-only service role key>
```

Rules:

- `NEXT_PUBLIC_SUPABASE_URL` must be the project base URL, not `/auth/v1/callback`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` must belong to `nlc-v2`.
- `DATABASE_URL` must use Transaction pooler port `6543` with `pgbouncer=true`.
- `DIRECT_URL` must use Session pooler port `5432` or another approved maintenance URL.
- Do not set service role key unless required.
- Do not expose service role key to any `NEXT_PUBLIC_` variable.
- Do not change Preview env while changing Production unless explicitly part of a separate step.

## Production Cutover Procedure

Execute only after go gates pass.

1. Announce start of cutover window.
2. Confirm no active incident or data freeze conflict.
3. Confirm rollback env values are saved securely.
4. Confirm old Supabase remains online.
5. Confirm final target decision: Path A or Path B.
6. Confirm Supabase Auth Production redirect URLs exist on `nlc-v2`.
7. Update Vercel Production env values to `nlc-v2` using the redacted shape above.
8. Redeploy Vercel Production.
9. Wait for deployment completion.
10. Open Production domain in a fresh private/incognito browser session.
11. Run post-deploy checks below.
12. Monitor Vercel logs and Supabase logs.
13. Record redacted outcome.

## Post-Deploy Checks

Run immediately after Production redeploy.

### Auth

- [ ] Production `/login` loads.
- [ ] Google login opens.
- [ ] Google OAuth completes.
- [ ] `/auth/callback` completes.
- [ ] User lands in authenticated app.

### Data Visibility

- [ ] Dashboard loads.
- [ ] Expected restored data is visible.
- [ ] Existing user does not land in an unexpected empty workspace.
- [ ] Workspace switcher/context shows expected workspaces.
- [ ] Old entries are visible.

### Core Pages

- [ ] Entries page loads.
- [ ] Stats page loads.
- [ ] Habits page loads.
- [ ] Goals page loads.
- [ ] Workspace members page/section loads.
- [ ] Reports/export routes do not error if tested safely.

### Write Smoke Test

Use a clearly identifiable temporary title, for example `Smoke test production nlc-v2`.

- [ ] Create temporary entry.
- [ ] Confirm it appears in the expected workspace.
- [ ] Edit temporary entry.
- [ ] Confirm edited value persists after refresh/navigation.
- [ ] Delete temporary entry.
- [ ] Confirm temporary entry is gone.

If delete behavior is uncertain, do not create persistent test data.

### Logout/Login

- [ ] Logout works.
- [ ] Refresh remains logged out.
- [ ] Login again with same Google account.
- [ ] Expected workspace and restored data remain visible.

### Logs

Record only redacted summaries.

- [ ] Vercel build logs have no relevant error.
- [ ] Vercel runtime logs have no DB connection error.
- [ ] Vercel runtime logs have no Supabase Auth callback error.
- [ ] Vercel runtime logs have no Prisma runtime error.
- [ ] Supabase Auth logs show expected login activity and no repeated callback failures.
- [ ] Supabase DB logs show no connection storm or pool exhaustion.

Redacted log format:

```text
Vercel build errors: none / redacted summary
Vercel runtime DB errors: none / redacted summary
Vercel runtime auth errors: none / redacted summary
Supabase auth errors: none / redacted summary
Supabase DB errors: none / redacted summary
```

## Rollback Plan

Rollback is allowed if any hard failure appears during the rollback window.

Rollback triggers:

- Google login fails in Production.
- `/auth/callback` fails.
- Existing users land in unexpected empty workspace.
- Restored data is not visible.
- Cross-workspace data exposure is suspected.
- Production runtime has persistent DB/auth errors.
- Write path creates data in wrong workspace.

Rollback procedure:

1. Stop new Production validation writes if possible.
2. Restore previous Vercel Production env values from secure rollback store.
3. Redeploy Production using old Supabase env values.
4. Test login against old Supabase.
5. Verify dashboard and old production data visibility.
6. Keep `nlc-v2` unchanged for forensic comparison.
7. Document failure with redacted logs.
8. Decide whether data written to `nlc-v2` during the failed window needs reconciliation.

Rollback caveat:

- If users write new data to `nlc-v2` after cutover, rollback can create data divergence.
- Decide before cutover whether to freeze writes during the cutover window or accept a manual reconciliation process.

## Old Supabase Retention Rule

Do not delete the old Supabase project until:

- [ ] Production has been stable through the agreed rollback window.
- [ ] Secret rotation has been completed or explicitly scheduled.
- [ ] Backups are verified and restorable.
- [ ] Product owner approves old project retirement.
- [ ] Any data divergence risk has been resolved.

Minimum recommendation: keep old Supabase online through the full rollback window and one additional observation period if feasible.

## Secret Rotation Timing

Do not rotate migration-era credentials before cutover unless there is an active incident.

After Production cutover is verified:

1. Confirm deploy/cutover verified.
2. Rotate DB password.
3. Update Vercel env.
4. Rotate Google client secret if necessary.
5. Invalidate old local env files.
6. Regenerate release archive with `npm run release:archive`.

Use `PHASE_2B_SECRET_ROTATION_CHECKLIST.md` as the source of truth for rotation categories and owner steps.

## Evidence Template

Use this redacted template during the real cutover.

```text
Cutover start: <timestamp>
Cutover owner: <name>
Preview verified: yes/no
Rollback env saved: yes/no
Target decision: existing nlc-v2 / fresh restore
Production env updated: yes/no
Production redeployed: yes/no
Post-deploy login: pass/fail
Post-deploy data visibility: pass/fail
Post-deploy core pages: pass/fail
Post-deploy write smoke: pass/fail/skipped
Logs checked: yes/no
Rollback needed: yes/no
Old Supabase retained: yes/no
Secret rotation scheduled: yes/no
```

## Validation Results In This Environment

These commands were run while creating this runbook and did not touch DB or Production.

### `npm run prisma:validate`

Status: passed.

### `npm run lint`

Status: passed.

### `npm run typecheck`

Status: passed.

### `npm run test`

Status: passed.

Test summary:

```text
73 passed / 0 failed
```

## This Phase Did Not Do

- Did not update Vercel Production env.
- Did not redeploy Production.
- Did not run Vercel Production commands.
- Did not run DB commands.
- Did not run migrations.
- Did not run backup/restore.
- Did not rotate secrets.
- Did not delete or modify old Supabase.
- Did not print or store secrets.
