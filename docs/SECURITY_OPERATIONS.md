# Security Operations

This document covers provider access, privileged Supabase keys, production
dumps, audit cadence and key rotation. It is part of the release archive and
must be reviewed before selling, handing over or operating the project.

## Service Role Boundary

The Supabase service role or secret key is privileged and bypasses RLS. It must
only be available to trusted server-side code.

Repository guardrails:

- `src/lib/supabase/config.ts` exposes only public Supabase config:
  `NEXT_PUBLIC_SUPABASE_URL` and the anon/publishable key.
- `src/lib/supabase/admin.ts` is marked with `server-only` and is the only
  runtime module that reads `SUPABASE_SERVICE_ROLE_KEY`.
- `npm run security:check` fails if the service role is referenced from client
  surfaces or if the admin client loses the `server-only` guard.
- `npm run check` includes `security:check`.

Operational rules:

- Never create `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.
- Never paste service-role or secret keys into client code, URLs, browser
  storage, issue trackers, chat or screenshots.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in server environment variables in the
  hosting provider. In Vercel, do not expose it to client-side code.
- Prefer Supabase `sb_secret_...` keys for new server-side admin usage when the
  project has migrated from legacy JWT service-role keys.

Official reference: https://supabase.com/docs/guides/getting-started/api-keys

## Supabase Account Access

Minimum baseline:

- Enforce MFA for the Supabase organization when the plan supports it.
- Keep at least two trusted owners for continuity; avoid using Owner for daily
  work.
- Use project-scoped access when available.
- Use Read-Only for audit/review users when the plan supports it.
- Use Administrator only when changing project settings or managing sensitive
  resources.
- Remove users immediately when they no longer need access.

Official references:

- Access control: https://supabase.com/docs/guides/platform/access-control
- Organization MFA enforcement:
  https://supabase.com/docs/guides/platform/mfa/org-mfa-enforcement

## Vercel Account Access

Minimum baseline:

- Enforce 2FA for the Vercel team.
- Limit Owner membership to trusted operators only.
- Prefer project-level roles for contributors where the plan supports them.
- Do not give broad environment-variable permissions unless a person needs to
  rotate or operate secrets.
- Review integrations and Git provider access when people leave the project.

Official references:

- 2FA enforcement: https://vercel.com/docs/two-factor-enforcement
- Access roles: https://vercel.com/docs/rbac/access-roles

## Read-Only Production Dumps

Production dumps must use a dedicated read-only database login, not the default
Supabase `postgres` user and not an application admin credential.

The `db:dump:prod` script sets `default_transaction_read_only=on` and refuses
obvious admin-like usernames such as `postgres`, `postgres.*`,
`supabase_admin`, or `service_role`.

Recommended PostgreSQL role shape, to be run by an admin in Supabase SQL editor
or another trusted admin session:

```sql
create role nlc_dump_readonly login password '<generate-a-strong-password>';

grant usage on schema public to nlc_dump_readonly;
grant select on all tables in schema public to nlc_dump_readonly;
grant usage, select on all sequences in schema public to nlc_dump_readonly;

alter default privileges in schema public
  grant select on tables to nlc_dump_readonly;
alter default privileges in schema public
  grant usage, select on sequences to nlc_dump_readonly;
```

Use only that role for:

```bash
PROD_DATABASE_URL=<production-readonly-url> npm run db:dump:prod -- backups/prod-YYYY-MM-DD.dump
```

Never restore into Supabase production from this project script. Restore only
into local, staging or a reviewed target runbook.

## Key Rotation

Cadence:

- Rotate Supabase secret/service-role keys at least quarterly.
- Rotate `APP_FIELD_ENCRYPTION_KEY` with a planned re-encryption window, not as
  an ad-hoc env edit.
- Rotate immediately after a suspected leak, contractor offboarding, ownership
  transfer, lost device, accidental log exposure or public support paste.
- Rotate Vercel tokens and integration credentials on the same triggers.

Supabase secret key rotation:

1. Create a new secret key in Supabase.
2. Add it to Vercel as the new `SUPABASE_SERVICE_ROLE_KEY`.
3. Redeploy the app.
4. Verify account deletion/admin flows in the deployed environment.
5. Delete the old secret key.

Legacy anon/service/JWT rotation:

1. Follow Supabase's JWT/signing key rotation guide.
2. Update Vercel environment variables.
3. Redeploy.
4. Revoke old keys after traffic has moved to the new values.

Official reference:
https://supabase.com/docs/guides/troubleshooting/rotating-anon-service-and-jwt-secrets-1Jq6yd

Application field-encryption key rotation:

1. Generate a new key with `npm run security:field-key`.
2. Move the current active key into `APP_FIELD_ENCRYPTION_PREVIOUS_KEYS`.
3. Set the new `APP_FIELD_ENCRYPTION_KEY_ID` and `APP_FIELD_ENCRYPTION_KEY`.
4. Redeploy.
5. Run `REENCRYPT_FIELDS=true npm run security:encrypt-fields` so existing
   encrypted values are rewritten with the new active key.
6. Remove old keys from `APP_FIELD_ENCRYPTION_PREVIOUS_KEYS` only after all
   encrypted rows have been re-encrypted and verified.

## Monthly Access Audit

Run this checklist monthly and before every ownership transfer.

| Area | Check | Evidence |
| --- | --- | --- |
| Supabase organization | MFA enforced or every member has MFA enabled | Date, reviewer |
| Supabase members | Owners/Admins are still required | Member list reviewed |
| Supabase project roles | Read-only/project-scoped where possible | Role list reviewed |
| Supabase API keys | No unused secret/service keys | Key list reviewed |
| Database roles | Dump role is read-only and still needed | Role list reviewed |
| Vercel team | 2FA enforcement enabled | Date, reviewer |
| Vercel members | Owners and env managers still required | Member list reviewed |
| Vercel env vars | No client-prefixed secret keys | Env list reviewed |
| Integrations | Git/Supabase integrations still owned by active users | Integration list reviewed |

Do not store secrets in the audit evidence. Store only dates, reviewers and
sanitized screenshots or exported member lists.

## Incident Response

If a privileged key may have leaked:

1. Stop sharing the suspected secret immediately.
2. Remove the secret from any public/private location where it was pasted.
3. Rotate the affected key.
4. Redeploy with the new key.
5. Revoke/delete the old key.
6. Review logs for unusual admin/account deletion/export activity.
7. Record what happened, who rotated the key and when.
