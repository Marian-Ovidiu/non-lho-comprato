# Release Checklist

## Before Creating an Archive

1. Confirm the working tree contains only intentional changes.
2. Review privacy readiness:

- `/privacy` lists the actual controller identity, contact mailbox,
  subprocessors and retention rules for the release.
- `docs/PRIVACY_BY_DESIGN.md` launch checklist has been reviewed.
- Sentry/PostHog are disabled or backed by the chosen legal basis and provider
  configuration.
- `APP_FIELD_ENCRYPTION_KEY` is configured server-side, or the release notes
  explicitly state that selective field encryption is disabled for this
  environment.

3. Run the full verification gate:

```bash
npm run check
```

This includes `npm run security:check`, which verifies that privileged Supabase
keys stay behind server-only boundaries.

4. Commit the release-ready source.
5. Create the archive:

```bash
npm run release:archive
```

## Verify the Archive

List archive contents:

```bash
unzip -l release/non-lho-comprato-$(git rev-parse --short HEAD).zip
```

There must be no matches for local secrets or generated output. The two safe
env templates are allowed in the archive.

```bash
unzip -Z1 release/non-lho-comprato-$(git rev-parse --short HEAD).zip \
  | grep -E '(^|/)(AGENTS\.md|CLAUDE\.md|node_modules|\.next|\.git|\.idea|\.agents|\.claude|release|backups)(/|$)|(^|/)\.env($|\.|-)' \
  | grep -Ev '(^|/)\.env(\.e2e)?\.example$' || true
```

Expected result: no matches.

## What the Archive Includes

- Application source code.
- Prisma schema and migrations.
- Public assets required by the app.
- Tests and E2E fixtures.
- Documentation in `README.md` and `docs/`.
- Environment templates.

## What the Archive Excludes

- Real env files and secrets.
- Local database dumps.
- Dependency folders.
- Next.js build output.
- IDE and agent-local files.
- Release archives themselves.
