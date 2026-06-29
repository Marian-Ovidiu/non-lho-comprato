# Privacy by Design

This document maps the app's privacy posture to GDPR Article 25 data protection
by design and by default. It is operational documentation, not legal advice.
Before a commercial launch or ownership transfer, validate it with the legal
controller's counsel and update the public privacy policy.

Official references:

- GDPR Article 25 guidance from the European Commission:
  https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/obligations/what-does-data-protection-design-and-default-mean_en
- EDPB Guidelines 4/2019 on Article 25:
  https://www.edpb.europa.eu/documents/guideline/guidelines-42019-on-article-25-data-protection-by-design-and-by-default_en
- Supabase Vault documentation:
  https://supabase.com/docs/guides/database/vault

## Data Classification

Movements, budgets, imported transactions and workspace membership are personal
financial data. They are not necessarily GDPR special-category data, but they
can reveal private habits and must be treated as confidential.

The app should not ask for health, political, religious or other special
category data. If a user writes that data into titles, notes or imported CSV
rows, it becomes user-provided content and should still be protected.

## Current Controls

- Authentication is handled through Supabase Auth with server-side session
  validation.
- Application records are scoped by workspace and server actions assert the
  current user's workspace membership before reading or writing scoped data.
- Shared workspace deletion removes the user's membership and direct profile
  references while keeping shared history available to remaining members.
- The Supabase service role is server-only and guarded by `npm run
  security:check`.
- Production dumps must use a dedicated read-only database role.
- Export endpoints are authenticated, workspace-scoped and rate-limited.
- Sentry is optional and strips user, query, headers, cookies and request body
  data before sending events.
- PostHog is optional, sends only explicit events, disables autocapture and
  disables session recording.
- Selective application-level encryption is available for private free-text
  fields: `Entry.note`, `QuickPreset.note`, `Feedback.message`,
  `ImportedTransaction.description`, `ImportedTransaction.merchantName` and
  imported CSV `rawJson`.
- Security headers are configured in `next.config.ts`.

## Privacy by Default Decisions

- New data belongs to a workspace instead of being globally visible.
- Workspace access is checked server-side, not trusted from the client.
- Admin/service credentials are unavailable to client bundles.
- Analytics and error reporting require environment configuration and are not
  required for the core app to work.
- No advertising, sale of data or automatic sharing with AI services is part of
  the product.
- The AI export produces a CSV download for the user; the app does not send that
  CSV to an AI provider.

## Retention Rules

Baseline retention shown in the public policy:

- Account and app data remain while the account is active or required to
  provide the service.
- Private single-member workspaces are deleted with the account.
- Shared workspace content can remain for remaining members after direct user
  references are removed.
- Imported CSV batches and mapped rows remain with the workspace until deleted
  or until the workspace is deleted.
- Provider logs, backups and rate-limit buckets should be kept for the shortest
  practical period.

Operational follow-up before commercial launch:

- Define concrete retention windows for logs, backups, support tickets and
  analytics data.
- Configure provider-side retention in Supabase, Vercel, Sentry and PostHog.
- Document backup deletion timing and restore access controls.

## Export and Deletion

User-facing paths:

- Privacy policy: `/privacy`
- Public account deletion instructions: `/delete-account`
- In-app account deletion: `/account/delete`
- AI analysis export: More, Export AI

Required operational behavior:

- Respond to access, correction, deletion, portability, restriction and
  objection requests through the privacy contact.
- Verify the requestor before exporting or deleting data manually.
- Keep a minimal record of privacy requests without storing unnecessary data.

## Subprocessors

Current technical subprocessors to list and review:

| Provider | Purpose | Required launch check |
| --- | --- | --- |
| Supabase | Auth, Postgres database and session infrastructure | DPA, region, backups, access roles, MFA |
| Vercel | Hosting, CDN, serverless runtime and platform logs | DPA, team 2FA, log retention, env permissions |
| Sentry | Optional error monitoring | DPA, retention, PII scrubbing, project access |
| PostHog | Optional product analytics | DPA, EU host if needed, retention, consent/legal basis |

If a login provider, email provider, support tool or AI provider is added later,
update both this file and `/privacy` before launch.

## Database Visibility

Database admins and anyone with production database access can read movements
and link them to users. Current mitigation is organizational and technical:

- least-privilege provider access;
- read-only dump roles for exports;
- monthly access audit;
- service-role key rotation;
- no service-role key in client code;
- no production dumps in release archives.

Selective field-level encryption is implemented for free-text fields that are
more likely to reveal private context. Amounts, dates, categories and titles
remain plaintext so workspace queries, statistics, reports and sharing keep
working.

Encrypted field format:

- Text fields use a versioned `nlcenc:v1:<key-id>:...` payload.
- Imported CSV `rawJson` uses a JSONB envelope containing encrypted text.
- Existing plaintext values are still readable for backwards compatibility.
- `npm run security:encrypt-fields` encrypts existing plaintext values once the
  key is configured.

Environment variables:

- `APP_FIELD_ENCRYPTION_KEY_ID`: active key identifier, for example
  `2026-06-26`.
- `APP_FIELD_ENCRYPTION_KEY`: active 32-byte base64 AES-256-GCM key.
- `APP_FIELD_ENCRYPTION_PREVIOUS_KEYS`: optional JSON object of decrypt-only
  previous keys, for example `{"2026-01-01":"<old-base64-key>"}`.

Generate a key with:

```bash
npm run security:field-key
```

Run the production backfill only after setting the key in the target
environment:

```bash
npm run security:encrypt-fields
```

Supabase Vault remains better suited to application secrets such as API tokens
that must be read from SQL functions/triggers. For user movement free text, the
app keeps the encryption key outside the database and decrypts only in trusted
server-side code.

## Launch Checklist

Before selling or deploying a public commercial instance:

1. Replace the placeholder controller identity in the privacy policy with the
   legal entity or person operating the service.
2. Confirm the privacy contact mailbox is monitored.
3. Sign or verify DPAs for every subprocessors in use.
4. Set concrete retention windows for provider logs, backups, analytics,
   support messages and rate-limit buckets.
5. Decide the legal basis for PostHog and keep it disabled unless the chosen
   consent or legitimate-interest flow is implemented.
6. Confirm Sentry PII stripping in production with a test error.
7. Generate and store `APP_FIELD_ENCRYPTION_KEY` as a server-only production
   secret, then run `npm run security:encrypt-fields` for existing data.
8. Review workspace isolation tests and `npm run security:check`.
9. Run the monthly access audit in `docs/SECURITY_OPERATIONS.md`.
10. Verify account deletion in production with a test account.
11. Keep a record of processing activities for the controller.
