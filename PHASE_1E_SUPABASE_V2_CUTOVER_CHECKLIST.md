# Phase 1E — Supabase v2 Local/Vercel Cutover Checklist

Run date: 2026-06-10

## Executive summary

New Supabase project `nlc-v2` is restored, migrated, repaired, and clean according to Phase 1D.

This checklist prepares the application cutover without executing it.

Target project:

| Field | Value |
|---|---|
| Supabase project name | `nlc-v2` |
| Supabase project ref | `nohezhrghqstxyyxbfhs` |
| Status | staging/new production candidate |

Verified before this checklist:

- restore schema `public` on `nlc-v2`: successful;
- migration deploy on `nlc-v2`: successful;
- workspace drift repair: `updated_rows = 1`;
- test user cleanup: `deleted_rows = 1`;
- workspace preflight: all `0`;
- workspace postflight: all `0`;
- auth/email preflight: all `0`;
- `npm run check`: passed;
- Next.js build: passed.

No secrets are included in this document.

## A. Supabase Auth Config Manuale

Configure this manually in Supabase dashboard for project `nlc-v2`.

Path:

```txt
Authentication -> URL Configuration
```

### Local test config

Set for local validation:

| Setting | Value |
|---|---|
| Site URL | `http://localhost:3000` |

Redirect URLs:

```txt
http://localhost:3000/auth/callback
http://localhost:3000/**
```

### Vercel Preview config

When the Preview deployment URL is available, add it to Supabase redirect URLs.

Examples:

```txt
https://<vercel-preview-url>/auth/callback
https://<vercel-preview-url>/**
```

If Vercel creates branch-specific Preview URLs, add the exact URL used for validation. Do not rely on a production domain until the production cutover step.

### Production config

Before production cutover, add the real production domain.

Use placeholders until the final domain is known:

```txt
https://<production-domain>/auth/callback
https://<production-domain>/**
```

After cutover, set Site URL to the real production domain if that is the intended canonical app URL.

### Google provider

Path:

```txt
Authentication -> Providers -> Google
```

Manual checks:

- Google provider is enabled.
- Google Client ID is configured for `nlc-v2`.
- Google Client Secret is configured for `nlc-v2`.
- Google OAuth authorized redirect URI matches the callback URL expected by Supabase for project `nlc-v2`.
- If Google Cloud OAuth config changed, update the callback URL there before local/Preview/Production login tests.

Do not paste Google secrets into repo files, reports, or chat.

## B. Env Locali `.env.local`

Use a local `.env.local` for testing against `nlc-v2`. Do not commit it.

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://nohezhrghqstxyyxbfhs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<nlc-v2-anon-key>
DATABASE_URL=<nlc-v2-transaction-pooler-6543-url>?pgbouncer=true
DIRECT_URL=<nlc-v2-session-pooler-5432-url>
```

Optional/server-only variable if used by the app or future scripts:

```bash
SUPABASE_SERVICE_ROLE_KEY=<nlc-v2-service-role-key>
```

Rules:

- `DATABASE_URL` for runtime/serverless should use the Supabase Transaction pooler on port `6543` with `pgbouncer=true`.
- `DIRECT_URL` for Prisma migration/maintenance should use the Session pooler on port `5432` or another approved direct maintenance URL.
- Do not use old production Supabase keys for `nlc-v2` testing.
- Do not commit `.env.local`.
- Do not print full connection strings.

Sanitized target check:

```bash
node scripts/db/print-db-target.js DATABASE_URL
node scripts/db/print-db-target.js DIRECT_URL
```

## C. Test Locale

Start the app locally against `nlc-v2`:

```bash
npm run dev
```

Manual checklist:

- Google login opens correctly.
- Login redirects back to `/auth/callback`.
- Auth callback completes without error.
- Dashboard is visible.
- Entries are visible.
- Stats are visible.
- Habits are visible.
- Goals are visible.
- Workspace members page is visible.
- Workspace switcher shows expected workspaces.
- The user is relinked by email to the existing app `User`, not placed into an empty workspace.
- Existing workspace memberships remain visible after login.
- Existing entries/beneficiaries remain visible after login.
- Create one test entry only if safe for the test workspace.
- Delete the test entry after verification if the UI supports safe deletion.
- If deletion is not available or uncertain, do not create test data.

Expected real-user checks:

- Marian sees expected workspaces and entries.
- Martina sees expected workspaces and entries.
- The private-workspace user sees only their expected private workspace/data.

If any user lands in an empty workspace, stop. That indicates auth/email mapping or env target misconfiguration.

## D. Vercel Preview Env

Update Preview/Staging environment variables in Vercel only after local validation is clean.

Detailed Preview cutover procedure, env-shape checks, archive verification, and
Preview smoke checklist are maintained in
`PHASE_2E_VERCEL_PREVIEW_CUTOVER.md`.

Required Preview/Staging variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://nohezhrghqstxyyxbfhs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<nlc-v2-anon-key>
DATABASE_URL=<nlc-v2-transaction-pooler-6543-url>?pgbouncer=true
DIRECT_URL=<nlc-v2-session-pooler-5432-url>
```

Optional if used:

```bash
SUPABASE_SERVICE_ROLE_KEY=<nlc-v2-service-role-key>
```

Preview rules:

- `DATABASE_URL` must use Transaction pooler port `6543` with `pgbouncer=true`.
- `DIRECT_URL` must use Session pooler port `5432` or approved maintenance URL.
- Do not set Preview to old production by accident.
- Do not paste secrets into build logs or documentation.

Preview verification:

- Deploy Preview.
- Add the exact Preview URL to Supabase Auth Redirect URLs.
- Test Google login on Preview.
- Verify dashboard, entries, stats, habits/goals, workspace members.
- Verify no user lands in an empty workspace.
- Run smoke tests before Production env changes.

## E. Vercel Production Cutover

Do not begin production cutover until local and Preview validation are clean.

Detailed Production cutover gates, rollback procedure, env-shape checks, and
post-deploy checklist are maintained in
`PHASE_2F_PRODUCTION_CUTOVER_RUNBOOK.md`.

Recommended order:

1. Take final backup/dump of old production.
2. If old production changed since the last `nlc-v2` restore, rerun restore/migrate/repair/check on `nlc-v2` or a final cutover target.
3. Confirm `nlc-v2` preflight/postflight/auth checks are still clean.
4. Save current Vercel Production env values securely for rollback.
5. Update Vercel Production env values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://nohezhrghqstxyyxbfhs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<nlc-v2-anon-key>
DATABASE_URL=<nlc-v2-transaction-pooler-6543-url>?pgbouncer=true
DIRECT_URL=<nlc-v2-session-pooler-5432-url>
```

6. Update optional production server-only env if used:

```bash
SUPABASE_SERVICE_ROLE_KEY=<nlc-v2-service-role-key>
```

7. Redeploy Vercel Production.
8. Test Google login on production domain.
9. Verify expected user data and workspace access.
10. Monitor Vercel logs.
11. Monitor Supabase logs.
12. Keep old Supabase production project online until stability is proven.

Production post-deploy smoke checklist:

- `/login` works.
- `/auth/callback` works.
- dashboard loads.
- entries load.
- stats load.
- habits/goals load.
- reports load.
- workspace members load.
- exports/API routes do not error.
- invited/shared workspace flows still work if tested safely.
- no user sees another workspace unexpectedly.
- no user lands in an empty workspace unexpectedly.

## F. Rollback

Rollback requirements before cutover:

- Keep old Supabase project active.
- Keep old database credentials active until rollback window closes.
- Save previous Vercel Production env values securely.
- Keep previous deployment available in Vercel.

Rollback procedure:

1. Restore old Vercel Production env values.
2. Redeploy previous or current build against old Supabase env.
3. Test login against old Supabase.
4. Verify dashboard/data visibility.
5. Keep `nlc-v2` unchanged for forensic comparison.
6. Document what failed before attempting another cutover.

Rollback caveat:

- If users create new data in `nlc-v2` after cutover, rollback can create data divergence. Decide in advance whether to freeze writes during the cutover window or accept a manual reconciliation process.

## G. Chiavi da ruotare

After cutover is stable, rotate exposed or migration-era credentials.

Detailed rotation inventory and execution order are maintained in
`PHASE_2B_SECRET_ROTATION_CHECKLIST.md`. Use that checklist as the source of
truth for secret categories, owner steps, rollback considerations, and redacted
recording format.

Recommended rotation list:

- old production DB password;
- new `nlc-v2` DB password if it was shared during migration;
- Supabase anon key if it was exposed outside approved channels;
- Supabase service role key if it was used or exposed;
- Google OAuth secret if it was exposed during setup;
- any Vercel env value copied through insecure channels.

Rotation process:

1. Rotate one key class at a time.
2. Update Vercel env values immediately after rotation.
3. Redeploy if required by Vercel env behavior.
4. Smoke test login and DB-backed pages.
5. Record rotation date and affected services.

Do not delete the old Supabase project until the new project has been stable through the agreed observation window.

## H. Final hard stops

Stop cutover if any of these are true:

- Supabase Auth redirect URLs are incomplete.
- Google provider is not working on local or Preview.
- Any user lands in an empty workspace unexpectedly.
- Any user sees the wrong workspace or another user's private data.
- `npm run db:preflight:workspace` is not clean on final target.
- `npm run db:postflight:workspace` is not clean on final target.
- `npm run db:preflight:auth-cutover` is not clean on final target.
- `npm run check` fails.
- Vercel `DATABASE_URL` uses Session pooler instead of Transaction pooler for runtime.
- Old production env values were not saved for rollback.

## I. Cosa NON è stato fatto in questa fase

- No DB command was executed.
- No migration was executed.
- No query mutative command was executed.
- No production environment variable was changed.
- No Vercel environment variable was changed.
- No Supabase Auth setting was changed by this report.
- No production traffic was cut over.
- No UI/business logic code was modified.
- No secrets were printed or stored in this document.
