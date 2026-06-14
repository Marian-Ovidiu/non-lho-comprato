# Current Product Status

**Date:** 2026-06-14
**After:** Phases 0–18 complete (Phase 19 = this documentation pass)

---

## Stability rating

| Dimension | Rating |
|---|---|
| Private beta — controlled real users | **9 / 10** — ready |
| Public launch — monetizable | **7 / 10** — usable; known gaps below |

The app is live, used by real users (Marian + Martina), and correctly handles all core money flows.

---

## Completed major areas

### Metrics (Phases 1–5)
- Unified metric module: `src/lib/entry-metrics.ts` — single source of truth for all calculations.
- `calculateEntryMetrics` and `aggregateEntryMetrics` are tested by a 35-case golden dataset.
- Dashboard, stats, monthly reports, CSV export, goals, streaks, entry rows all use the unified module.
- UTC month boundary bug in dashboard fixed (now uses Rome date logic).
- Metric breakdown columns in CSV export: `spentReal`, `avoidedAmount`, `comparisonSaved`, `comparisonOverspent`, `grossPositiveImpact`, `netImpact`, `ordinaryImpact`, `largeComparisonImpact`, `isLargeComparison`.
- Sharing columns in CSV export: `paidByUserId`, `paidByName`, `beneficiaryUserIds`, `beneficiaryNames`, `beneficiaryCount`, `sharePerBeneficiary`, `isShared`.

### UX wording (Phase 6)
- Ambiguous "risparmio" / "evitato" labels replaced with approved Italian product labels:
  `Speso davvero`, `Non comprato`, `Risparmiato scegliendo meglio`, `Speso in più del confronto`, `Impatto netto`, `Grandi confronti`, `Impatto ordinario`.
- Large comparison footnote shown on dashboard only when `largeComparisonImpact > 0`.

### Form clarity (Phase 7)
- Three explicit entry intents throughout create, edit, quick-add, and preset forms:
  1. **Ho speso** — normal expense
  2. **Speso + confronto** — comparison with a reference cost
  3. **Non l'ho comprato** — avoided purchase
- PaidBy and beneficiaries clearly labeled in shared-expense fields.
- Large comparison warning shown in form when comparison delta ≥ 100 EUR.

### Feedback and debug (Phases 8–9)
- Floating feedback button in the authenticated app shell. `Feedback` Prisma model stores type, message, route, user/workspace context.
- Private `/debug` page gated to `h.marian914@gmail.com` — shows session, workspace, environment, PWA/SW state, recent feedback.

### Shared balance (Phases 10–12)
- Legacy data repaired: 2 missing `paidByUserId` backfilled, 1 orphan `EntryBeneficiary` row created.
- `computeCoupleWorkspaceBalance` is tested with 18 balance invariant tests and confirmed antisymmetric.
- Cross-field guard in `validateEntryOwnership` rejects shared entries without a payer.

### Information architecture (Phases 13–14)
- Couple balance promoted to position 3 on dashboard (before categories, after quick actions).
- `Impatto oggi` removed from dashboard today strip (stays in daily check-in overlay).
- Per-category `impatto netto` micro-labels removed from dashboard (moved to Stats).
- Stats secondary StatTrio (`Avresti speso / Impatto medio / Indice netto`) collapsed by default.
- Monthly report StatTrio collapsed by default.
- StatTrio removed from More page.
- Goals page: impact-source clarification note added.

### Notifications (Phases 15A, 15A.1)
- Service worker `notificationclick` handler: focuses existing app window or opens deep link.
- Daily reminder uses `registration.showNotification()` with `new Notification()` fallback.
- Habit reminder uses Rome timezone consistently.
- Notification prompt copy accurately states "Funzionano quando l'app è aperta."

### Category management (Phases 16A–16C)
- Schema: `isDefault Boolean @default(false)` and `archivedAt DateTime?` on Category.
- Upsert bug fixed: default categories are no longer silently reverted on each lazy provision.
- 7 server actions: create, update, archive, restore, delete, reset defaults. Owner-only mutations.
- `/workspace/categories` management page accessible from the More menu (owner-visible).
- Full lifecycle: create custom → edit name/icon/color → archive → restore → delete (if no references).

### Accessibility — P1 fixes (Phases 17–18)
- All major form inputs now have real `<label htmlFor>` associations or label-by-containment.
- `FormFieldError` accepts `id` prop; inputs use `aria-describedby` to link errors.
- Category selector buttons and feedback type pills have `aria-pressed`.
- Desktop nav links have `focus-visible:ring` keyboard focus indicator.
- Category management action buttons have contextual `aria-label` (e.g. "Elimina categoria Caffè").
- Quick-add preset buttons have `aria-pressed`.

---

## Known limitations (not blocking for private beta)

### Notifications — no closed-app delivery
The current notification system uses the browser Notification API. Notifications only fire when the app tab is open. True background delivery (Web Push + VAPID + server push endpoint + Vercel Cron) has not been implemented.
- **iOS status:** `new Notification()` is unsupported on iOS regardless of PWA install. The app cannot notify iOS users at all.
- **Android/desktop:** works when the app is open.
- Phase 15A.1 notes document the exact Tier 2 implementation path.

### Privacy / account deletion
There is no "delete my account" or "export my data" feature. This is a hard requirement for public-facing GDPR compliance.

### Feedback rate limiting
The feedback form has no rate limiting or abuse prevention. A user can submit unlimited feedback. Acceptable for private beta with known users.

### Design polish
The app's visual design has not been touched since Phase 0. Phase 13 identified cognitive clutter and Phase 14 removed the worst offenders, but a proper design pass (spacing, typography, color, responsive layout, dark mode) has not happened. Phase 20 is the recommended next step for this.

### Production migration awareness
Database migrations in `prisma/migrations/` must be applied to the production database. Phase 16A added `20260612120000_category_lifecycle`. Verify this migration has been applied in production before relying on `archivedAt` or `isDefault` fields.

### Habit reminders on non-habit pages
`HabitReminderBanner` is mounted only on `/habits`. If the user is on another page at reminder time, the banner and notification do not fire. Full fix requires moving the trigger to `AppShell`.

---

## Key invariants — must never be broken

| Invariant | Location |
|---|---|
| Metric formulas: `grossPositiveImpact = avoidedAmount + comparisonSaved`, `netImpact = avoidedAmount + comparisonSaved - comparisonOverspent`, `largeComparisonImpact = sum(netImpact where isLargeComparison)`, `ordinaryImpact = netImpact - largeComparisonImpact` | `src/lib/entry-metrics.ts` |
| `isLargeComparison` applies only to `mode=spent + savingContext=comparison` entries; avoided purchases are excluded | `src/lib/entry-metrics.ts` |
| Financial reporting uses entry `date`, not `createdAt`, for all periods | All stats/report/dashboard queries |
| Category slugs are stable once written — changing a slug breaks existing category references | `src/features/categories/slug.ts` |
| Categories are workspace-scoped (`workspaceId` FK, `@@unique([workspaceId, slug])`) | `prisma/schema.prisma` |
| Shared balance must be antisymmetric: `balance(A→B) = -balance(B→A)` | `src/lib/workspace-balance.ts` |
| Shared entries must have `paidByUserId` set; entries without a payer are rejected at the server action layer | `src/lib/entry-ownership.ts` |
| Phase 18 `<label>` and `aria-*` attributes must not be removed from form inputs | All form components |
