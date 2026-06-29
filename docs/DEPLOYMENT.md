# Deployment

## Recommended Target

Vercel with Supabase Auth and Supabase Postgres.

## Required Environment Variables

Set these in the hosting provider:

```env
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never prefix it with
`NEXT_PUBLIC_`, never expose it in browser code and keep it restricted to
trusted server environments. The app uses it only through the server-only
Supabase admin client for flows such as account deletion.

Use the Supabase transaction pooler for `DATABASE_URL` in serverless runtime
environments. Keep `?pgbouncer=true` on that URL.

Use a direct or session-pooler connection for `DIRECT_URL`, because migrations
must not run through transaction pooling.

## Optional Environment Variables

```env
DATABASE_POOL_MAX=5
APP_FIELD_ENCRYPTION_KEY_ID=
APP_FIELD_ENCRYPTION_KEY=
APP_FIELD_ENCRYPTION_PREVIOUS_KEYS=
NEXT_PUBLIC_POSTHOG_ENABLED=false
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
NEXT_PUBLIC_SENTRY_ENABLED=false
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

`DATABASE_POOL_MAX=5` is the default in production. Raise it only after checking
database and pooler capacity.

Generate `APP_FIELD_ENCRYPTION_KEY` with `npm run security:field-key`. Keep it
server-only. Without it, selective free-text encryption stays disabled and new
free-text values are stored as plaintext for compatibility.

## Deploy Steps

1. Install dependencies with `npm ci`.
2. Generate Prisma client with `npx prisma generate`.
3. Apply database migrations with `npx prisma migrate deploy`.
4. Run `npm run check`.
5. Deploy with the hosting provider.

## Production Safety

- Never commit real env files.
- Enforce Supabase MFA and Vercel 2FA for team access.
- Use a dedicated read-only database role for production dumps.
- Keep admin/service-role keys only in server-side environment variables.
- Review `docs/SECURITY_OPERATIONS.md` before handover or production launch.
- Never run test or E2E scripts against production.
- Keep `ENABLE_LEGACY_FALLBACK=false`.
- Keep `ENABLE_LEGACY_AUTH_BRIDGE=false`.
- Configure Supabase redirect URLs for the deployed domain.
