# Phase 2B — Secret Exposure Inventory and Rotation Checklist

Date: 2026-06-10

Scope: document-only secret exposure inventory and post-cutover rotation checklist for `non-lho-comprato`.

No secrets, passwords, tokens, keys, OAuth secrets, or full connection strings are included in this document.

No rotation was performed. No env files were modified. No database, migration, query, Vercel, Supabase, Google, Sentry, PostHog, OpenAI, or Resend mutation was executed.

## Executive Summary

Phase 2A removed sensitive local artifacts from the git index and verified the release archive denylist. Phase 2B treats any credentials copied through local `.env*`, backup files, archives, chat/session context, or migration workflows as potentially exposed until proven otherwise.

Recommended posture:

- Do not rotate production-critical credentials before Preview and cutover are verified unless there is an active incident.
- Rotate migration-era and copied credentials immediately after cutover verification.
- Rotate one secret class at a time and smoke test after each class.
- Keep old Supabase available through the rollback window.

## Inventory Method

Commands used only listed paths or variable/category names. Values were not printed.

Checked categories by path/name only:

- Local ignored sensitive paths: `.env.local`, `.env-backup/`, `backups/`, `.idea/`, `.claude/`, `.agents/`, `.DS_Store`, `tsconfig.tsbuildinfo`.
- Tracked sensitive-template path: `.env.example` only.
- Provider/config references by name: database URL variables, Supabase variables, Vercel/OIDC references, Google/OAuth references, Sentry, PostHog, OpenAI, Resend.

## Potentially Compromised Secret Categories

| Category | Exposure basis | Rotate timing | Systems to update | Notes |
|---|---|---:|---|---|
| Old Supabase production DB password | Old production dump/clone workflow and previous env handling | After new production cutover is verified, or immediately if old prod remains reachable from unsafe contexts | Old Supabase database settings, rollback env store, any old production Vercel env if still used | Keep old Supabase online for rollback, but rotate credentials after rollback plan is validated. |
| New Supabase `nlc-v2` DB password | `nlc-v2` migration/restore/local validation workflow and local env use | Immediately after cutover verification | Supabase `nlc-v2` database settings, Vercel Preview/Production `DATABASE_URL`, `DIRECT_URL`, local `.env.local` | Runtime `DATABASE_URL` must remain Transaction pooler `:6543` with `pgbouncer=true`; `DIRECT_URL` must remain Session pooler `:5432`. |
| Supabase anon public key | Public key may have appeared in local files or docs | Evaluate after cutover; rotate only if project policy requires or if exposed in unsafe archive | Supabase `nlc-v2`, Vercel env, local env, `.env.example` placeholder only | Anon key is public by design but should still be project-correct and never confused with service role. |
| Supabase service role key | High-risk server-only key if present in local env/backups or copied during migration | Rotate immediately after cutover verification if it exists or was copied | Supabase `nlc-v2`, Vercel env only if code actually uses it, local env cleanup | Do not add this key to Vercel if the app does not require it. Never expose to client env. |
| Vercel OIDC token or Vercel token | Possible copied env/backup/session exposure category | After Preview/Production env is stable, or immediately if a token value was present in unsafe files | Vercel account/project tokens, GitHub Actions secrets if applicable | Prefer OIDC over long-lived tokens where available. |
| Google OAuth client secret | Configured for Supabase Auth Google provider; may have been copied locally | Rotate after DB cutover and login smoke tests, if copied outside Google/Supabase dashboards | Google Cloud OAuth credentials, Supabase Auth provider config | After rotation, retest Google login and `/auth/callback` on Preview/Production. |
| Sentry auth token | Variable/category references found | Evaluate; rotate if present in local env/backups or CI logs | Sentry token management, GitHub Actions secrets, Vercel env if used | `SENTRY_DSN` is client-visible; `SENTRY_AUTH_TOKEN` is sensitive. |
| PostHog key | Variable/category references found | Evaluate; rotate if exposed outside intended public/client usage | PostHog project settings, Vercel env | Client project keys are less sensitive than private API keys, but should not be mixed with secrets. |
| OpenAI API key | Provider/category references found in documentation/search inventory | Rotate if present in local env/backups or copied through unsafe channels | OpenAI project keys, Vercel env, local env | Only server-side env should hold API keys. |
| Resend API key | Provider/category references found in documentation/search inventory | Rotate if present in local env/backups or copied through unsafe channels | Resend API keys, Vercel env, local env | Verify email flows after rotation if used. |

## Required Rotation Order

Use this order unless an active compromise requires emergency rotation.

1. Deploy/cutover verified.
2. Rotate DB password.
3. Update Vercel env.
4. Rotate Google client secret if necessary.
5. Invalidate old local env files.
6. Regenerate release archive with `npm run release:archive`.

Detailed execution order:

1. Confirm Vercel Preview is green against `nlc-v2`.
2. Confirm Production cutover is complete and smoke tests pass.
3. Save rollback env metadata securely without printing values.
4. Rotate old Supabase production DB password if old prod remains online.
5. Rotate new `nlc-v2` DB password.
6. Update Vercel Production and Preview `DATABASE_URL` and `DIRECT_URL` with redacted verification only.
7. Redeploy any environment that requires redeploy to pick up env changes.
8. Smoke test login, dashboard, entries, stats, habits, goals, workspace members, and logout/login.
9. Rotate Google OAuth client secret if it was copied locally or through unsafe channels.
10. Update Supabase Auth Google provider config with the new Google secret.
11. Smoke test Google login and `/auth/callback` again.
12. Rotate service role key if present or used.
13. Update only server-side locations for service role key; do not add it to client env.
14. Evaluate and rotate Vercel tokens, Sentry auth tokens, OpenAI keys, Resend keys, and other provider secrets if they were present in local env/backups or copied outside approved stores.
15. Invalidate or archive local env files by replacing real values with placeholders or deleting local-only copies after confirming no rollback need.
16. Regenerate release archive with `npm run release:archive`.
17. Verify archive denylist with `unzip -l` before any further deploy package handoff.
18. Record rotation date, owner, affected systems, and smoke test result.

## Do Not Rotate Before Cutover

Do not rotate these before Preview and Production cutover are verified, unless there is an active incident:

- `nlc-v2` DB password, because local/Preview/Production env may not yet be aligned.
- Google OAuth client secret, because login validation depends on stable provider config.
- Supabase service role key, if any migration/verification workflow still requires it.
- Old production DB password, if rollback depends on old production credentials and they have not been saved securely.

Rationale: pre-cutover rotation can create ambiguous failures across DB connectivity, Supabase Auth, Vercel env propagation, and rollback.

## Systems To Update

| System | Update after rotation | Verification |
|---|---|---|
| Supabase old production | DB password if old production remains reachable | Confirm rollback plan uses the updated credential or intentionally preserves a sealed pre-rotation credential. |
| Supabase `nlc-v2` | DB password, service role key if used, Google provider secret | Confirm Auth provider and database connectivity. |
| Vercel Preview | `DATABASE_URL`, `DIRECT_URL`, Supabase public vars, optional server-only keys | Deploy/refresh Preview and smoke test. |
| Vercel Production | `DATABASE_URL`, `DIRECT_URL`, Supabase public vars, optional server-only keys | Redeploy Production and smoke test. |
| Google Cloud Console | OAuth client secret if rotated | Confirm Supabase Auth Google login and callback. |
| GitHub Actions | Sentry auth token or other CI secrets if present | Run CI without exposing values. |
| Sentry | Auth token if used for source maps/releases | Confirm release upload or Sentry integration if applicable. |
| PostHog | Project key/private key if rotated | Confirm analytics events where expected. |
| OpenAI | API key if present | Confirm only server-side usage and no client exposure. |
| Resend | API key if present | Confirm email flow if used. |
| Local developer env | Replace or invalidate real values after rotation | Ensure `.env.local` remains ignored and never archived. |

## Rollback Considerations

- Keep the old Supabase project online until the rollback window is complete.
- If old production DB password is rotated, update the sealed rollback credential store at the same time.
- If Production is rolled back to old Supabase, ensure Vercel env values match old Supabase credentials and Google/Supabase Auth config for that path.
- If users create data in `nlc-v2` after cutover, rollback can cause data divergence. Decide whether to freeze writes during cutover or document reconciliation.
- Do not delete old local env backups until either rollback is impossible by policy or sealed replacement credentials are verified.
- Do not store rollback secrets in markdown reports.

## Owner / Manual Steps

| Step | Owner | Manual action |
|---|---|---|
| Confirm cutover readiness | App owner | Verify Phase 2E/2F acceptance criteria. |
| Rotate Supabase DB passwords | Supabase admin | Rotate old and new DB passwords in dashboard, one at a time. |
| Update Vercel env | Vercel project admin | Update Preview/Production env without printing values. |
| Redeploy and smoke test | App owner | Redeploy affected environments and run smoke tests. |
| Rotate Google OAuth secret | Google Cloud admin | Rotate only if copied/exposed; update Supabase Auth provider. |
| Rotate provider keys | Provider admins | Sentry/PostHog/OpenAI/Resend as applicable. |
| Clean local env | Developers | Replace old local values, invalidate backups, keep `.env.local` ignored. |
| Regenerate archive | Release owner | Run `npm run release:archive` and denylist check. |

## Redacted Variable Checklist

Use this format when recording work. Do not paste real values.

```text
DATABASE_URL=<redacted transaction pooler :6543 pgbouncer=true>
DIRECT_URL=<redacted session pooler :5432>
NEXT_PUBLIC_SUPABASE_URL=<redacted project base url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<redacted anon public key>
SUPABASE_SERVICE_ROLE_KEY=<redacted server-only key, if used>
GOOGLE_OAUTH_CLIENT_SECRET=<redacted, if rotated>
VERCEL_TOKEN=<redacted, if present>
SENTRY_AUTH_TOKEN=<redacted, if present>
POSTHOG_KEY=<redacted, if rotated>
OPENAI_API_KEY=<redacted, if present>
RESEND_API_KEY=<redacted, if present>
```

## Current Status

- Document created: `PHASE_2B_SECRET_ROTATION_CHECKLIST.md`.
- No automatic rotation performed.
- No env files modified.
- No secrets printed.
- No full connection strings printed.
- No DB commands executed.
- No provider configuration changed.

## Validation Results

The required npm commands were executed after writing this checklist. Results are recorded below by command after execution.

- `npm run prisma:validate`: failed, `prisma: command not found`.
- `npm run lint`: failed, `eslint: command not found`.
- `npm run typecheck`: failed, `tsc: command not found`.
- `npm run test`: failed, `tsx: command not found`.

Interpretation: project dependencies/binaries are not available in this local environment. No dependency installation was performed in Phase 2B.
