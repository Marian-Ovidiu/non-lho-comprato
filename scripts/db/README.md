# Database Safety Checks

These SQL files support Phase 1 database migration rehearsals and cutover hardening.
Most preflight/postflight scripts are read-only. The known repair scripts are intentionally mutative and must only be run on a restored local clone, staging, or new Supabase target after review.

## Required Process

1. Take a production backup before any migration work.
2. Restore the backup into a clone database.
3. Verify the target database before every command that can modify data or schema.
4. Run the preflight checks against the clone first.
5. Review every non-zero `issue_count` and every detail row.
6. Only after the clone is understood and backed up should migration work be planned.
7. Run postflight checks after applying migrations and approved repairs to the clone.
8. Do not run destructive migrations directly in old production.

## Commands

Direct `psql` usage:

```bash
psql "$DATABASE_URL" -f scripts/db/preflight-workspace.sql
psql "$DATABASE_URL" -f scripts/db/preflight-auth-email-cutover.sql
psql "$DATABASE_URL" -f scripts/db/postflight-workspace.sql
```

Npm wrappers:

```bash
npm run db:target
npm run db:target:prod
npm run db:target:local
npm run db:preflight:workspace
npm run db:preflight:auth-cutover
npm run db:postflight:workspace
```

Mutative wrapper for clone/staging/new Supabase only:

```bash
npm run db:repair:known-workspace-drift
npm run db:repair:known-test-users
```

Do not run repair wrappers on old production.

## Expected Interpretation

- Preflight may report non-zero counts; those are migration inputs that need an explicit backfill or cleanup plan.
- Postflight is stricter: expected `issue_count` values are zero unless a migration runbook explicitly documents an exception.
- Category duplicate detail result sets should be empty before enforcing workspace-scoped uniqueness.
- Category/workspace mismatch counts should be zero after category scoping and workspace backfill.
- Beneficiary membership mismatches should be zero before relying on `EntryBeneficiary` for workspace-scoped reporting.
- Invite token hash checks should be zero before invite hardening is considered complete.
- Auth/email cutover checks should be clean before relying on email-based Supabase re-login mapping.

## Local Production Clone Rehearsal

Use this sequence for a local clone rehearsal. The local target must be `localhost`, `127.0.0.1`, or `::1`.

1. Dump old production in read-only mode:

```bash
npm run db:dump:prod -- backups/prod-YYYY-MM-DD.dump
```

2. Restore the dump into local Postgres:

```bash
npm run db:restore:local -- backups/prod-YYYY-MM-DD.dump
```

3. Point Prisma to the local clone for this shell only:

```bash
export DATABASE_URL='postgresql://postgres:REDACTED@localhost:54322/nlc_clone?sslmode=disable'
export DIRECT_URL='postgresql://postgres:REDACTED@localhost:54322/nlc_clone?sslmode=disable'
node scripts/db/print-db-target.js DATABASE_URL
node scripts/db/print-db-target.js DIRECT_URL
```

4. Run initial diagnostics:

```bash
npm run db:preflight:workspace
npm run db:preflight:auth-cutover
npx prisma migrate status
```

5. Apply migrations on the local clone only:

```bash
npx prisma migrate deploy
npx prisma migrate status
npm run prisma:validate
```

6. Run the known one-row workspace repair only if the row is still eligible:

```bash
npm run db:repair:known-workspace-drift
```

7. If auth/email preflight reports the known orphan test user and diagnostics show no memberships, owned workspaces, paid/created entries, or beneficiary entries, run the known test-user cleanup:

```bash
npm run db:repair:known-test-users
npm run db:preflight:auth-cutover
```

8. Run final checks:

```bash
npm run db:preflight:workspace
npm run db:postflight:workspace
npm run db:preflight:auth-cutover
npm run check
```

Expected final result: workspace/category/invite/money issue counts are zero, auth/email blockers are understood or clean, and `npm run check` passes.

## New Supabase/Staging Cutover Checklist

Use this sequence for staging or a new Supabase project. Do not use it against old production unless a separate approved production runbook explicitly says so.

For application-level cutover steps after the database target is clean, see `PHASE_1E_SUPABASE_V2_CUTOVER_CHECKLIST.md`.

1. Create a fresh read-only dump from old production.
2. Restore the dump into the new Supabase/staging database.
3. Verify target identity with sanitized output only:

```bash
node scripts/db/print-db-target.js DATABASE_URL
node scripts/db/print-db-target.js DIRECT_URL
```

4. Stop if the target is not the expected new Supabase/staging database.
5. Run workspace preflight:

```bash
npm run db:preflight:workspace
```

6. Run auth/email preflight:

```bash
npm run db:preflight:auth-cutover
```

7. If the only auth/email blocker is the known orphan test user, run cleanup only on the verified new Supabase/staging target and rerun auth/email preflight:

```bash
npm run db:repair:known-test-users
npm run db:preflight:auth-cutover
```

8. Apply migrations only on the verified new Supabase/staging target:

```bash
npx prisma migrate deploy
npx prisma migrate status
```

9. Run the known workspace drift repair only on the verified new Supabase/staging target:

```bash
npm run db:repair:known-workspace-drift
```

10. Run final workspace checks:

```bash
npm run db:preflight:workspace
npm run db:postflight:workspace
```

11. Run app verification:

```bash
npm run db:preflight:auth-cutover
npm run check
```

12. Only after the target is verified clean should app environment variables be cut over to the new Supabase project.

## Hard Stops

Stop immediately if any of these are true:

- `DATABASE_URL` or `DIRECT_URL` points to old production unexpectedly.
- The sanitized DB target is not the intended local clone, staging, or new Supabase database.
- `npm run db:preflight:auth-cutover` reports duplicate normalized emails and there is no manual resolution.
- The known repair script updates a row that is not the single expected entry.
- The known test-user cleanup deletes anything other than the single expected orphan user.
- `npm run db:postflight:workspace` reports non-zero expected-zero counts.
- `npm run check` fails.

## Never Do This In This Workflow

- Do not use `npx prisma db push`.
- Do not run `npm run db:repair:known-workspace-drift` on old production.
- Do not run `npm run db:repair:known-test-users` on old production.
- Do not run ad-hoc `UPDATE`, `DELETE`, `INSERT`, `ALTER`, `DROP`, or `TRUNCATE` statements on old production.
- Do not proceed if target verification is missing, ambiguous, or unexpected.
- Do not print passwords, tokens, service-role keys, or full connection strings.
