# Phase 9 — Private Debug / App Health Page

## What the page shows

URL: `/debug`

The page is divided into six sections:

### 1. Sessione
- User ID (Supabase/Prisma user ID)
- Authenticated email
- Display name (if available)

### 2. Workspace
- Workspace ID
- Workspace name
- Workspace kind (`private` / `shared`)
- Current user's role in the workspace
- Total member count

### 3. Ambiente (server-side environment)
- `NODE_ENV`
- `VERCEL_ENV` (if deployed on Vercel)
- App version (hardcoded `"0.1.0"`, matches `package.json`)
- Commit SHA (`VERCEL_GIT_COMMIT_SHA` first 8 chars, if available)
- Database configured: yes/no (boolean from `DATABASE_URL` presence)
- Sentry configured: yes/no (via `isSentryEnabled()`)
- PostHog configured: yes/no (via `NEXT_PUBLIC_POSTHOG_KEY` + enabled flag)

### 4. Browser / PWA (client-side)
- Current pathname
- Viewport size (`widthxheight`)
- Display mode (`browser` / `standalone`)
- Locale
- Timezone
- Online status
- Service Worker controller: yes/no
- Service Worker registrations count
- Local time (ISO string)
- User agent string

### 5. Feedback recenti
Last 20 `Feedback` rows from the database, ordered by `createdAt DESC`, showing:
- Type + timestamp
- User email (or truncated user ID if email unavailable)
- Workspace name
- Message excerpt (max 200 chars)
- Route, display mode, viewport, locale, timezone

### 6. Note sicurezza
A brief privacy reminder rendered on the page itself.

## Access rule

Access is server-gated in `app/debug/page.tsx`:

```ts
const user = await getAuthenticatedUser();
if (!user || user.email !== "h.marian914@gmail.com") {
  notFound();
}
```

All unauthorized requests (unauthenticated or wrong email) receive a standard Next.js 404. The route is not listed in navigation for other users.

A developer-only link to `/debug` is shown at the bottom of the More/Altro page when the authenticated user is `h.marian914@gmail.com`.

## What is intentionally not shown

- Entry titles, amounts, notes, categories, beneficiaries
- Any financial figures or metric computations
- Raw `savedAmount`, `realCost`, `alternativeCost` values
- Workspace member names or emails beyond the current user's own role
- Auth tokens, session cookies, Supabase JWT
- `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or any other secret value
- Full localStorage or sessionStorage contents
- Screenshots or DOM captures
- Server-side request logs or raw error stacks

## Privacy notes

- Server data is fetched with minimal Prisma selects — only the fields listed above.
- Client browser data is collected in the component at render time only, not persisted anywhere on this page.
- The feedback table shows user emails — these are already known to the developer (they are the only authorized viewer) and are stored in the `Feedback` model linked to existing `User` records.
- `DATABASE_URL` presence is shown as a boolean only. The actual URL is never emitted to the page.

## Follow-ups

- The `DEVELOPER_EMAIL` constant is duplicated in `app/debug/page.tsx` and `app/more/page.tsx` — could be extracted to a shared `src/lib/developer-config.ts` when more gates are needed.
- Add a lightweight `/debug/healthz` JSON endpoint for uptime monitors (no auth needed, responds `{ status: "ok" }`).
- Consider a `status` column on `Feedback` rows to mark them as `read` / `resolved` from this page.
- The page currently has no pagination — if feedback volume grows, add a "Load more" or page param.
