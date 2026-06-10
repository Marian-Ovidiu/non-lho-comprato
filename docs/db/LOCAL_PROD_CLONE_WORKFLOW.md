# Local Production Clone Workflow

This workflow prepares a local clone of the Supabase production database so Phase 1 migrations and repairs can be rehearsed without touching production data.

## Why This Clone Exists

Production currently has schema drift and data issues identified by Phase 1A/1B. Running migrations or backfills directly on production would combine three risks at once:

- migration DDL risk;
- data repair risk;
- production availability risk.

The safe path is:

1. create a logical production dump using read-only tooling;
2. restore it into local Postgres;
3. run diagnostics, preflight, migrations, and repairs locally;
4. repeat until checks are clean;
5. only then prepare a separate production cutover plan.

## Never Do This On Production

Do not run any of these against production unless a later runbook explicitly says so:

```sql
UPDATE
DELETE
INSERT
ALTER
DROP
TRUNCATE
```

Do not run these against production during this phase:

```bash
npx prisma migrate deploy
npx prisma migrate dev
npx prisma db push
npm run db:postflight:workspace
```

`npm run db:postflight:workspace` is for local/clone verification after migrations have been rehearsed and the schema contains the expected columns.

## Environment Variables

Use separate variables so production and local targets cannot be confused.

```bash
export PROD_DATABASE_URL='postgresql://prod_user:prod_password@prod-host:6543/postgres'
export LOCAL_DATABASE_URL='postgresql://local_user:local_password@localhost:5432/non_lho_comprato_clone'
```

`PROD_DATABASE_URL` is only for `pg_dump`.
`LOCAL_DATABASE_URL` is for restore and local rehearsal.

Do not commit real URLs, passwords, service-role keys, or tokens.

## Verify DB Targets Without Secrets

The helper prints only host, port, database, and user.

```bash
node scripts/db/print-db-target.js PROD_DATABASE_URL
node scripts/db/print-db-target.js LOCAL_DATABASE_URL
npm run db:target
npm run db:target:prod
npm run db:target:local
```

The helper intentionally does not print passwords, tokens, or complete connection strings.

## Create A Read-Only Production Dump

The dump script uses PostgreSQL custom format because it restores cleanly with `pg_restore` and supports controlled local replay. It uses:

- `pg_dump --format=custom`;
- `--no-owner`;
- `--no-privileges`;
- `PGOPTIONS='-c default_transaction_read_only=on'`.

Example:

```bash
mkdir -p dumps
PROD_DATABASE_URL="$PROD_DATABASE_URL" npm run db:dump:prod -- dumps/prod-$(date +%Y%m%d-%H%M%S).dump
```

This does not modify production.

## Restore Into Local Postgres

The restore script accepts only clearly local hosts: `localhost`, `127.0.0.1`, or `::1`. It refuses Supabase-looking targets.

Create the local database first if needed:

```bash
createdb non_lho_comprato_clone
```

Restore:

```bash
LOCAL_DATABASE_URL="$LOCAL_DATABASE_URL" npm run db:restore:local -- dumps/prod-YYYYMMDD-HHMMSS.dump
```

The restore uses `pg_restore --clean --if-exists --no-owner --no-privileges`. It can overwrite local objects. Do not point it at production, staging, or any shared database.

## Point App Checks At The Local Clone

For one shell session only:

```bash
export DATABASE_URL="$LOCAL_DATABASE_URL"
node scripts/db/print-db-target.js DATABASE_URL
```

Confirm the printed host is local before running diagnostics.

## Run Local Diagnostics

Workspace checks:

```bash
npm run db:preflight:workspace
npm run db:postflight:workspace
```

User/email mapping diagnostics:

```bash
npm run db:user-relink:diagnostics
```

`db:postflight:workspace` may fail before local migrations are applied if the local clone still has production schema drift. That failure is useful evidence; do not run the postflight against old production.

## Email Pre-Cutover Checks

Run these on the local clone before relying on email-based auth mapping:

```sql
SELECT id, email, lower(email) AS normalized_email
FROM "User"
ORDER BY email;

SELECT lower(email), COUNT(*)
FROM "User"
WHERE email IS NOT NULL
GROUP BY lower(email)
HAVING COUNT(*) > 1;
```

Expected result: no duplicate normalized emails. If duplicates exist, stop and decide manually which application user owns the existing workspace/data relationships.

## Preparing For Phase 1C Repair Rehearsal

After restore, the local-only sequence is:

1. set `DATABASE_URL="$LOCAL_DATABASE_URL"`;
2. run `npm run db:preflight:workspace`;
3. inspect schema drift and dirty data counts;
4. apply missing migrations only to the local clone;
5. run candidate repair SQL only on the local clone;
6. run `npm run db:preflight:workspace` again;
7. run `npm run db:postflight:workspace` only after schema drift is resolved;
8. run `npm run db:user-relink:diagnostics` and email duplicate checks.

Do not promote any repair SQL to production until the clone run is repeatable, documented, and backed by a fresh backup/restore plan.
