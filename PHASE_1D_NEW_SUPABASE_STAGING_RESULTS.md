# Phase 1D — New Supabase Staging Migration Results

Run date: 2026-06-10

## 1. Executive summary

Phase 1D validated the migration and repair runbook on the new Supabase project `nlc-v2`.

Result: **successful staging/new Supabase migration rehearsal**.

A fresh dump from the old production database was restored into the new Supabase project. The missing local migrations were applied successfully. The known workspace drift and known orphan test user were repaired with the hardened scripts. Final workspace, postflight, auth/email, test, and build checks all passed.

Old production was not modified.

Key outcome:

- restore to `nlc-v2`: successful;
- migration deploy: successful;
- workspace drift repair: `updated_rows = 1`;
- known test user cleanup: `deleted_rows = 1`;
- `npx prisma migrate status`: database schema is up to date;
- workspace preflight: all issue counts `0`;
- workspace postflight: all expected zero counts `0`;
- auth/email cutover preflight: all issue counts `0`;
- `npm run check`: passed;
- tests: `73 passed / 0 failed`;
- Next.js build: passed with Next.js `16.2.4` / Turbopack.

## 2. Target nuovo Supabase verificato

Target project:

| Field | Value |
|---|---|
| Supabase project name | `nlc-v2` |
| Supabase project ref | `nohezhrghqstxyyxbfhs` |
| Environment | new Supabase staging/cutover candidate |

Connection secrets were not printed and are not included in this report.

## 3. Dump/restore summary

A fresh dump was taken from the old production database and restored into the new Supabase project `nlc-v2`.

Restore result: **successful**.

Public schema tables present after restore:

| Table |
|---|
| `Category` |
| `Entry` |
| `EntryBeneficiary` |
| `Goal` |
| `Habit` |
| `HabitOccurrence` |
| `QuickPreset` |
| `User` |
| `Workspace` |
| `WorkspaceInvite` |

Interpretation: the application data model was restored into the new Supabase `public` schema and was ready for migration deploy.

## 4. Migration applicate

`npx prisma migrate deploy` was executed against `nlc-v2` and applied the expected missing migrations.

Applied migrations:

1. `20260610120000_add_entry_mode_saving_context`
2. `20260610130000_harden_workspace_invites`
3. `20260610140000_scope_categories_to_workspace`
4. `20260610150000_add_entry_stats_indexes`

Post-migration status:

| Check | Result |
|---|---|
| `npx prisma migrate status` | Database schema is up to date |

Migration implications verified:

- `Entry.mode` and `Entry.savingContext` are present.
- `WorkspaceInvite` hardening columns are present.
- Category uniqueness is workspace-scoped.
- Entry stats indexes are present.

## 5. Repair workspace

The known workspace drift repair was executed with the hardened script:

```bash
npm run db:repair:known-workspace-drift
```

Target entry:

| Field | Value |
|---|---|
| Entry ID | `cmplbqbg4000a04i9mbuxbe7x` |
| Target workspace | `legacy-marian-martina` |

Result:

| Step | Value |
|---|---|
| before status | `eligible_for_repair` |
| updated rows | `1` |
| after status | `repaired_or_already_clean` |

Interpretation: the known null-workspace entry was repaired exactly once and the final state is clean.

## 6. Cleanup test user

The known orphan test user cleanup was executed with the hardened script:

```bash
npm run db:repair:known-test-users
```

Target user:

| Field | Value |
|---|---|
| User ID | `60c670fb-707a-480b-b29a-2d30fe2e09e0` |
| Email | `private.by.lena@gmail.com` |

Result:

| Step | Value |
|---|---|
| before status | `eligible_for_delete` |
| deleted rows | `1` |
| after status | `deleted_or_already_absent` |

Interpretation: the known orphan test user was removed from the new Supabase staging target. The cleanup was limited to the expected user and did not touch real users.

## 7. Preflight/postflight finali

Final workspace preflight:

```bash
npm run db:preflight:workspace
```

Result: **all issue counts `0`**.

Final workspace postflight:

```bash
npm run db:postflight:workspace
```

Result: **all expected zero counts `0`**.

Summary:

| Check group | Result |
|---|---|
| workspace null counts | all `0` |
| category workspace mismatches | all `0` |
| beneficiary membership mismatches | `0` |
| workspace member duplicates | `0` |
| invite token/hash checks | all `0` |
| entry money domain checks | all `0` |
| category duplicate slug/name | `0` |

Interpretation: the restored and migrated `nlc-v2` database is clean for the Phase 1 workspace/category/invite/money safety checks.

## 8. Auth/email cutover validation

Final auth/email preflight:

```bash
npm run db:preflight:auth-cutover
```

Result: **all issue counts `0`**.

Summary:

| Check | Result |
|---|---:|
| `User.email IS NULL` | 0 |
| `User.email has leading/trailing spaces` | 0 |
| `User.email is not lowercase` | 0 |
| `User duplicate lower(email)` | 0 |
| `User without workspace membership` | 0 |
| `WorkspaceMember without valid User` | 0 |
| `Entry.paidByUserId without valid User` | 0 |
| `Entry.createdByUserId without valid User` | 0 |
| `EntryBeneficiary without valid User` | 0 |

Interpretation: `nlc-v2` is ready for email-based Supabase auth re-login validation, assuming the real users log in with the same normalized emails.

## 9. Check/build finale

Final project check:

```bash
npm run check
```

Result: **passed**.

| Gate | Result |
|---|---|
| Prisma validate | passed |
| ESLint | passed |
| TypeScript | passed |
| Tests | `73 passed / 0 failed` |
| Next.js build | passed |

Build details:

- Next.js `16.2.4`;
- Turbopack;
- production build passed.

## 10. Warning session pooler vs transaction pooler

During build/check, this non-blocking warning appeared:

```txt
DATABASE_URL uses Supabase session pooler (port 5432). For serverless, prefer Transaction pooler on port 6543.
```

Interpretation:

- This is expected for restore/migration/check workflows where the Session pooler/direct-style connection is commonly used.
- It is not the desired Vercel runtime configuration.

Final Vercel/serverless runtime should use the Supabase Transaction pooler:

```txt
port: 6543
pgbouncer=true
```

Operational implication:

- Use Session pooler/direct-compatible URL for maintenance where needed.
- Use Transaction pooler `:6543` with `pgbouncer=true` for Vercel runtime `DATABASE_URL`.
- Keep `DIRECT_URL` available for Prisma migration/maintenance workflows as appropriate.

## 11. Prossimi step prima del cutover Vercel

Recommended next steps before switching Vercel production traffic to `nlc-v2`:

1. Configure Supabase Auth providers and redirect URLs on `nlc-v2`.
2. Verify required environment variables for Vercel without printing secrets.
3. Set Vercel runtime `DATABASE_URL` to the `nlc-v2` Transaction pooler `:6543` with `pgbouncer=true`.
4. Set migration/maintenance `DIRECT_URL` or equivalent private maintenance URL separately.
5. Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` point to `nlc-v2`.
6. Have the real users log in on the new project with the same normalized emails.
7. Validate that Marian, Martina, and the private-workspace user see the expected workspaces and data.
8. Run a smoke test for entries, dashboard, reports, exports, invites, and workspace switcher.
9. Re-run `npm run db:preflight:workspace`, `npm run db:postflight:workspace`, `npm run db:preflight:auth-cutover`, and `npm run check` against the final cutover target.
10. Prepare rollback instructions before switching production traffic.
11. Only after successful smoke tests, update Vercel production env and deploy.

## 12. Cosa NON è stato fatto

- Old production was not modified.
- No migration was run on old production.
- No repair was run on old production.
- No query mutative command was executed against old production.
- No secrets, passwords, tokens, service-role keys, or full connection strings were printed in this report.
- No UI code was changed as part of this report.
- No business logic refactor was performed as part of this report.
- Vercel production traffic was not cut over in this phase.
- Supabase Auth user login validation on `nlc-v2` is not covered by this report unless performed separately.
