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

`PROD_DATABASE_URL` must use a dedicated read-only database role. The dump
script refuses obvious admin-like users such as `postgres`.

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

## Security Operations

Use `docs/SECURITY_OPERATIONS.md` for provider 2FA/MFA, Supabase service-role
boundaries, read-only dump roles, monthly access audits and key rotation.

## Privacy Operations

Use `docs/PRIVACY_BY_DESIGN.md` before public launches, ownership transfers or
material feature changes. Keep `/privacy` aligned with real provider
configuration, retention windows and subprocessors in use.

Generate a server-side field-encryption key:

```bash
npm run security:field-key
```

After configuring `APP_FIELD_ENCRYPTION_KEY` in the target environment, encrypt
existing plaintext free-text fields:

```bash
npm run security:encrypt-fields
```

## Cache and Generated Files

These can be regenerated and are intentionally excluded from releases:

- `.next/`
- `node_modules/`
- `src/lib/generated/prisma/`
- `next-env.d.ts`
- `*.tsbuildinfo`
- `release/`
- `backups/`
