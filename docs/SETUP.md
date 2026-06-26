# Setup

## Requirements

- Node.js 20 or newer.
- npm.
- PostgreSQL database, typically Supabase Postgres.
- Supabase project for authentication.

## Install

```bash
npm ci
cp .env.example .env.local
npx prisma generate
```

Fill `.env.local` with real values. Do not commit it.

## Database

For local development you can use either a local PostgreSQL database or a
Supabase development database.

Runtime:

```env
DATABASE_URL=<transaction-pooler-url>?pgbouncer=true
```

Migrations:

```env
DIRECT_URL=<direct-or-session-pooler-url>
```

Apply migrations:

```bash
npx prisma migrate deploy
```

Seed default categories for existing workspaces:

```bash
npx prisma db seed
```

## Development

```bash
npm run dev
```

The app runs on `http://localhost:3000` by default.

## E2E

Use a disposable database only.

```bash
cp .env.e2e.example .env.e2e
npm run test:e2e:install
npm run test:e2e:db:push
npm run test:e2e:seed
npm run dev:e2e
npm run test:e2e
```
