# Phase 2A — Repository and Artifact Hygiene

Date: 2026-06-10

Scope: repository hygiene and release archive safety for `non-lho-comprato` before any Vercel Preview/Production deploy.

No database, migration, query, env mutation, Vercel, Supabase, or Production command was executed in this phase.

## Summary

Repository/artifact hygiene was tightened for env files, DB dumps, backups, IDE files, agent files, cache/build artifacts, and release archives.

Key outcomes:

- `.gitignore` now explicitly ignores real env files, `.env-backup/`, `backups/`, `*.dump`, IDE directories, agent directories, `.next/`, `tsconfig.tsbuildinfo`, and `.DS_Store` recursively.
- `.dockerignore` now mirrors the same denylist for Docker/build contexts.
- `npm run release:archive` now uses `git archive` with a stronger denylist and includes `.env.example` explicitly.
- Real backup dumps were removed from the git index without deleting local files.
- `.agents/` and `.idea/` were removed from the git index without deleting local files.
- `.env.example` was sanitized to use generic placeholders for Supabase and DB URL values.
- Release archive was generated through `npm run release:archive`, not by manual zip.
- Release archive denylist check passed.

## Files Modified

- `.gitignore`
- `.dockerignore`
- `package.json`
- `.env.example`
- `PHASE_2A_REPO_ARTIFACT_HYGIENE.md`

Generated artifact:

- `release/non-lho-comprato-8d6fb3e.zip`

Note: `release/` is ignored. The generated zip is a local artifact and should not be committed.

## Files Removed From Git Index

The following were removed from the git index using `git rm --cached`; local copies were not deleted.

### DB dumps

- `backups/prod-2026-06-10.dump`
- `backups/prod-fresh-2026-06-10.dump`

These were staged additions before Phase 2A. They are now ignored local files under `backups/`.

### Agent directory

Removed from index as directory: `.agents/`

Tracked files removed from index: 19 files under `.agents/skills/`.

### IDE directory

Removed from index as directory: `.idea/`

Tracked files removed from index: 6 files under `.idea/`.

## Ignore Policy Added or Confirmed

Required denylist now covered:

- `.env`
- `.env.*`
- `!.env.example`
- `.env-backup/`
- `backups/`
- `*.dump`
- `.idea/`
- `.claude/`
- `.agents/`
- `.next/`
- `tsconfig.tsbuildinfo`
- `.DS_Store`
- `**/.DS_Store`
- `node_modules/`
- `release/`

`.env.local` may exist locally, but is ignored, untracked, and excluded from release archives.

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

Archive contents summary:

```text
371 files
.env.example present
```

Denylist check was run against `unzip -l` output for:

- real `.env` / `.env.*` files, excluding allowed `.env.example`
- `.env-backup/`
- `backups/`
- `*.dump`
- `.git/`
- `.next/`
- `.idea/`
- `.claude/`
- `.agents/`
- `.DS_Store`
- `tsconfig.tsbuildinfo`
- `node_modules/`

Result: no denylist matches.

Important release note: the archive is generated from the current `HEAD` plus the working-tree `.env.example` via `--add-file=.env.example`. For an actual deploy, commit the hygiene changes first and rerun `npm run release:archive` so the archive reflects the intended release commit.

## Secret Exposure Inventory Check

Checks performed without printing secret values:

- Sensitive filename inventory using `find`.
- Sensitive variable/category inventory using `grep -RIl`, printing paths only.
- `.env.example` secret-like value check, printing only variable names/categories.

Findings:

- Local sensitive files/directories still exist on disk and are ignored: `.env.local`, `.env-backup/`, `backups/`, `.DS_Store`, `.idea/`, `.claude/`, `.agents/`, `tsconfig.tsbuildinfo`.
- These local files/directories are not included in the release archive.
- Sensitive variable names are referenced in docs/scripts/config, which is expected for deploy documentation and runtime config code.
- No secret-like values were detected in `.env.example` after sanitization.
- No real secret values or full connection strings were printed or saved in this report.

Categories observed by variable/path name only:

- Supabase URL/key categories.
- Database URL categories.
- Vercel/OIDC references in documentation/workflows.
- Token/secret/password variable names in docs/scripts/config.

## Commands Executed

Allowed hygiene commands:

```bash
git status --short --ignored
git ls-files --stage -- .env .env.local .env.merge-source '.env-backup/*' 'backups/*' '.idea/*' '.claude/*' '.agents/*' '.next/*' '*.dump' '.DS_Store' 'tsconfig.tsbuildinfo' 'node_modules/*'
git rm --cached -r backups .agents .idea
find ... sensitive path inventory
grep -RIlE ... sensitive variable/category inventory
npm run release:archive
unzip -l release/non-lho-comprato-8d6fb3e.zip
npm run prisma:validate
npm run lint
npm run typecheck
npm run test
```

No forbidden commands were executed.

## Validation Results

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

Interpretation: the required npm checks could not run because project dependencies/binaries are not available in the local environment. No `npm install` or dependency installation was performed in this phase.

## Acceptance Criteria Status

- No real `.env*`, dumps, `.git`, `.next`, IDE directories, agent directories, cache files, `.DS_Store`, `tsconfig.tsbuildinfo`, or `node_modules` in release archive: passed.
- `.env.example` remains tracciable and contains placeholders instead of secret-like DB/Supabase values: passed.
- Dump files and real env files are not staged/tracked: passed for checked sensitive paths.
- `npm run release:archive` is the documented release path and was used: passed.
- Manual zip was not used: passed.
- `npm run prisma:validate`, `npm run lint`, `npm run typecheck`, `npm run test`: blocked by missing binaries; see validation results.

## Remaining Local State To Be Aware Of

The following sensitive/local artifacts still exist on disk and are intentionally ignored:

- `.env.local`
- `.env-backup/`
- `backups/`
- `.DS_Store` files
- `.idea/`
- `.claude/`
- `.agents/`
- `tsconfig.tsbuildinfo`
- `release/`

They must not be manually zipped or uploaded. Use `npm run release:archive` only.

## Next Recommended Step

Install or restore project dependencies in a controlled way, then rerun:

```bash
npm run prisma:validate
npm run lint
npm run typecheck
npm run test
npm run release:archive
```

Do not proceed to Vercel Preview until these checks are green or explicitly accepted with documented risk.
