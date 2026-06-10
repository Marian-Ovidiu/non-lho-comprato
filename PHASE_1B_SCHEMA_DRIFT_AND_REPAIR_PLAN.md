# Phase 1B — Schema Drift and Repair Plan

Run date: 2026-06-10

## 1. DB target

- host: `aws-0-eu-west-1.pooler.supabase.com`
- port: `6543`
- database: `postgres`
- user: `postgres.zhfxxwocobrfxkmwfxrt`
- environment: production
- read-only confirmation: only `SELECT` metadata/data diagnostics were executed. No migration, backfill, DDL, DML, Prisma migrate, or Prisma db push command was executed.

## 2. Migration drift

### Production migration status

Production `_prisma_migrations` contains 8 finished migrations and no rolled back migrations were reported.

| Migration | Production status | Local status | Notes |
|---|---|---|---|
| `20260501191500_baseline` | Applied | Not present locally | Production-only baseline. Likely squashed or removed locally. Needs explicit reconciliation in runbook. |
| `20260501175015_add_person_to_entry` | Applied | Not present locally | Production-only legacy migration. Local schema still has `Person` fields, but local migration folder does not include this migration. |
| `20260512153000_add_multi_account_foundation` | Applied | Present locally | Common. Adds multi-account foundation and nullable workspace scoping. |
| `20260513190000_add_workspace_invites` | Applied | Present locally | Common. Invite base table exists. |
| `20260517120000_add_entry_payer_beneficiaries` | Applied | Present locally | Common. Production still has legacy scalar `Entry.beneficiaries`. |
| `20260517140000_add_entry_beneficiary` | Applied | Present locally | Common. `EntryBeneficiary` exists. |
| `20260517150000_add_entry_first_of_day` | Applied | Present locally | Common. |
| `20260525153000_add_habit_scope_and_reminder` | Applied | Present locally | Common. |
| `20260610120000_add_entry_mode_saving_context` | Missing | Present locally | Adds `EntryMode`, `EntrySavingContext`, `Entry.mode`, `Entry.savingContext`. |
| `20260610130000_harden_workspace_invites` | Missing | Present locally | Adds invite hardening fields and `WorkspaceInviteType`. |
| `20260610140000_scope_categories_to_workspace` | Missing | Present locally | Drops global Category unique constraints, clones categories per workspace, updates references, adds workspace-scoped unique constraints. |
| `20260610150000_add_entry_stats_indexes` | Missing | Present locally | Adds Entry stats indexes. |

### Production-only migrations

- `20260501191500_baseline`
- `20260501175015_add_person_to_entry`

These are not automatically bad, but they must be accounted for before using local migrations as the production source of truth.

### Failed or rolled back migrations

- No `rolled_back_at` values were reported.
- No logs were reported in `_prisma_migrations`.

## 3. Missing columns

| Table | Column | Expected by local schema/migration | Present in production | Severity |
|---|---|---|---|---|
| `Entry` | `mode` | `20260610120000_add_entry_mode_saving_context` and local `schema.prisma` | No | Critical |
| `Entry` | `savingContext` | `20260610120000_add_entry_mode_saving_context` and local `schema.prisma` | No | Critical |
| `WorkspaceInvite` | `type` | `20260610130000_harden_workspace_invites` and local `schema.prisma` | No | Critical |
| `WorkspaceInvite` | `role` | `20260610130000_harden_workspace_invites` and local `schema.prisma` | No | Critical |
| `WorkspaceInvite` | `revokedAt` | `20260610130000_harden_workspace_invites` and local `schema.prisma` | No | Critical |
| `WorkspaceInvite` | `maxUses` | `20260610130000_harden_workspace_invites` and local `schema.prisma` | No | Critical |
| `WorkspaceInvite` | `usedCount` | `20260610130000_harden_workspace_invites` and local `schema.prisma` | No | Critical |
| `WorkspaceInvite` | `lastUsedAt` | `20260610130000_harden_workspace_invites` and local `schema.prisma` | No | Critical |

### Missing enums

| Enum | Expected by | Present in production | Severity |
|---|---|---|---|
| `EntryMode` | `20260610120000_add_entry_mode_saving_context` | No | Critical |
| `EntrySavingContext` | `20260610120000_add_entry_mode_saving_context` | No | Critical |
| `WorkspaceInviteType` | `20260610130000_harden_workspace_invites` | No | Critical |

### Index drift

| Table | Expected local state | Production state | Severity |
|---|---|---|---|
| `Category` | Unique indexes on `("workspaceId", slug)` and `("workspaceId", name)` | Global unique indexes on `slug` and `name` still exist | Critical |
| `Entry` | Composite indexes on `("workspaceId", date)`, `("workspaceId", "categoryId", date)`, `("workspaceId", "savedAmount", date)` | Only single-column workspace/user indexes and PK/unique habit occurrence index were reported | High |
| `WorkspaceInvite` | Composite indexes on `("workspaceId", "expiresAt")` and `("workspaceId", "revokedAt")` after hardening | Base indexes only; `revokedAt` column is missing | High |

### Extra production columns not represented in local Prisma schema

| Table | Column | Production status | Local schema status | Severity |
|---|---|---|---|---|
| `Entry` | `beneficiaries` | Present as legacy `Person[]` array | Not represented as a scalar field; local Prisma uses relation `EntryBeneficiary[]` with same field name | High |

This is schema drift risk. It may be intentional legacy retention, but it must be handled explicitly before destructive cleanup.

## 4. Null workspace entry

Production has one `Entry` with `workspaceId IS NULL`.

| Entry ID | Title | Date | Current workspaceId | Category | Category slug | Category workspace | createdByUserId | paidByUserId | Suggested assignment |
|---|---|---|---|---|---|---|---|---|---|
| `cmplbqbg4000a04i9mbuxbe7x` | `Caffè evitato` | `2026-05-25` | `NULL` | `Cibo` | `cibo` | `legacy-marian-martina` | `NULL` | `NULL` | `legacy-marian-martina`, based on category workspace only. Needs manual confirmation because creator/payer user evidence is missing. |

Interpretation:

- The category points to `legacy-marian-martina`.
- There is no `createdByUserId` or `paidByUserId` to corroborate membership.
- Recommendation: treat assignment to `legacy-marian-martina` as likely, but require manual approval before executing repair.

## 5. Category mismatch entries

Production has 13 `Entry` rows where `Entry.workspaceId IS DISTINCT FROM Category.workspaceId`.

None of the 13 rows currently has a matching category with the same slug in the entry workspace.

| Entry ID | Title | Date | Entry workspace | Current category | Current category workspace | Matching category in entry workspace exists? | Suggested repair |
|---|---|---|---|---|---|---|---|
| `cmq2nriny000304kvzklb5a0v` | `Tacos` | `2026-06-06` | `private-44976e8f-12a0-49d9-8324-3034af19941a` | `Delivery` / `delivery` | `legacy-marian-martina` | No | Clone/create `delivery` category in the private workspace, then remap entry. |
| `cmpv31gl9000104jrqv52ud9d` | `Panino` | `2026-06-01` | `private-44976e8f-12a0-49d9-8324-3034af19941a` | `Cibo` / `cibo` | `legacy-marian-martina` | No | Clone/create `cibo` category in the private workspace, then remap entry. |
| `cmpv32qc5000104jy9szadxa9` | `Colazione` | `2026-06-01` | `private-44976e8f-12a0-49d9-8324-3034af19941a` | `Caffè` / `caffe` | `legacy-marian-martina` | No | Clone/create `caffe` category in the private workspace, then remap entry. |
| `cmplbqbg4000a04i9mbuxbe7x` | `Caffè evitato` | `2026-05-25` | `NULL` | `Cibo` / `cibo` | `legacy-marian-martina` | No | First decide/assign workspace. If assigned to `legacy-marian-martina`, no category remap should be needed. |
| `cmpld36we000904jx2wzahys7` | `spesa lidl grossa` | `2026-05-24` | `legacy-marian-martina` | `Spesa` / `spesa` | `private-44976e8f-12a0-49d9-8324-3034af19941a` | No | Clone/create `spesa` category in legacy workspace, then remap entry. |
| `cmpii2q97000104lcp6tpt8wj` | `Bar mamma` | `2026-05-23` | `private-44976e8f-12a0-49d9-8324-3034af19941a` | `Svago` / `svago` | `legacy-marian-martina` | No | Clone/create `svago` category in the private workspace, then remap entry. |
| `cmpii11jf000104jvj2oo3fq8` | `Pranzo mamma` | `2026-05-23` | `private-44976e8f-12a0-49d9-8324-3034af19941a` | `Abbonamenti` / `abbonamenti` | `legacy-marian-martina` | No | Clone/create `abbonamenti` category in the private workspace, then remap entry. |
| `cmpii1yw6000404jvvlgi20ns` | `Diesel Peugeot` | `2026-05-23` | `private-44976e8f-12a0-49d9-8324-3034af19941a` | `Auto` / `auto` | `legacy-marian-martina` | No | Clone/create `auto` category in the private workspace, then remap entry. |
| `cmpea62ut000404ky7ldvuh4f` | `Regalo James Matrimonio` | `2026-05-20` | `private-44976e8f-12a0-49d9-8324-3034af19941a` | `Regali` / `regali` | `legacy-marian-martina` | No | Clone/create `regali` category in the private workspace, then remap entry. |
| `cmpbd6c31000604jp7slweosa` | `spesa piccola per la casa carrefour` | `2026-05-18` | `legacy-marian-martina` | `Spesa` / `spesa` | `private-44976e8f-12a0-49d9-8324-3034af19941a` | No | Clone/create `spesa` category in legacy workspace, then remap entry. |
| `cmp70rdrj000604l57r6vnl36` | `Spesa piccola` | `2026-05-15` | `legacy-marian-martina` | `Spesa` / `spesa` | `private-44976e8f-12a0-49d9-8324-3034af19941a` | No | Clone/create `spesa` category in legacy workspace, then remap entry. |
| `cmp4b4379000b04jxfxm4jfk2` | `Spesa Carrefour` | `2026-05-12` | `legacy-marian-martina` | `Spesa` / `spesa` | `private-44976e8f-12a0-49d9-8324-3034af19941a` | No | Clone/create `spesa` category in legacy workspace, then remap entry. |
| `cmp8725ig000s04joh9s95ior` | `Carrefour` | `2026-05-11` | `legacy-marian-martina` | `Spesa` / `spesa` | `private-44976e8f-12a0-49d9-8324-3034af19941a` | No | Clone/create `spesa` category in legacy workspace, then remap entry. |

Required category targets inferred from mismatches:

| Target workspace | Category slugs needed |
|---|---|
| `legacy-marian-martina` | `spesa` |
| `private-44976e8f-12a0-49d9-8324-3034af19941a` | `abbonamenti`, `auto`, `caffe`, `cibo`, `delivery`, `regali`, `svago` |

Important constraint: production still has global unique indexes `Category_name_key` and `Category_slug_key`, so duplicate category slugs/names across workspaces cannot be inserted yet. Category cloning must happen after, or inside, the workspace-scoped category migration that drops global unique constraints and adds scoped unique constraints.

## 6. Data repair plan

This is a plan only. Do not execute these queries on production yet.

### Step 1 — Decide the null entry workspace

The likely assignment is `legacy-marian-martina`, based on category workspace. Because `createdByUserId` and `paidByUserId` are null, this needs manual approval.

```sql
-- DO NOT RUN YET
-- Candidate only after manual approval on a restored clone.
UPDATE "Entry"
SET "workspaceId" = 'legacy-marian-martina'
WHERE id = 'cmplbqbg4000a04i9mbuxbe7x'
  AND "workspaceId" IS NULL;
```

### Step 2 — Clone missing categories per workspace

Because all 13 mismatch rows lack matching categories in the entry workspace, remapping cannot happen until equivalent categories exist.

Production currently cannot insert duplicate category slugs/names because global unique indexes still exist. Therefore category cloning must be tested on a clone after the category-scope migration drops global unique indexes, or implemented as part of that migration.

```sql
-- DO NOT RUN YET
-- Candidate only on a restored clone, after global Category name/slug unique indexes are dropped
-- and before Entry remapping, if the migration does not already clone these categories.
INSERT INTO "Category" (id, "workspaceId", name, slug, color, icon, "createdAt", "updatedAt")
SELECT
  concat('cat_', substr(md5(m.entry_workspace_id || ':' || m.slug), 1, 20)) AS id,
  m.entry_workspace_id AS "workspaceId",
  m.name,
  m.slug,
  m.color,
  m.icon,
  CURRENT_TIMESTAMP AS "createdAt",
  CURRENT_TIMESTAMP AS "updatedAt"
FROM (
  SELECT DISTINCT
    e."workspaceId" AS entry_workspace_id,
    c.name,
    c.slug,
    c.color,
    c.icon
  FROM "Entry" e
  JOIN "Category" c ON c.id = e."categoryId"
  LEFT JOIN "Category" c2
    ON c2.slug = c.slug
   AND c2."workspaceId" = e."workspaceId"
  WHERE e."workspaceId" IS NOT NULL
    AND e."workspaceId" IS DISTINCT FROM c."workspaceId"
    AND c2.id IS NULL
) m
WHERE NOT EXISTS (
  SELECT 1
  FROM "Category" existing
  WHERE existing."workspaceId" = m.entry_workspace_id
    AND existing.slug = m.slug
);
```

### Step 3 — Remap entries once matching categories exist

The query below is the corrected PostgreSQL-safe form of the remap. It avoids referencing the target alias inside a `JOIN ON` clause.

```sql
-- DO NOT RUN YET
-- Candidate only on a restored clone after matching categories exist.
UPDATE "Entry" AS e
SET "categoryId" = c2.id
FROM "Category" AS c, "Category" AS c2
WHERE e."categoryId" = c.id
  AND c2.slug = c.slug
  AND c2."workspaceId" = e."workspaceId"
  AND e."workspaceId" IS DISTINCT FROM c."workspaceId";
```

### Step 4 — Verify repair on clone

After candidate repairs on a clone only:

```sql
-- DO NOT RUN YET ON PRODUCTION
SELECT COUNT(*)
FROM "Entry" e
JOIN "Category" c ON c.id = e."categoryId"
WHERE e."workspaceId" IS DISTINCT FROM c."workspaceId";

SELECT COUNT(*)
FROM "Entry"
WHERE "workspaceId" IS NULL;
```

Expected result on clone after repair: both counts are `0`.

## 7. Migration plan

Safe sequence:

1. Take a fresh production backup.
2. Restore backup to a clone database.
3. Confirm clone target by printing sanitized host/port/db/user only.
4. Run Phase 1A preflight on the clone.
5. Reconcile production-only migrations with local migration history before running anything.
6. On clone only, apply missing local migrations in order:
   - `20260610120000_add_entry_mode_saving_context`
   - `20260610130000_harden_workspace_invites`
   - `20260610140000_scope_categories_to_workspace`
   - `20260610150000_add_entry_stats_indexes`
7. On clone only, decide and repair the null entry workspace if not handled by migration.
8. On clone only, verify category cloning/remapping. If the category-scope migration handles all non-null mismatches, do not run manual category repair SQL.
9. On clone only, rerun preflight and postflight.
10. Only after clone checks are green, write a production deployment runbook with backup, maintenance window, expected counts, rollback path, and exact commands.
11. Only after approval, plan production execution.

Important ordering note:

- `20260610140000_scope_categories_to_workspace` is likely the migration that should drop global category uniqueness and clone/remap categories. It must be tested on clone with the current production data shape.
- The null entry is not covered by category usage logic that depends on `Entry.workspaceId IS NOT NULL`, so it likely needs manual repair before making `Entry.workspaceId` required later.

## 8. Blockers to Phase 1C

1. Production schema is missing all local June 10 migrations.
2. Local migration folder does not contain production baseline migrations, so migration history must be reconciled before using local migrations on prod.
3. `Entry.mode` and `Entry.savingContext` are missing in production.
4. `WorkspaceInvite` hardening columns are missing in production.
5. Category uniqueness is still global in production, not workspace-scoped.
6. There is 1 `Entry.workspaceId IS NULL` requiring manual approval or explicit rule.
7. There are 13 Entry/Category workspace mismatches.
8. All 13 mismatch rows lack an equivalent category in the entry workspace.
9. Existing preflight script is not schema-drift tolerant; it reports errors when expected columns are missing. Future preflight should either run after schema migration on clone or be made column-aware.
10. Production-only migrations must be documented so Prisma migration state does not drift further.

## 9. Recommended next prompt

```txt
Implement Phase 1C — Clone-only migration rehearsal and repair validation plan.

Do not touch production. Do not run commands against production. Require a clone DATABASE_URL and verify sanitized target before executing anything.

Scope:
- Use a restored production clone only.
- Apply missing local migrations on the clone in order.
- Do not modify production.
- If migration fails on clone, stop and report.
- If migration succeeds, run candidate repair SQL on clone only for the null Entry workspace if manually approved.
- Rerun preflight/postflight on clone.
- Produce PHASE_1C_CLONE_REHEARSAL_RESULTS.md with exact commands, counts before/after, migration status, and remaining blockers.

Safety:
- Print only host/port/db/user for clone.
- Refuse to run if target host/db/user match production.
- Do not execute production migration or backfill.
```

## Diagnostic queries used

All executed queries were read-only `SELECT` statements against PostgreSQL metadata or application tables.

Key diagnostics included:

```sql
SELECT migration_name, finished_at, rolled_back_at, logs
FROM "_prisma_migrations"
ORDER BY finished_at NULLS LAST, started_at;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('Entry', 'WorkspaceInvite', 'Workspace')
ORDER BY table_name, ordinal_position;

SELECT e.id, e.title, e.date, e."workspaceId", e."categoryId", c.name, c.slug, c."workspaceId"
FROM "Entry" e
LEFT JOIN "Category" c ON c.id = e."categoryId"
WHERE e."workspaceId" IS NULL;

SELECT e.id, e.title, e.date, e."workspaceId", e."categoryId", c.name, c.slug, c."workspaceId", c2.id
FROM "Entry" e
JOIN "Category" c ON c.id = e."categoryId"
LEFT JOIN "Category" c2
  ON c2.slug = c.slug
 AND c2."workspaceId" = e."workspaceId"
WHERE e."workspaceId" IS DISTINCT FROM c."workspaceId";
```
