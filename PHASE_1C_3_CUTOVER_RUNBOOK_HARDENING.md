# Phase 1C-3 — Cutover Runbook Hardening

Run date: 2026-06-10

## 1. Executive summary

Phase 1C-3 converted the successful local clone rehearsal from Phase 1C-2 into reusable database runbook assets for future staging/new Supabase cutover.

No database command was executed as part of this phase. No production database was touched.

Added assets:

- idempotent known workspace drift repair SQL;
- idempotent known orphan test-user cleanup SQL;
- auth/email cutover preflight SQL;
- npm wrappers for both scripts;
- hardened database README with clone and cutover command order;
- this report.

## 2. What was added

### `scripts/db/repair-known-workspace-drift.sql`

Purpose: repair exactly one known drifted entry after migrations on a clone/staging/new Supabase target.

Target row:

- `Entry.id = 'cmplbqbg4000a04i9mbuxbe7x'`
- target `workspaceId = 'legacy-marian-martina'`

Safety conditions:

- updates only when `Entry.id` matches exactly;
- updates only when `Entry.workspaceId IS NULL`;
- updates only when linked `Category` exists;
- updates only when linked `Category.workspaceId = 'legacy-marian-martina'`;
- does not perform generic workspace/category repair;
- prints before/after diagnostic result sets;
- is idempotent: after the row is already repaired, it updates nothing else.

### `scripts/db/preflight-auth-email-cutover.sql`

Purpose: read-only validation before relying on email-based Supabase auth mapping during cutover.

Checks included:

- app users with `email IS NULL`;
- emails with leading/trailing spaces;
- emails that are not lowercase;
- case-insensitive duplicates using `lower(email)`;
- users without workspace membership;
- workspace membership rows without a valid `User`;
- `Entry.paidByUserId` without a valid `User`;
- `Entry.createdByUserId` without a valid `User`;
- `EntryBeneficiary.userId` without a valid `User`.

### `scripts/db/repair-known-test-users.sql`

Purpose: clean up exactly one known orphan test user after auth/email preflight review on a clone/staging/new Supabase target.

Target row:

- `User.id = '60c670fb-707a-480b-b29a-2d30fe2e09e0'`
- `User.email = 'private.by.lena@gmail.com'`

Safety conditions:

- deletes only when `User.id` and `User.email` both match exactly;
- deletes only when the user has no `WorkspaceMember` rows;
- deletes only when the user owns no `Workspace`;
- deletes only when the user is not referenced by `Entry.paidByUserId`;
- deletes only when the user is not referenced by `Entry.createdByUserId`;
- deletes only when the user is not referenced by `EntryBeneficiary.userId`;
- prints before/after diagnostic result sets;
- is idempotent: after the row is deleted, it deletes nothing else.

### Orphan test user discovered during local rehearsal

On the migrated local clone, `npm run db:preflight:auth-cutover` initially reported one blocker:

| Check | Value |
|---|---:|
| `User without workspace membership` | 1 |

The user was:

| Field | Value |
|---|---|
| id | `60c670fb-707a-480b-b29a-2d30fe2e09e0` |
| email | `private.by.lena@gmail.com` |
| name | `Marian-Ovidiu Hutanu` |

Read-only diagnostics confirmed:

| Relationship | Count |
|---|---:|
| memberships | 0 |
| owned workspaces | 0 |
| entries paid | 0 |
| entries created | 0 |
| beneficiary entries | 0 |

The user was deleted on the local clone only:

```sql
DELETE FROM "User"
WHERE email = 'private.by.lena@gmail.com'
  AND id = '60c670fb-707a-480b-b29a-2d30fe2e09e0';
```

Result:

```txt
DELETE 1
```

After deletion, `npm run db:preflight:auth-cutover` was clean:

| Check | Final value |
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

### `package.json`

Added wrappers:

```bash
npm run db:preflight:auth-cutover
npm run db:repair:known-workspace-drift
npm run db:repair:known-test-users
```

The preflight wrapper is read-only.
The repair wrappers are mutative and must only be used after target verification on clone/staging/new Supabase.

### `scripts/db/README.md`

Updated with:

- local production clone rehearsal flow;
- new Supabase/staging cutover checklist;
- hard-stop conditions;
- explicit warning not to use `prisma db push`;
- explicit warning not to run repair on old production;
- target verification requirements.

## 3. Why these changes were needed

Phase 1C-2 proved the migration/repair path on a local clone, but the successful manual steps needed to be made repeatable and safer.

The new SQL scripts reduce risk by making the two most important follow-up checks explicit:

1. the only known data repair is codified as a narrow, idempotent script;
2. the email-based auth mapping risk is checked before cutover.
3. the known orphan test user cleanup is codified as a narrow, idempotent script.

The README now defines the safe order of operations so future staging/new Supabase runs do not rely on memory or ad-hoc commands.

## 4. How to use the scripts

### Read-only auth/email cutover preflight

Run after setting `DATABASE_URL` to the verified target:

```bash
node scripts/db/print-db-target.js DATABASE_URL
npm run db:preflight:auth-cutover
```

Expected for cutover readiness:

- no duplicate `lower(email)` groups;
- no unexpected `NULL` emails for real users;
- no invalid user references from memberships, entries, or beneficiaries.

Emails that are not lowercase or have spaces should be resolved before relying on email-based auth matching.

### Known workspace drift repair

Run only after migrations and only on clone/staging/new Supabase:

```bash
node scripts/db/print-db-target.js DATABASE_URL
npm run db:repair:known-workspace-drift
```

Expected behavior:

- first eligible run: one row repaired;
- repeat run: zero rows changed / no additional changes;
- if row state differs from the known safe condition, stop and inspect diagnostics.

Do not run this script on old production.

### Known orphan test-user cleanup

Run only after auth/email preflight shows the known orphan user and target verification confirms clone/staging/new Supabase:

```bash
node scripts/db/print-db-target.js DATABASE_URL
npm run db:repair:known-test-users
npm run db:preflight:auth-cutover
```

Expected behavior:

- first eligible run: one user deleted;
- repeat run: zero users changed / no additional changes;
- if the user has any membership, owned workspace, entry reference, or beneficiary reference, stop and inspect diagnostics.

Do not run this script on old production.

## 5. Safe order for new Supabase/staging

1. Create a read-only dump from old production.
2. Restore the dump into staging/new Supabase.
3. Verify `DATABASE_URL` and `DIRECT_URL` using sanitized target output.
4. Stop if the target is not the intended staging/new Supabase database.
5. Run workspace preflight:

```bash
npm run db:preflight:workspace
```

6. Run auth/email cutover preflight:

```bash
npm run db:preflight:auth-cutover
```

7. If the only auth/email blocker is the known orphan test user, run cleanup only on the verified staging/new Supabase target and rerun auth/email preflight:

```bash
npm run db:repair:known-test-users
npm run db:preflight:auth-cutover
```

8. Apply migrations only on the verified staging/new Supabase target:

```bash
npx prisma migrate deploy
npx prisma migrate status
```

9. Run the known workspace drift repair:

```bash
npm run db:repair:known-workspace-drift
```

10. Re-run workspace checks:

```bash
npm run db:preflight:workspace
npm run db:postflight:workspace
```

11. Re-run auth/email checks:

```bash
npm run db:preflight:auth-cutover
```

12. Run app verification:

```bash
npm run check
```

13. Only after all checks are clean, cut over app environment variables to the new Supabase project.

## 6. What remains manual

- Confirming the intended target before migration/repair.
- Deciding how to handle any non-lowercase emails or emails with spaces.
- Deciding how to handle any `NULL` app user emails.
- Resolving duplicate `lower(email)` groups if any appear in a fresh dump.
- Confirming that the one known entry repair is still valid on the fresh target.
- Confirming that the known orphan test user is still truly unreferenced before cleanup.
- Final approval for staging/new Supabase cutover.
- Rollback decision if postflight or app checks fail.

## 7. Residual risks

1. Old production remains drifted until a separate approved cutover is performed.
2. A fresh dump could differ from the Phase 1C-2 clone, so all checks must be rerun.
3. The known repair is safe only if the entry still has `workspaceId IS NULL` and its category still belongs to `legacy-marian-martina`.
4. Email-based auth mapping depends on stable, normalized, unique user emails.
5. The known test-user cleanup is safe only if the user remains unreferenced in a fresh dump.
6. Production-only migrations remain part of the restored migration history and must be understood during any future migration-history cleanup.
7. The SQL repair scripts are intentionally mutative; operator error on target selection remains the main risk, so target verification is mandatory.

## 8. Verification run in this phase

Only non-mutative local project verification was run after file changes:

```bash
npm run prisma:validate
npm run lint
npm run typecheck
npm run test
```

No `npx prisma migrate deploy` command was executed in this phase.
No SQL script was executed in this phase.

## 9. What was not done

- No production database was touched.
- No migration was executed.
- No repair was executed.
- No query mutative command was executed.
- No `prisma db push` was executed.
- No UI code was modified.
- No business logic runtime refactor was performed.
- No secrets, passwords, tokens, or full connection strings were printed.
