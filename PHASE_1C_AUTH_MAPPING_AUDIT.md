# Phase 1C — Auth Mapping Audit

Audit date: 2026-06-10

Scope: read-only code/schema audit. No database changes, schema changes, migrations, runtime changes, or mutative scripts were executed.

## 1. Current User schema

### `User` fields

From `prisma/schema.prisma`:

- `id String @id`
- `email String? @unique`
- `name String?`
- `image String?`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

There is no `User.supabaseId` field in the current local schema.

### Unique constraints

- `User.id` is the primary key.
- `User.email` is unique, nullable.

Important detail: PostgreSQL unique indexes allow multiple `NULL` values. Users without email can therefore duplicate by external identity because there is no `supabaseId` or other external ID field.

### Main relations using `User.id`

- `Workspace.ownerUserId -> User.id`
- `WorkspaceMember.userId -> User.id`
- `WorkspaceInvite.createdByUserId -> User.id`
- `WorkspaceInvite.acceptedByUserId -> User.id`
- `Entry.createdByUserId -> User.id`
- `Entry.paidByUserId -> User.id`
- `EntryBeneficiary.userId -> User.id`
- `Habit.targetUserId -> User.id`

### Non-relations

- `Goal` does not point to `User`; it still uses `Person?` legacy ownership.
- `QuickPreset` does not point to `User`; it still uses `Person?` legacy ownership.

## 2. Current auth provisioning flow

### Step-by-step login flow

1. Middleware/proxy refreshes Supabase session cookies.
   - File: `src/lib/supabase/proxy.ts`
   - It calls `supabase.auth.getUser()` only to check whether a user exists and redirect unauthenticated protected requests.
   - It does not create or update application users.

2. OAuth callback exchanges the auth code.
   - File: `app/auth/callback/route.ts`
   - Calls `supabase.auth.exchangeCodeForSession(code)`.
   - Then calls `supabase.auth.getUser()`.
   - If a Supabase user exists, it calls `resolveWorkspaceForAuthenticatedUser(...)` with:
     - `id: user.id`
     - `email: user.email ?? null`
     - `name` from metadata
     - `image` from metadata

3. Runtime auth reads Supabase user.
   - File: `src/lib/auth/session.ts`
   - `getSupabaseUser()` calls `supabase.auth.getUser()` and returns `AuthenticatedUser` with Supabase `id`, `email`, `name`, `image`.

4. Application user provisioning happens through `ensureAppUserForAuthUser()`.
   - File: `src/lib/auth/provisioning.ts`
   - Called by `getCurrentUser()` and `resolveWorkspaceForAuthenticatedUser()`.

5. Provisioning order for non-legacy users:
   - First lookup: `prisma.user.findUnique({ where: { id: authUser.id } })`.
   - If found: update email/name/image and return that app user.
   - If not found and email exists: normalize email and lookup `prisma.user.findUnique({ where: { email } })`.
   - If found by email: update name/image and return that existing app user. It does not change `User.id`.
   - If no id or email match: create a new app `User` with `id = authUser.id` and normalized `email`.

6. Workspace resolution uses the application `User.id`, not Supabase auth ID directly.
   - `getAccessibleWorkspacesForUserId(user.id)` checks `Workspace.ownerUserId` and `WorkspaceMember.userId`.
   - If no workspace exists, `ensureDefaultWorkspaceForUser()` creates a private workspace using `user.id`.

### Legacy auth bridge branch

If `ENABLE_LEGACY_AUTH_BRIDGE=true`, `getLegacyAuthMapping(email)` can map specific configured emails to legacy app user IDs.

In that branch:

- provisioning first tries `existingByEmail`;
- for Marian primary legacy mapping it can choose a canonical primary user ID;
- it upserts by selected target `User.id`;
- it can update email/name/image.

This branch is useful for historical migration, but it also means env flags can materially change identity mapping behavior.

## 3. Supabase identity usage

### Uses `session.user.id` / Supabase `user.id`?

Yes, but only as an input to provisioning.

Observed usage:

- `src/lib/auth/session.ts` maps `supabase.auth.getUser().data.user.id` into `AuthenticatedUser.id`.
- `app/auth/callback/route.ts` passes `user.id` into provisioning.
- `src/lib/auth/provisioning.ts` first tries to find a `User` by `id = authUser.id`; if no match, it falls back to email.

### Uses `session.user.email` / Supabase `user.email`?

Yes. This is the critical external identity fallback.

Observed usage:

- `src/lib/auth/session.ts` maps Supabase `user.email` into `AuthenticatedUser.email`.
- `src/lib/auth/provisioning.ts` normalizes email with `normalizeEmail()` and uses it for `prisma.user.findUnique({ where: { email } })`.
- invite acceptance also compares current app user email to invite email.

### Saves Supabase auth user ID?

Not as a separate external ID.

Current behavior:

- For brand-new users, `User.id` is set to `authUser.id`.
- For existing users matched by email, `User.id` is preserved and the new Supabase auth ID is not saved anywhere.
- There is no `User.supabaseId` field.

### Depends on `auth.users` directly?

No runtime dependency was found.

The app uses Supabase Auth through `@supabase/ssr` clients and `supabase.auth.getUser()`. It does not query `auth.users` directly in runtime code.

## 4. New Supabase migration behavior

Scenario:

- old application DB is restored into a new Supabase project;
- `User` rows and all app data keep old `User.id` values;
- users log in to the new Supabase project with the same email;
- new `auth.users.id` values are different.

Expected current behavior:

1. Supabase returns new `authUser.id` and same `authUser.email`.
2. `ensureAppUserForAuthUser()` tries `User.id = new authUser.id`.
3. That lookup fails because app data has old `User.id`.
4. Provisioning normalizes email and tries `User.email = normalized auth email`.
5. If the restored `User.email` matches exactly after normalization, it returns the existing app user.
6. Existing `User.id` remains unchanged.
7. Workspace memberships, entries, beneficiaries, and ownership remain visible because all relations point to the preserved app `User.id`.

Therefore, with stable unique emails, the current app should survive a new Supabase project without a `supabaseId` relink column.

Failure modes:

- If the restored app user has `email IS NULL`, email matching cannot work; a new `User` will be created and old data will look empty.
- If the restored email differs by case or formatting from normalized Supabase email, exact unique lookup can fail because PostgreSQL text comparison is case-sensitive.
- If the user logs in with a different email/provider identity, provisioning creates a new app user and a new private workspace.
- If `ENABLE_LEGACY_AUTH_BRIDGE` is enabled, legacy mapping may override normal email flow.

## 5. Risk assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Existing user logs in on new Supabase with same normalized email and gets old app user | High expected path | Positive | Add tests proving email fallback returns existing `User.id`. |
| Existing user email differs by case from normalized Supabase email | Medium | High: duplicate app user, empty workspace/data | Normalize existing `User.email` before migration or use case-insensitive email matching strategy. Add duplicate lower(email) diagnostics. |
| Existing app `User.email` is null | Low for real users, possible for legacy rows | High: cannot relink by email | Require manual mapping for null-email users before migration. |
| User logs in with different provider/email | Medium | High: creates new app user with empty private workspace | Operational instruction: users must log in with same email first. Add diagnostics for app users without auth match. |
| Duplicate normalized emails in `User` | Low because `email @unique`, but case variants can coexist | Critical: ambiguous mapping | Run lower(email) duplicate diagnostics and resolve before migration. |
| Duplicate normalized emails in new `auth.users` | Low | Critical: ambiguous mapping | Run auth duplicate diagnostics after users log in. |
| Legacy auth bridge enabled during migration | Medium if env copied blindly | High: unexpected mapping to legacy IDs | Keep `ENABLE_LEGACY_AUTH_BRIDGE=false` unless explicitly testing legacy adoption. Add production fail-fast later. |
| Adding `User.supabaseId` prematurely | Medium | Medium/High: schema/runtime complexity without immediate need | Prefer email-based audit/tests first; add `supabaseId` only if product requires provider-level account linking. |
| User data appears empty after login | Medium if email mismatch/null | High | Ensure email diagnostics pass before cutover; test memberships/entries visibility after login. |

## 6. Recommendation

Recommendation: **email-based relink, without adding `User.supabaseId` for the Supabase project migration**.

Rationale:

- The current app already has an email fallback in `ensureAppUserForAuthUser()`.
- Preserving `User.id` is exactly what we want because all app data references `User.id`.
- If a new Supabase auth ID is stored into `User.id`, app relationships would break. The current code does not do that when email matches.
- Adding `User.supabaseId` is not necessary to keep existing data visible after migration, as long as user emails are stable and unique.
- Adding `supabaseId` would require schema migration and runtime code changes, which increases risk before Phase 1 data/schema cleanup is stable.

Target migration behavior should be:

- restore DB;
- ensure all real app users have correct normalized unique email;
- ensure new Supabase users log in with the same emails;
- rely on `ensureAppUserForAuthUser()` email fallback to attach sessions to existing app `User.id`;
- add tests before cutover.

When `User.supabaseId` might become useful later:

- supporting multiple auth identities per email;
- enforcing exact Supabase account binding;
- account linking/unlinking features;
- audit-grade traceability between app user and auth provider.

If added later, migration target should be:

- add nullable `User.supabaseId String? @unique`;
- backfill by email on clone/new Supabase only;
- update provisioning to lookup by `supabaseId`, then email, then id for backwards compatibility;
- keep `User.id` as stable app identity;
- never rewrite relations from old `User.id` to Supabase auth IDs.

But this is not required for the immediate new Supabase migration if emails are reliable.

## 7. Required tests

Add tests before migration/cutover.

### Provisioning tests

1. Same email, new auth ID attaches existing app user.
   - Given `User { id: old-id, email: user@example.com }`.
   - When auth user is `{ id: new-supabase-id, email: user@example.com }`.
   - Expect returned app user id `old-id`.
   - Expect no new `User` created.

2. Same email with different case does not create duplicate, if target behavior is case-insensitive.
   - Current code normalizes auth email but DB lookup is exact against normalized string.
   - Test should expose whether existing mixed-case DB email fails.
   - Decide whether to normalize DB emails pre-migration or change lookup.

3. Existing auth ID match still updates metadata.
   - Given `User.id = authUser.id`.
   - Expect email/name/image update path still works.

4. Missing email and unknown auth ID creates a new user only when necessary.
   - Confirms behavior for provider accounts without email.

5. Legacy bridge disabled does not map legacy emails.
   - Already partially covered by `legacy-auth` tests.

6. Legacy bridge enabled maps only configured emails.
   - Already partially covered, but should be integration-tested with provisioning if used during migration.

### Workspace/data visibility tests

7. Existing user matched by email sees existing workspace memberships.
   - Given old `User.id` has `WorkspaceMember` rows.
   - After provisioning with new auth ID and same email, `getAccessibleWorkspacesForUserId(returnedUser.id)` returns old workspaces.

8. Existing user matched by email sees entries.
   - Given old `User.id` is `createdByUserId`, `paidByUserId`, or `EntryBeneficiary.userId`.
   - After login with new auth ID/same email, workspace-scoped entry queries still return data.

9. Invite acceptance uses app `User.id`, not Supabase auth ID.
   - After email fallback, accepting invite should create `WorkspaceMember.userId = old app User.id`.

10. User with no email creates a new app user and private workspace only if no existing mapping is possible.

### Diagnostics tests/scripts

11. Lowercase duplicate email diagnostic catches `User.email` case variants.

12. Auth users without app user diagnostic catches wrong-login-email cases before cutover.

## 8. Next prompt

```txt
Implement Phase 1C-EmailMapping Tests only.

Do not modify schema. Do not add User.supabaseId. Do not change UI. Do not run migrations. Do not touch production DB.

Goal:
Add tests around current auth provisioning to prove the new Supabase migration behavior:
- same email with different auth.users.id returns existing app User.id;
- no duplicate User is created when email matches;
- existing workspace memberships remain visible through returned app User.id;
- existing entries remain visible through returned app User.id;
- unknown email creates a new User only when necessary;
- mixed-case email behavior is explicitly tested and documented.

Allowed files:
- src/lib/auth/provisioning.test.ts or new provisioning integration test file;
- test helpers/mocks only if needed.

Requirements:
- No real DB connection unless using an isolated test DB.
- Prefer injected/mock Prisma-like client if necessary.
- npm run test passes.
- npm run check passes.

Do not implement production relink or schema changes.
```

## Direct answers

1. La tabella `User` ha solo email come identificatore esterno?

Yes. It has `id` and unique `email`, but no dedicated external auth identifier. For new users, `id` is initially set to Supabase `authUser.id`; for migrated existing users, email fallback is the effective external mapping.

2. Il provisioning cerca utenti per email?

Yes. After failing lookup by `User.id = authUser.id`, it normalizes `authUser.email` and calls `prisma.user.findUnique({ where: { email } })`.

3. Il provisioning crea utenti nuovi se non trova email?

Yes. If no ID match and no email match, it creates `User` with `id = authUser.id` and normalized email.

4. Il login con nuovo progetto Supabase ma stessa email aggancerebbe l’utente app esistente?

Yes, assuming the restored `User.email` exactly matches the normalized Supabase email. It returns the existing app user and preserves old `User.id`.

5. C’è rischio di creare duplicati `User`?

Yes. Main cases: email missing, email changed, case mismatch, or login with a different provider/email. `email @unique` prevents exact duplicates but not multiple `NULL` emails, and may not prevent case-variant duplicates in PostgreSQL.

6. C’è rischio che i dati risultino vuoti dopo login su nuovo Supabase?

Yes, if the email fallback does not find the old app user. Then a new app user is created with new auth ID and receives a new/default workspace, so old memberships/entries are not visible.

7. Serve davvero aggiungere `User.supabaseId`?

Not for the immediate migration if emails are stable and unique. The existing email fallback is enough to preserve old app `User.id` and data visibility.

8. Se sì, proponi migration target e impatti.

Only later if exact auth binding is required: add nullable unique `User.supabaseId`, backfill by email on clone/new Supabase, update provisioning lookup order to `supabaseId -> email -> id`, keep `User.id` stable. Impact: schema migration, provisioning refactor, tests, new operational relink step.

9. Se no, proponi piano user relink basato su email.

Run email diagnostics before cutover, normalize/resolve app user emails, have users log in to new Supabase with same email, rely on provisioning email fallback, verify workspaces/entries after login. No direct DB relink needed unless email diagnostics fail.

10. Quali test vanno aggiunti prima della migrazione?

The tests listed in section 7: email fallback, no duplicates, membership visibility, entry visibility, new user creation only when needed, mixed-case/null-email behavior, and invite acceptance using the app `User.id`.
