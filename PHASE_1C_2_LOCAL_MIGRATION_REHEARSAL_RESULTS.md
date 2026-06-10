# Phase 1C-2 — Local Migration Rehearsal Results

Run date: 2026-06-10

## 1. Executive summary

Phase 1C-2 was completed on the local production clone only.

Result: **successful local rehearsal**.

The local clone was migrated from the production-drifted schema to the current local Prisma migration state. The one known `Entry.workspaceId IS NULL` row was repaired locally after migration. Final preflight and postflight checks are clean. `npm run check` passed completely.

Production was not modified.

Key outcome:

- local clone target verified: `localhost:54322/nlc_clone`;
- missing June 10 migrations applied successfully on clone;
- `npx prisma migrate status`: database schema is up to date;
- data repair for `cmplbqbg4000a04i9mbuxbe7x`: `UPDATE 1`;
- final workspace/category/money/invite checks: all expected-zero checks are `0`;
- tests: `73 passed / 0 failed`;
- Next.js build: passed with Next.js `16.2.4` / Turbopack.

## 2. Target locale verificato

Both Prisma connection variables were verified as local before migration/repair.

| Env var | Host | Port | Database | User | Result |
|---|---|---:|---|---|---|
| `DATABASE_URL` | `localhost` | `54322` | `nlc_clone` | `postgres` | local only |
| `DIRECT_URL` | `localhost` | `54322` | `nlc_clone` | `postgres` | local only |

No production connection string, password, or token was printed.

## 3. Stato iniziale clone

The local clone reflected the known production state from Phase 1A/1B before migration.

| Check | Initial clone value |
|---|---:|
| `Entry.workspaceId IS NULL` | 1 |
| `Habit.workspaceId IS NULL` | 0 |
| `Goal.workspaceId IS NULL` | 0 |
| `QuickPreset.workspaceId IS NULL` | 0 |
| `Category.workspaceId IS NULL` | 0 |
| `Entry.category.workspace mismatch` | 13 |
| `Habit.category.workspace mismatch` | 0 |
| `QuickPreset.category.workspace mismatch` | 0 |
| `EntryBeneficiary user not member` | 0 |
| `WorkspaceMember duplicates` | 0 |

Expected schema-drift errors were present before migration because the clone had not yet received the local June 10 migrations:

- missing `Entry.mode`;
- missing `Entry.savingContext`;
- missing `WorkspaceInvite.usedCount`.

## 4. Migration applicate

`npx prisma migrate deploy` was executed against the local clone only.

Applied migrations:

1. `20260610120000_add_entry_mode_saving_context`
2. `20260610130000_harden_workspace_invites`
3. `20260610140000_scope_categories_to_workspace`
4. `20260610150000_add_entry_stats_indexes`

Post-migration status:

- `npx prisma migrate status`: **Database schema is up to date**.
- `npm run prisma:validate`: **passed**.

Important migration behavior verified on clone:

- `Entry.mode` and `Entry.savingContext` were added and backfilled.
- `WorkspaceInvite` hardening columns were added.
- Category uniqueness was moved from global `name`/`slug` uniqueness to workspace-scoped uniqueness.
- The category workspace-scoping migration resolved the known non-null `Entry.category.workspace mismatch` rows.
- Entry stats indexes were added.

## 5. Repair locale applicato

One local-only repair was applied after verifying the target was local and the row matched the known safe condition.

Target entry:

| Field | Value |
|---|---|
| Entry ID | `cmplbqbg4000a04i9mbuxbe7x` |
| Title | `Caffè evitato` |
| Original `workspaceId` | `NULL` |
| Category workspace | `legacy-marian-martina` |
| Assigned `workspaceId` | `legacy-marian-martina` |
| Result | `UPDATE 1` |

Repair applied on local clone only:

```sql
UPDATE "Entry"
SET "workspaceId" = 'legacy-marian-martina'
WHERE id = 'cmplbqbg4000a04i9mbuxbe7x'
  AND "workspaceId" IS NULL;
```

No generic category repair was needed after the migration because category mismatches became `0`.

## 6. Preflight finale

Final preflight after local migration and repair was clean.

| Check | Final value |
|---|---:|
| `Entry.workspaceId IS NULL` | 0 |
| `Habit.workspaceId IS NULL` | 0 |
| `Goal.workspaceId IS NULL` | 0 |
| `QuickPreset.workspaceId IS NULL` | 0 |
| `Category.workspaceId IS NULL` | 0 |
| `Entry.category.workspace mismatch` | 0 |
| `Habit.category.workspace mismatch` | 0 |
| `QuickPreset.category.workspace mismatch` | 0 |
| `EntryBeneficiary user not member` | 0 |
| `WorkspaceMember duplicates` | 0 |
| `WorkspaceInvite.tokenHash null/blank` | 0 |
| `WorkspaceInvite.tokenHash invalid` | 0 |
| `WorkspaceInvite expires before createdAt` | 0 |
| `WorkspaceInvite usedCount exceeds maxUses` | 0 |
| `Entry money domain checks` | 0 |

Interpretation: the local clone is clean for the workspace/category/invite/money checks covered by the Phase 1A scripts.

## 7. Postflight finale

Final postflight after local migration and repair was clean.

| Check group | Result |
|---|---:|
| all expected zero counts | 0 |
| category duplicate slug/name | 0 |
| entry money domain counts | 0 |

Interpretation: the current migration + one-row repair sequence is viable on a restored clone.

## 8. Check finale

`npm run check` passed completely.

| Gate | Result |
|---|---|
| Prisma validate | passed |
| ESLint | passed |
| TypeScript | passed |
| Tests | `73 passed / 0 failed` |
| Next.js build | passed |

Build details:

- Next.js `16.2.4`;
- Turbopack enabled;
- production build passed.

Non-blocking warning remaining:

- Node `[DEP0205] module.register() is deprecated`.

### Related TLS fix included before rehearsal

The local Prisma rehearsal required a targeted DB URL normalization fix:

- `src/lib/database-config.ts` no longer forces `sslmode=require` for local DB hosts: `localhost`, `127.0.0.1`, `::1`, `[::1]`.
- Non-local/Supabase hosts still keep SSL-required behavior.
- `normalizeRuntimeDatabaseUrl()` still adds `pgbouncer=true` for Supabase transaction pooler `:6543` when missing.
- `getMigrationDatabaseUrl()` works with local `DIRECT_URL` without forcing TLS.
- `src/lib/database-config.test.ts` adds DB URL normalization tests.

This is why `npx prisma migrate status` and local migration rehearsal can use `localhost:54322` without Prisma attempting TLS.

## 9. Implicazioni per production / nuovo Supabase

The safe path is still **not** to mutate old production directly.

Recommended production strategy remains:

1. take a fresh production dump;
2. restore into a clean local clone;
3. repeat this exact migration + repair sequence locally;
4. restore/migrate into the new Supabase project or a staging clone;
5. run preflight/postflight there;
6. only then perform cutover.

For old production:

- do not run `npx prisma migrate deploy` directly without a fresh backup and approved runbook;
- do not run ad-hoc repair SQL directly;
- do not use `db push`;
- do not bypass the verified migration order.

For the new Supabase project:

- apply the verified migration sequence after restoring the production dump;
- apply the one-row workspace repair if the row still exists and still matches the same safe condition;
- verify email-based auth mapping after users log in;
- confirm normalized user emails have no duplicates before relying on email fallback.

## 10. Runbook preliminare per la futura esecuzione sicura

This is a preliminary runbook only. It must be re-run against a fresh dump before any real cutover.

### A. Prepare fresh clone

1. Set `PROD_DATABASE_URL` and `LOCAL_DATABASE_URL` in a private shell.
2. Verify sanitized targets:

```bash
node scripts/db/print-db-target.js PROD_DATABASE_URL
node scripts/db/print-db-target.js LOCAL_DATABASE_URL
```

3. Dump production read-only:

```bash
npm run db:dump:prod -- backups/prod-YYYY-MM-DD.dump
```

4. Restore locally:

```bash
npm run db:restore:local -- backups/prod-YYYY-MM-DD.dump
```

5. Point Prisma to local only:

```bash
export DATABASE_URL='postgresql://postgres:REDACTED@localhost:54322/nlc_clone?sslmode=disable'
export DIRECT_URL='postgresql://postgres:REDACTED@localhost:54322/nlc_clone?sslmode=disable'
node scripts/db/print-db-target.js DATABASE_URL
node scripts/db/print-db-target.js DIRECT_URL
```

### B. Verify initial clone

```bash
npm run db:preflight:workspace
npx prisma migrate status
```

Expected before migration:

- June 10 migrations missing;
- 1 null `Entry.workspaceId`;
- 13 `Entry.category.workspace mismatch` rows;
- expected missing-column errors in preflight if run before schema migration.

### C. Apply migrations on clone/new Supabase only

```bash
npx prisma migrate deploy
npx prisma migrate status
npm run prisma:validate
```

Expected:

- four June 10 migrations applied;
- database schema up to date.

### D. Apply one-row repair only if condition still matches

Before repair, verify:

```sql
SELECT e.id, e.title, e."workspaceId", e."categoryId", c."workspaceId" AS category_workspace_id
FROM "Entry" e
JOIN "Category" c ON c.id = e."categoryId"
WHERE e.id = 'cmplbqbg4000a04i9mbuxbe7x';
```

Only if `Entry.workspaceId IS NULL` and `category_workspace_id = 'legacy-marian-martina'`, run:

```sql
UPDATE "Entry"
SET "workspaceId" = 'legacy-marian-martina'
WHERE id = 'cmplbqbg4000a04i9mbuxbe7x'
  AND "workspaceId" IS NULL;
```

Expected: `UPDATE 1`.

If the row differs, stop and make a manual decision.

### E. Final verification

```bash
npm run db:preflight:workspace
npm run db:postflight:workspace
npm run check
```

Expected:

- all workspace/category/invite/money issue counts are `0`;
- `npm run check` passes.

## 11. Rischi residui

1. The rehearsal used a clone; old production remains drifted until a separate approved cutover/runbook is executed.
2. Production-only migrations remain absent from the local migration folder, although local rehearsal reached up-to-date status after restoring the production `_prisma_migrations` table.
3. The one-row repair is safe only while the row still matches the same condition. It must be re-verified on the fresh cutover target.
4. Email-based auth mapping still depends on stable, normalized, non-duplicated emails.
5. The Node `[DEP0205] module.register() is deprecated` warning remains non-blocking but should be cleaned later.
6. The TLS fix must remain in place for local clone rehearsal and any local Supabase/Postgres migration workflow.
7. A rollback plan for a real cutover must be based on fresh dump/restore artifacts, not on this rehearsal report alone.

## 12. Cosa NON è stato fatto

- No old production migration was executed.
- No old production repair SQL was executed.
- No old production data was modified.
- No `prisma db push` was used.
- No UI code was changed as part of this report update.
- No business logic refactor was performed.
- No destructive production operation was performed.
- No secrets, passwords, tokens, or full connection strings were printed.
