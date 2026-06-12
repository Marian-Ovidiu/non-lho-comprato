# Phase 8 — Lightweight Feedback Collection for Beta Debugging

## What was added

### Database

New `Feedback` model in `prisma/schema.prisma`:

```
model Feedback {
  id          String    @id @default(cuid())
  userId      String?
  workspaceId String?
  type        String
  message     String
  route       String?
  userAgent   String?
  viewport    String?
  timezone    String?
  locale      String?
  displayMode String?
  appVersion  String?
  createdAt   DateTime  @default(now())

  user      User?      @relation("FeedbackUser", ...)
  workspace Workspace? @relation("FeedbackWorkspace", ...)
  ...
}
```

Named relations used (`"FeedbackUser"`, `"FeedbackWorkspace"`) because both `User` and `Workspace` already have multiple named relations to other models.

Migration: `prisma/migrations/20260612100000_add_feedback/migration.sql`

### Validation

Pure validation module: `src/features/feedback/validation.ts`

- Validates `type` ∈ `["bug", "suggestion", "confusion", "other"]`
- Validates `message` (3–2000 chars)
- Truncates context fields to safe lengths before storing
- Returns typed result with `valid`, `errors`, and `data`

Tests: `src/features/feedback/validation.test.ts` — 10 tests covering type validation, message length boundaries, trimming, truncation, combined errors.

### Server action

`src/actions/feedback.ts` — `submitFeedback(prev, formData)`:

- Validates input via `validateFeedback`
- Reads `userId` from `getAuthenticatedUser()` (silently optional)
- Reads `workspaceId` from `getCurrentWorkspaceId()` (silently optional)
- Creates `Feedback` record in DB
- Returns `{ success, message, errors? }`
- Does not throw on auth/workspace failure — feedback is accepted anonymously

### UI

Floating button: `src/components/feedback/feedback-button.tsx`

- `fixed` position, bottom-right corner
- `z-50` — above mobile bottom bar (`z-40`)
- Mobile: `bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]`
- Desktop: `bottom-6 right-6`
- `PenLine` icon (communicates "write/edit", not support chat)
- Opens Dialog with:
  - Title: "Lascia un feedback"
  - Helper: "Segnala un problema, un consiglio o qualcosa che non ti torna."
  - Pill-style type selector (Problema / Consiglio / Non ho capito qualcosa / Altro)
  - Textarea: "Scrivi cosa è successo o cosa miglioreresti..."
  - Submit: "Invia feedback"
  - Success: "Grazie, feedback inviato." — dialog auto-closes after 1.4 s
  - Error: "Non sono riuscito a inviarlo. Riprova tra poco."
- Context collected client-side (hidden fields), NOT shown to user

Mounted in: `src/components/layout/app-shell.tsx` — inside the authenticated shell only.

## Context collected

| Field         | Source                                    | Max stored length |
|---------------|-------------------------------------------|-------------------|
| `route`       | `window.location.pathname`                | 1000 chars        |
| `userAgent`   | `navigator.userAgent`                     | 500 chars         |
| `viewport`    | `window.innerWidth x window.innerHeight`  | 50 chars          |
| `timezone`    | `Intl.DateTimeFormat().resolvedOptions()` | 100 chars         |
| `locale`      | `navigator.language`                      | 20 chars          |
| `displayMode` | `display-mode: standalone` media query    | 20 chars          |
| `userId`      | Server-side auth session                  | n/a (FK ref)      |
| `workspaceId` | Server-side workspace cookie/session      | n/a (FK ref)      |
| `appVersion`  | Hardcoded `"0.1.0"` in action             | n/a               |

## Intentionally NOT collected

- Entry titles, amounts, notes, categories, beneficiaries
- Workspace name or member list
- localStorage or sessionStorage contents
- Screenshots or DOM captures
- Full network request history
- Any financial data derived from entries
- Auth tokens or session cookies

## Privacy notes

- `userId` and `workspaceId` are optional foreign keys. If the user is not authenticated or workspace context fails, feedback is saved with `null` for both — no error is shown to the user.
- `onDelete: SetNull` on both FK constraints: if the user or workspace is deleted, the feedback rows are retained with nulled-out FK fields (useful for bug analysis).
- No feedback data is sent to third-party services. It is stored only in the app's own database.
- No sensitive financial details are automatically included in any feedback payload.

## Follow-ups

- Admin view for reading feedback (currently only accessible via direct DB query / Prisma Studio)
- Rate limiting per userId/IP to prevent abuse (not needed at beta scale)
- Optional email notification when feedback arrives (could add webhook or Resend integration)
- Consider adding a `status` field (`new` / `read` / `resolved`) for triage
- Consider encrypting `message` at rest if feedback content is sensitive
- `appVersion` is currently hardcoded — should read from `NEXT_PUBLIC_APP_VERSION` env var or `package.json` build injection when release tagging is introduced
