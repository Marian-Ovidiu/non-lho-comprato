# Non l'ho comprato

Next.js App Router application for tracking avoided purchases, actual spending, habits, reports, statistics and shared workspaces.

## Local Setup

1. Install dependencies:

```bash
npm ci
```

2. Create a local env file from the template:

```bash
cp .env.example .env.local
```

3. Fill `.env.local` with local or managed secrets. Never commit real `.env*` files.

4. Run the development server:

```bash
npm run dev
```

## Verification Gate

`npm run check` is the official pre-deploy verification gate. It runs:

- `npm run prisma:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Run it before opening a production PR or building a release artifact:

```bash
npm run check
```

## E2E Testing

The Playwright suite must run against a dedicated test database, never against local
or production data. The e2e scripts refuse to run unless `.env.e2e` contains
`E2E_DATABASE_GUARD=non-lho-comprato-e2e`.

1. Create the e2e env file:

```bash
cp .env.e2e.example .env.e2e
```

2. Point `DATABASE_URL` and `DIRECT_URL` in `.env.e2e` to a disposable e2e
   database.

3. Install the browser, sync the current schema and seed deterministic e2e data:

```bash
npm run test:e2e:install
npm run test:e2e:db:push
npm run test:e2e:seed
```

4. Run the browser tests:

```bash
npm run test:e2e
```

The e2e auth bridge is only enabled when `NODE_ENV !== "production"` and
`E2E_TEST_AUTH_ENABLED=true`; in production the route returns 404 and the session
bridge is inactive.

## Safe Release Artifact

Do not zip the working tree manually. The working tree may contain local env files, IDE files, caches or agent files.

Create a clean source archive with:

```bash
npm run release:archive
```

The script uses `git archive` from `HEAD` and excludes local/security-sensitive paths such as `.env*`, `.git`, `.idea`, `.claude`, `.agents`, `.next`, `node_modules`, `__MACOSX` and `.DS_Store`.

Verify an artifact with:

```bash
unzip -l release/non-lho-comprato-$(git rev-parse --short HEAD).zip \
  | grep -E '(^|/)\.env|node_modules|\.next|\.git|\.idea|\.agents|\.claude' || true
```

Expected result: no matches. If grep prints paths, the artifact is not safe to ship.

## Environment Hygiene

- Commit `.env.example` and `.env.e2e.example` only (both are explicitly allowed in `.gitignore`).
- Keep `.env`, `.env.local`, `.env.e2e`, `.env.merge-source` and all other real env files ignored.
- Rotate secrets if a real env file was ever included in an artifact or shared outside the secret manager.
- Keep legacy flags disabled in production.
