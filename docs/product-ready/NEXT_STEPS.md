# Next Steps

**As of:** 2026-06-14 (after Phase 19)

---

## Recommended next phase: Phase 20 — Design / visual polish pass

**Goal:** Improve the visual quality, spacing, typography, and mobile feel of the app without touching any business logic, schema, or metric code.

After Phases 1–18, all the numbers are correct, the wording is honest, the forms are clear, and accessibility P1 issues are fixed. The weakest remaining dimension before a public launch is the visual experience.

### What Phase 20 may change

- Spacing, padding, margin, and layout proportions
- Typography scale, font weights, line heights
- Color palette refinement — surface colors, border colors, text hierarchy
- Responsive breakpoints and mobile-first layout
- Dark mode polish (if dark mode exists)
- Icon sizing and alignment
- Component-level visual consistency (cards, rows, buttons, form fields)
- Empty state illustrations or copy

### Hard rules for Phase 20

These must not be broken regardless of visual intent:

1. **No schema changes.** No new or modified Prisma models, fields, or migrations.
2. **No server action changes.** Do not touch any file in `src/actions/`.
3. **No metric formula changes.** `src/lib/entry-metrics.ts` is locked. Tests must continue to pass.
4. **Do not remove Phase 18 accessibility fixes.** All `<label htmlFor>`, `id`, `aria-pressed`, `aria-describedby`, `aria-label`, and `focus-visible:ring` attributes added in Phase 18 must remain. The visual style of labels may change but the HTML semantics may not be removed.
5. **Preserve Phase 14 data hierarchy.** Couple balance stays at position 3 on the dashboard (before categories). The collapsed secondary StatTrio in Stats stays collapsed by default. The goals impact note stays.
6. **Preserve category management flows.** The `/workspace/categories` page, create/edit/archive/restore/delete flows, and destructive confirm dialogs must remain functionally unchanged.
7. **No new npm dependencies** unless strictly necessary for a design primitive (e.g. a motion library). If adding a dependency, document why the existing Tailwind/ShadCN stack could not achieve the same result.
8. **Run full validation before marking Phase 20 complete:** `npm run lint` + `npm run typecheck` + `npm run test` + `npm run build`.

### Suggested scope for Phase 20

Limit Phase 20 to one pass with a clear scope. Do not try to redesign everything at once. Suggested scope:

- Dashboard card: spacing, number typography, hero hierarchy
- Entry row: spacing, badge legibility, secondary text
- Bottom navigation: active state color, icon/label sizing
- Form fields: consistent focus states, label/input vertical rhythm
- Category management page: list item spacing, action button sizing

Phase 20 is explicitly **not** the place for new features, new pages, or new data flows.

---

## Later roadmap

These are not in priority order. Each requires its own phase with an audit doc before implementation.

### Real Web Push notifications (Phase 21 candidate)

**What is missing:** VAPID key generation, `PushManager.subscribe()` call on the client, `PushSubscription` DB model, a server push endpoint, a `push` event handler in `public/sw.js`, and a Vercel Cron trigger.

**Why it matters:** Current notifications only fire when the app is open. iOS users receive no notifications at all. This is a significant gap for a habit-tracking use case.

**Prerequisites:** Read `15A_HABIT_NOTIFICATIONS_AUDIT.md` — the Tier 2 implementation path is documented there. Decision needed: send push from Vercel Cron or trigger from server action.

**Rules:** No metric formula changes. No category logic changes. New schema: `PushSubscription` model with `userId`, `endpoint`, `keys`, `workspaceId`. Migration required.

---

### Privacy and account deletion (Phase 22 candidate)

**What is missing:** "Delete my account" flow that removes the user's entries, beneficiary rows, workspace memberships, feedback, and auth record. A "Download my data" export is also needed for GDPR.

**Why it matters:** Required for any EU-facing public launch. Without it, the app is non-compliant for GDPR Article 17 (right to erasure).

**Rules:** Deletion must be cascading and irreversible. Shared entries paid by the deleted user need a defined handling policy (orphan or delete). Requires careful owner-transfer logic if the deleted user is a workspace owner.

---

### Feedback rate limiting and status (Phase 23 candidate)

**What is missing:** Per-user/per-IP rate limiting on `submitFeedback`, and a "feedback received" status visible to the user (e.g. "we've read this").

**Why it matters:** Currently a single user can spam the feedback table. Acceptable for 2-user private beta; not acceptable for public launch.

**Rules:** No schema changes required (can use `createdAt` count in a time window). Could add a `status` field to `Feedback` model if response tracking is needed.

---

### Production monitoring (Phase 24 candidate)

**What is missing:** Error monitoring (Sentry or equivalent), query performance monitoring, and uptime alerts. The debug page (`/debug`) shows environment booleans for Sentry and PostHog — neither is confirmed configured.

**Why it matters:** Without error tracking, production bugs are invisible until a user reports them via the feedback form.

**Rules:** No UI changes. Environment variable configuration only (plus SDK initialization). No metric/schema/form changes.

---

### Onboarding refinement (Phase 25 candidate)

**What is missing:** A guided first-run experience that explains the three entry intents (Ho speso / Speso+confronto / Non l'ho comprato) and the metric model to new users. The current onboarding page exists but has not been updated to reflect the Phase 6 wording or Phase 14 information hierarchy.

**Rules:** UI-only pass. No new pages needed — improve the existing `/onboarding` page.

---

### Public launch checklist (Phase 26 candidate)

Before any public launch (non-invited users), complete:

- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Cookie/data notice (if analytics are active)
- [ ] Rate limiting on feedback and other mutation actions
- [ ] Account deletion flow (Phase 22)
- [ ] Production monitoring active (Phase 24)
- [ ] GDPR data export
- [ ] Stripe or equivalent payment integration if monetizing
- [ ] Load testing for concurrent users
- [ ] App Store / Play Store submission (if distributing as native-wrapped PWA)

---

## What not to do next

- Do not start Phase 21 (Web Push) before Phase 20 (design pass) is accepted. The design pass is lower risk and higher user-facing impact.
- Do not add AI features, ads, or monetization hooks inside phases that have a different declared scope.
- Do not modify `src/lib/entry-metrics.ts` without updating `src/lib/entry-metrics.test.ts` and verifying the golden dataset cases still pass.
- Do not rename category slugs in the codebase without a migration that updates the `slug` field on existing DB rows.
- Do not apply the legacy sharing repair script (`npm run repair:legacy-sharing -- --apply`) again unless new legacy data has been imported. Phase 12 confirmed the repair is complete.
