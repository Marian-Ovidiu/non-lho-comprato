# Non l'ho comprato

Next.js App Router application for tracking real spending, avoided purchases,
recurring habits, goals, budgets, reports, CSV imports and shared workspaces.

The project is built for a Supabase-backed production deployment with a clean
source archive generated from Git.

## Product Scope

- Personal and shared workspaces.
- Manual expense tracking with payer and beneficiary splits.
- Goals, habits, presets, budgets and monthly reports.
- CSV import workflow for bank statement review.
- Supabase authentication, PostgreSQL data storage, PostHog analytics and
  optional Sentry error reporting.
- Italian and English UI copy.

## Tech Stack

- Next.js 16 App Router and React 19.
- Prisma 7 with `@prisma/adapter-pg` and PostgreSQL.
- Supabase Auth through the SSR cookie adapter.
- Tailwind CSS 4, Radix UI and local crafted components.
- Node test runner, Playwright E2E tests and ESLint.

## Local Setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with local or managed secrets before starting the app. Real
`.env*` files are ignored and must never be committed.

## Verification

Run the full gate before deploys or source releases:

```bash
npm run check
```

This runs Prisma validation, lint, typecheck, unit tests and a production build.

## Release Archive

Do not zip the working tree manually. It may contain local env files, IDE files,
cache directories, database dumps or generated output.

Create a source archive from the current commit:

```bash
npm run release:archive
```

The archive is written to `release/non-lho-comprato-<commit>.zip` and excludes
local secrets, build artifacts, dependency folders, database dumps and agent
files.

## Documentation

- [Setup](docs/SETUP.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Operations](docs/OPERATIONS.md)
- [Security Operations](docs/SECURITY_OPERATIONS.md)
- [Privacy by Design](docs/PRIVACY_BY_DESIGN.md)
- [Release Checklist](docs/RELEASE.md)

## Important Notes

- Use `npm ci`, not ad-hoc dependency installs, when preparing a release.
- Use `npx prisma migrate deploy` for deployed databases.
- Keep `DATABASE_URL` pointed at the Supabase transaction pooler in serverless
  runtime environments.
- Keep `DIRECT_URL` for migrations and maintenance commands.
- Keep test databases separate from local and production data.
