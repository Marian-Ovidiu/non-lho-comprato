# Operations

## Main Commands

```bash
npm run dev
npm run build
npm run start
npm run check
npm run test
npm run test:e2e
```

## Database Helpers

Print the current database target without leaking the password:

```bash
npm run db:target
```

Create a read-only production dump:

```bash
PROD_DATABASE_URL=<readonly-url> npm run db:dump:prod -- backups/prod.dump
```

Restore into a local database:

```bash
LOCAL_DATABASE_URL=postgresql://localhost/... npm run db:restore:local -- backups/prod.dump
```

Run read-only safety checks:

```bash
npm run db:preflight:workspace
npm run db:preflight:auth-cutover
npm run db:postflight:workspace
```

## Monitoring

Sentry and PostHog are optional. Keep them disabled unless the environment
variables are fully configured.

## Cache and Generated Files

These can be regenerated and are intentionally excluded from releases:

- `.next/`
- `node_modules/`
- `src/lib/generated/prisma/`
- `next-env.d.ts`
- `*.tsbuildinfo`
- `release/`
- `backups/`
