# Phase 1A Production Preflight Results

Run date: 2026-06-10

## DB target

- host: `aws-0-eu-west-1.pooler.supabase.com`
- port: `6543`
- database: `postgres`
- user: `postgres.zhfxxwocobrfxkmwfxrt`
- environment: production
- nota: read-only checks only

## Execution

Command executed:

```bash
npm run db:preflight:workspace
```

Database changes: none. The preflight script was checked before execution and contained no `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`, `TRUNCATE`, `CREATE`, `GRANT`, `REVOKE`, `MERGE`, or `CALL` statements.

Important execution note: `psql` returned process exit code `0`, but some SQL statements emitted errors because production schema is older than the local Prisma schema/preflight assumptions.

## Preflight results

| Control | Value | Expected target | Severity | Interpretation |
|---|---:|---:|---|---|
| `Entry.workspaceId IS NULL` | 1 | 0 | Critical | One entry is not assigned to any workspace. This blocks making `Entry.workspaceId` required until a backfill decision is made. |
| `Habit.workspaceId IS NULL` | 0 | 0 | Pass | Habit workspace ownership is complete for this check. |
| `Goal.workspaceId IS NULL` | 0 | 0 | Pass | Goal workspace ownership is complete for this check. |
| `QuickPreset.workspaceId IS NULL` | 0 | 0 | Pass | QuickPreset workspace ownership is complete for this check. |
| `Category.workspaceId IS NULL` | 0 | 0 | Pass | Categories are workspace-scoped for this check. |
| `Category duplicate by workspaceId + slug` | 0 rows | 0 rows | Pass | No duplicate category slugs per workspace were reported. |
| `Category duplicate by workspaceId + name` | 0 rows | 0 rows | Pass | No duplicate category names per workspace were reported. |
| `Entry.category.workspace mismatch` | 13 | 0 | Critical | Thirteen entries point to categories belonging to a different workspace, including legacy/private workspace cross-links and one null entry workspace case. This blocks safe category/workspace migration until remapped. |
| `Habit.category.workspace mismatch` | 0 | 0 | Pass | Habit categories match habit workspaces for this check. |
| `QuickPreset.category.workspace mismatch` | 0 | 0 | Pass | QuickPreset categories match preset workspaces for this check. |
| `EntryBeneficiary user not member of entry workspace` | 0 | 0 | Pass | No beneficiary/member mismatch was reported. |
| `WorkspaceMember duplicate workspace/user pairs` | 0 rows | 0 rows | Pass | No duplicate workspace memberships were reported. |
| `Entry money/domain counts` | Not executed successfully | Executable and preferably 0 issues | Critical | Failed with `column "mode" does not exist`; production DB does not have the `Entry.mode` column expected by the local schema/preflight. |
| `Entry money/domain samples` | Not executed successfully | Executable | Critical | Failed with `column "mode" does not exist`; production DB does not have the entry mode/saving context migration applied. |
| `WorkspaceInvite token hash checks` | Not executed successfully | Executable and 0 issues | Critical | Failed with `column "usedCount" does not exist`; production DB does not have the invite hardening fields expected by the local schema/preflight. |

## Raw error summary

```txt
ERROR: column "mode" does not exist
HINT: Perhaps you meant to reference the column "Entry.note".

ERROR: column "mode" does not exist
HINT: Perhaps you meant to reference the column "Entry.note".

ERROR: column "usedCount" does not exist
```

## Migration readiness

Classification: **Blocks migration**.

Reasons:

- Production has at least one `Entry` with `workspaceId IS NULL`.
- Production has 13 `Entry` to `Category` workspace mismatches.
- Production schema appears behind local schema for entry mode/saving context columns.
- Production schema appears behind local schema for invite hardening columns such as `usedCount`.
- Because some preflight checks could not execute, the current safety picture is incomplete.

## Recommended next step

Use a Phase 1B prompt focused only on production schema drift discovery and a non-destructive migration plan.

Suggested prompt:

```txt
Implement Phase 1B — Production schema drift inventory and backfill plan only.

Do not modify data. Do not run migrations. Do not run backfills. Do not change Prisma schema.

Use read-only PostgreSQL metadata queries to compare production tables/columns/indexes/enums against the local Prisma schema and existing migrations, focusing on:
- Entry.mode
- Entry.savingContext
- WorkspaceInvite.type
- WorkspaceInvite.role
- WorkspaceInvite.revokedAt
- WorkspaceInvite.maxUses
- WorkspaceInvite.usedCount
- WorkspaceInvite.lastUsedAt
- workspaceId nullability on Entry/Habit/Goal/QuickPreset
- Category workspace-scoped indexes

Produce a Markdown drift report with:
- missing columns/enums/indexes
- applied migration assumptions that are false in production
- required migration order
- required preflight/backfill decisions for the 1 null Entry workspace and 13 Entry/Category mismatches
- exact SQL queries used, all read-only

Do not implement fixes.
```

## Notes

- No connection string, password, token, or secret was printed.
- No `postflight` script was executed.
- No Prisma migration command was executed.
- No backfill or schema mutation was executed.
