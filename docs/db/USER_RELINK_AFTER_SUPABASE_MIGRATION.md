# User Relink After Supabase Migration

## Why This Is Needed

When the database is restored into a new Supabase project, the application data is copied but Supabase Auth users are not guaranteed to keep the same `auth.users.id` values. After Marian, Martina, and the friend log in to the new project, the new `auth.users` rows can have different IDs.

Application data should keep its existing `User.id` values because those IDs are referenced by workspace ownership, memberships, entries, beneficiaries, invites, and habit targets. The relink step should therefore update only `User.supabaseId` by matching email addresses.

Current local schema note: `prisma/schema.prisma` currently has `User.id`, `User.email`, `User.name`, and `User.image`, but no `User.supabaseId`. The relink script is prepared for the target migration design and will abort safely until a future schema migration adds `User.supabaseId`.

## Local Schema Findings

`User` fields currently present:

- `id`
- `email`
- `name`
- `image`
- `createdAt`
- `updatedAt`

Current direct `User` relations:

- `Workspace.ownerUserId -> User.id`
- `WorkspaceMember.userId -> User.id`
- `WorkspaceInvite.createdByUserId -> User.id`
- `WorkspaceInvite.acceptedByUserId -> User.id`
- `Entry.createdByUserId -> User.id`
- `Entry.paidByUserId -> User.id`
- `EntryBeneficiary.userId -> User.id`
- `Habit.targetUserId -> User.id`

Current non-relations:

- `Goal` does not directly reference `User`; it still uses legacy `Person?`.
- `QuickPreset` does not directly reference `User`; it still uses legacy `Person?`.

## Correct Execution Order

1. Dump old production.
2. Restore the dump into a local or staging clone.
3. Apply data repair and migrations on the clone only.
4. Restore the repaired DB into the new Supabase project.
5. Configure auth providers in the new Supabase project.
6. Have Marian, Martina, and the friend log in to the new project so `auth.users` rows exist.
7. Run diagnostics on the new Supabase project:

```bash
npm run db:user-relink:diagnostics
```

8. Review diagnostics:

- app users exist;
- auth users exist;
- app/auth email matches exist;
- no duplicate app user emails;
- no duplicate auth user emails;
- expected workspace memberships still point to existing `User.id` values.

9. Run relink only on the new Supabase project or clone:

```bash
npm run db:user-relink:new-supabase
```

10. Rerun diagnostics:

```bash
npm run db:user-relink:diagnostics
```

11. Test app login, workspace selection, entries, stats, invites, and private workspace isolation.

## What The Relink Does

The relink script:

- updates only `public."User"."supabaseId"`;
- matches by `lower(public."User".email) = lower(auth.users.email)`;
- does not create app users;
- does not change `User.id`;
- does not touch `Entry`, `WorkspaceMember`, `EntryBeneficiary`, `Goal`, `QuickPreset`, or `auth.users`;
- aborts on duplicate emails;
- aborts if `User.supabaseId` is missing.

## Risks

- If `User.supabaseId` is not added by a prior migration, relink cannot proceed. This is expected and safe.
- If two app users share the same normalized email, relink is ambiguous and aborts.
- If two auth users share the same normalized email, relink is ambiguous and aborts.
- If a real user logs in with a different email/provider identity, no match is created and manual decision is required.
- If this is accidentally run on old production after adding `supabaseId`, it can overwrite mappings. The script is clearly marked and must be run only against a new Supabase project or clone.

## Rollback

Before running the relink on a new Supabase project or clone:

1. Take a database backup or snapshot.
2. Save diagnostics output.
3. Optionally snapshot current mappings:

```sql
-- Optional snapshot query, run manually if needed before relink.
SELECT id, email, to_jsonb("User")->>'supabaseId' AS supabase_id
FROM public."User"
ORDER BY lower(email) NULLS LAST, id;
```

Rollback options:

- Restore the DB snapshot.
- Or, if a mapping snapshot was captured and the `supabaseId` column exists, manually restore previous `supabaseId` values on the clone/new project only.

Never use rollback SQL against the old production project unless a separate production incident runbook explicitly approves it.
