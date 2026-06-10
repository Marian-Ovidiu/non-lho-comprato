# Phase 2E — Vercel Preview Cutover

Date: 2026-06-10

Scope: prepare Vercel Preview/Staging cutover to Supabase `nlc-v2`.

Status: prepared only. No Vercel deploy was executed because explicit deployment confirmation was not provided during this phase.

No Production action was performed. No database, migration, query, env mutation, Vercel Production command, Supabase mutation, or old Supabase deletion was executed.

## Executive Summary

This phase prepared the Vercel Preview cutover checklist for `nlc-v2` and verified the release archive hygiene path.

Current outcome:

- Phase 2A hygiene report exists and documents a clean release archive denylist.
- `npm run release:archive` was executed again in this phase.
- Archive denylist check passed.
- Preview deployment was not executed.
- Vercel logs were not checked because no Preview deployment was executed in this phase.
- Quality gates are blocked locally because npm binaries/dependencies are unavailable.

Do not proceed to Preview deployment until dependencies are restored and these commands can run successfully or the risk is explicitly accepted:

```bash
npm run prisma:validate
npm run lint
npm run typecheck
npm run test
npm run build
```

## Repository State

`git status --short` shows substantial existing staged/modified work from prior phases and product-readiness changes.

Important Preview implication:

- Vercel Preview normally deploys from a git branch/commit.
- The current release archive command uses `git archive HEAD` plus working-tree `.env.example`.
- Therefore, the generated archive is clean for denylist purposes, but it may not include all uncommitted Phase 2 changes until those changes are committed.
- Before any real Preview deploy, commit or otherwise intentionally package the exact changes to be tested.

## Phase 2A Hygiene Status

Phase 2A is present:

```text
PHASE_2A_REPO_ARTIFACT_HYGIENE.md
```

Phase 2A documented:

- real env files ignored;
- dump files removed from git index;
- `.agents/` and `.idea/` removed from git index;
- `.env.example` sanitized;
- `release:archive` uses `git archive` with a denylist;
- release archive denylist passed.

## Release Archive Verification

Command executed:

```bash
npm run release:archive
```

Result: passed.

Archive verified:

```text
release/non-lho-comprato-8d6fb3e.zip
```

Archive summary:

```text
371 files
.env.example present
```

Denylist checked against `unzip -l` output for:

- real `.env` / `.env.*` files, excluding allowed `.env.example`;
- `.env-backup/`;
- `backups/`;
- `*.dump`;
- `.git/`;
- `.next/`;
- `.idea/`;
- `.claude/`;
- `.agents/`;
- `.DS_Store`;
- `tsconfig.tsbuildinfo`;
- `node_modules/`.

Result: no denylist matches.

## Required Preview Env Shape

Do not print values. Configure only in Vercel Preview/Staging, not Production.

```text
NEXT_PUBLIC_SUPABASE_URL=<redacted nlc-v2 project base url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<redacted nlc-v2 anon public key>
DATABASE_URL=<redacted Supabase transaction pooler :6543 pgbouncer=true>
DIRECT_URL=<redacted Supabase session pooler :5432>
```

Optional only if confirmed as required by server-side code:

```text
SUPABASE_SERVICE_ROLE_KEY=<redacted server-only service role key>
```

Service-role finding:

- `src/lib/supabase/config.ts` reads `SUPABASE_SERVICE_ROLE_KEY` into a config object.
- Current client creation paths found in `src/lib/supabase/browser.ts` and `src/lib/supabase/server.ts` use URL plus anon key, not a service-role client.
- No direct `serviceRoleKey` use was found beyond config storage.
- Recommendation: do not add `SUPABASE_SERVICE_ROLE_KEY` to Vercel Preview unless a specific server-only flow requires it and has been reviewed.

## Env Validation Rules

Preview env must satisfy:

- `NEXT_PUBLIC_SUPABASE_URL` is the project base URL for `nlc-v2`.
- `NEXT_PUBLIC_SUPABASE_URL` is not `/auth/v1/callback`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` belongs to the new `nlc-v2` project.
- `DATABASE_URL` uses Supabase Transaction pooler on port `6543`.
- `DATABASE_URL` includes `pgbouncer=true`.
- `DIRECT_URL` uses Supabase Session pooler on port `5432` or another approved maintenance URL.
- No old production Supabase key or DB URL is used in Preview.
- No secret is pasted into git, docs, logs, issue comments, or chat.

Record env checks in redacted form only:

```text
NEXT_PUBLIC_SUPABASE_URL=<redacted project base url, no callback path>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<redacted anon public key present>
DATABASE_URL=<redacted transaction pooler :6543 pgbouncer=true>
DIRECT_URL=<redacted session pooler :5432>
SUPABASE_SERVICE_ROLE_KEY=<absent or redacted server-only key if explicitly required>
```

## Supabase Auth Redirects For Preview

Before testing Preview login, add the exact Vercel Preview URL to the new Supabase `nlc-v2` project.

Supabase dashboard path:

```text
Authentication -> URL Configuration
```

Add the exact Preview callback URL:

```text
https://<vercel-preview-url>/auth/callback
```

Add the exact Preview wildcard URL if required by the project policy:

```text
https://<vercel-preview-url>/**
```

Rules:

- Use the exact URL generated for the Preview deployment.
- Do not use the Production domain for Preview validation.
- Do not point callback URLs at the old Supabase project.
- Do not paste provider secrets into reports.

## Preview Deployment Procedure

This section is intentionally not executed in this phase.

Prerequisites:

- Phase 2A archive hygiene is clean.
- Phase 2B secret checklist is available.
- Phase 2C hydration fix is committed or intentionally included in the deploy branch.
- Phase 2D local smoke test is complete or its blocker/risk is accepted.
- `npm run prisma:validate`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass in a dependency-complete environment.
- Preview env variables are configured with redacted shape above.
- Supabase Auth Preview redirect URL is configured.

Deployment options:

1. Preferred: push a branch/commit and let Vercel create a Preview deployment.
2. Alternative: use Vercel CLI only after explicit user confirmation and only targeting Preview/Staging.

Forbidden:

- Do not change Vercel Production env.
- Do not trigger a Production deployment.
- Do not run DB migrations or DB repair scripts.
- Do not delete or mutate the old Supabase project.

## Preview Smoke Test Checklist

Run this after Preview deployment is available.

### 1. Load/Login

- [ ] Open Preview URL.
- [ ] `/login` loads.
- [ ] Google login button/control is visible.
- [ ] No config error appears before login.

### 2. Google Auth

- [ ] Click Google login.
- [ ] Google account chooser opens.
- [ ] OAuth completes successfully.
- [ ] Browser returns to Preview URL.
- [ ] `/auth/callback` completes without error.

### 3. Dashboard and Restored Data

- [ ] Dashboard loads.
- [ ] Expected restored data is visible.
- [ ] Existing user does not land in a new empty workspace.
- [ ] Workspace shell/switcher shows expected workspaces.

### 4. Core Pages

- [ ] Entries page loads.
- [ ] Old entries are visible.
- [ ] Stats page loads.
- [ ] Habits page loads.
- [ ] Goals page loads.
- [ ] Workspace members page/section loads.

### 5. Create/Edit/Delete Entry

Use a clearly identifiable temporary title, for example `Smoke test Preview nlc-v2`.

- [ ] Create temporary entry.
- [ ] Confirm it appears in the expected workspace.
- [ ] Edit the temporary entry.
- [ ] Confirm edited value persists after refresh/navigation.
- [ ] Delete temporary entry.
- [ ] Confirm temporary entry is gone.

If delete is unavailable or uncertain, do not create persistent test data.

### 6. Logout/Login

- [ ] Logout works.
- [ ] Refresh remains logged out.
- [ ] Login again with the same Google account.
- [ ] Expected workspace and restored data are still visible.

### 7. Splash/Hydration

- [ ] Hard refresh Preview.
- [ ] No hydration mismatch appears for `FlameSplash`, `AppSplash`, `SplashGate`, or `RootLayout`.
- [ ] Splash exits normally.

## Preview Logs Checklist

Only after Preview exists:

- [ ] Check Vercel Preview runtime logs.
- [ ] Check build logs.
- [ ] Redact any URL query, token, cookie, email, or connection detail before recording.
- [ ] Confirm no DB connection errors.
- [ ] Confirm no Supabase Auth callback errors.
- [ ] Confirm no Prisma runtime errors.
- [ ] Confirm no server action errors during smoke tests.

Redacted log summary format:

```text
Preview logs checked: yes/no
DB errors: none / redacted summary
Auth errors: none / redacted summary
Build errors: none / redacted summary
Runtime errors: none / redacted summary
```

## Validation Results In This Environment

### `npm run prisma:validate`

Status: failed due to missing local binary.

```text
sh: prisma: command not found
```

### `npm run lint`

Status: failed due to missing local binary.

```text
sh: eslint: command not found
```

### `npm run typecheck`

Status: failed due to missing local binary.

```text
sh: tsc: command not found
```

### `npm run test`

Status: failed due to missing local binary.

```text
sh: tsx: command not found
```

### `npm run build`

Status: failed due to missing local binary.

```text
sh: next: command not found
```

Interpretation: local validation cannot complete in this environment because project dependencies/binaries are missing. No dependency installation was performed.

## Preview Execution Status

Preview deploy status: not executed.

Reason:

- No explicit confirmation was provided to execute Vercel Preview deployment commands.
- Local quality gates are blocked by missing dependencies.

Preview logs status: not checked.

Reason:

- No new Preview deployment was executed in this phase.

## Acceptance Criteria Status

- Preview login ok: not run.
- Data visible: not run.
- No DB/auth errors in Preview logs: not run.
- Production untouched: passed.
- Old Supabase untouched: passed.
- Archive generated with `npm run release:archive`: passed.
- Archive denylist verified clean: passed.

## Go / No-Go

Current recommendation: no-go for Preview execution from this environment until dependencies are restored and quality gates pass, unless the user explicitly accepts the risk and confirms a Preview-only deploy.

Minimum next steps:

1. Restore/install dependencies in a controlled way.
2. Run:

```bash
npm run prisma:validate
npm run lint
npm run typecheck
npm run test
npm run build
```

3. Commit or otherwise intentionally include the exact Phase 2 changes intended for Preview.
4. Configure Vercel Preview env with redacted env shape above.
5. Add exact Preview URL to Supabase Auth redirect URLs.
6. Deploy Preview only after explicit confirmation.
7. Run Preview smoke tests and check redacted logs.
