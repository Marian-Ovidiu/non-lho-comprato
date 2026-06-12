# Phase 14 — UI Data Distribution Cleanup

Date: 2026-06-12

Source of truth: `docs/product-ready/13_INFORMATION_ARCHITECTURE_RECOMMENDATIONS.md`

---

## Changes Applied

### Fix 1 — Dashboard: couple balance promoted (APPLIED)

**File:** `src/components/dashboard/crafted-dashboard.tsx`

Moved the `coupleBalance` JSX block from position 8 (after streak and habits) to position 3
(immediately after the quick actions / `<Rule />`). It now renders before the category breakdown,
streak, habits, goals, and recent entries.

Visibility logic is unchanged: the section remains hidden when `coupleBalance.supported` is false
or `coupleBalance.amount === 0`. No balance formula changed.

---

### Fix 2 — Dashboard: "Impatto oggi" removed from today StatTrio (APPLIED)

**Files changed:**
- `src/components/dashboard/crafted-dashboard.tsx` — removed `Impatto oggi` item from StatTrio;
  removed `savedToday` from `CraftedDashboardProps` type and component destructuring
- `src/lib/crafted-dashboard-build.ts` — removed `savedToday: number` from the input type and
  `savedToday: input.savedToday` from the returned props object
- `app/page.tsx` — removed `savedToday: todaySummary.totalSavedToday` from the
  `buildCraftedDashboardProps` call

The today strip now shows two items only: **Speso oggi** and **Movimenti oggi**.

`DailyCheckinOverlay` in `app/page.tsx` receives `savedToday` as its own prop directly (line 390)
and is unaffected — impact data remains available in the daily check-in overlay where it has
the context of a per-day summary.

---

### Fix 3 — Dashboard: per-category "impatto netto" micro-labels removed (APPLIED)

**File:** `src/components/dashboard/crafted-dashboard.tsx`

Removed the conditional `<Mono>` block that showed `±X€ impatto netto` under each category name
in the dashboard category list. The category rows now show only: colour dot · icon · category name
· movement count · spent amount.

Category-level impact remains visible on the Stats page (in `CraftedCategoryBars` which is
untouched), where it has the appropriate analytical context.

---

### Fix 4 — More page: StatTrio removed (APPLIED)

**Files changed:**
- `src/components/more/crafted-more.tsx` — removed `StatTrio` import; removed `monthSaved`,
  `entriesCount`, `streak` from `CraftedMoreProps` and component destructuring; removed the
  `isAuthenticated ? <StatTrio ... /> : null` block
- `app/more/page.tsx` — removed `getDashboardSummary` and `getGlobalStreak` imports; removed
  `monthSummary` and `streakResult` local variables; simplified `Promise.all` to only fetch
  `authUser` and `workspaceResult`; removed the three corresponding props from `<CraftedMore />`

The More page now loads faster (two fewer server actions on page load). All navigation links,
workspace tools, the debug link, and the sign-out button are unchanged.

---

### Fix 5 — Stats: "Avresti speso / Impatto medio / Indice netto" made collapsible (APPLIED)

**File:** `src/components/stats/crafted-stats.tsx`

Wrapped the second `StatTrio` (previously showing Avresti speso / Impatto medio / Indice netto
as a primary row) in a native `<details>/<summary>` element. The section collapses by default
under the label **Dettagli del periodo**.

- Values are not deleted and remain fully accessible when expanded.
- The first `StatTrio` (Speso / Impatto netto / Movimenti) is unaffected.
- No formulas or data fields changed.

---

### Fix 6 — Monthly report: StatTrio made collapsible (APPLIED)

**File:** `src/components/reports/crafted-monthly-report-header.tsx`

Wrapped the existing `StatTrio` (Impatto netto / Movimenti / Indice netto) in a native
`<details>/<summary>` under the label **Riepilogo del mese**. The section collapses by default.

The "Speso nel mese" big number remains fully visible and primary. All three StatTrio values
remain accessible on expand. No data, calculations, or report structure changed.

---

### Fix 7 — Goals: impact-source note added (APPLIED)

**File:** `src/components/goals/crafted-goals.tsx`

Added a short `Serif` note at the top of `CraftedGoals` (appears before the featured goal and
any goal list sections):

> "Le mete avanzano con l'impatto positivo: cose non comprate e confronti dove hai speso meno
> del riferimento."

The note is styled `text-[13px] text-ink-3` (muted secondary copy), consistent with similar
contextual notes elsewhere in the app. It only renders when `CraftedGoals` is mounted (i.e.,
when goals exist) — the empty state (`CraftedGoalsEmptyState`) is a separate component and is
not affected.

---

## What Stayed Unchanged

- All metric formulas (`entry-metrics.ts`, `workspace-balance.ts`, etc.)
- All Prisma schema, models, and migrations
- All server actions (`entries.ts`, `stats.ts`, `reports.ts`, `goals.ts`, etc.)
- All dashboard/stats/reports/export calculations
- All 142 existing tests (all pass, no test files modified)
- The `DailyCheckinOverlay` — still receives `savedToday` directly from `app/page.tsx`
- Stats first StatTrio (Speso / Impatto netto / Movimenti) — unchanged
- Stats category bars section, including per-category `impatto netto` annotation
  (those remain in Stats, only removed from the Dashboard)
- Auth and workspace behavior
- Feedback and debug pages
- Create/edit entry form logic
- All navigation links, workspace tools, debug link, sign-out on More page

---

## Why No Formulas / Schema / API Changed

All 7 fixes are purely presentational:

1. JSX block reordering (couple balance position)
2. Removing a StatTrio item that was already computed and available elsewhere
3. Removing a conditional text annotation
4. Removing a StatTrio block (the values are still computed by the stats action for other callers)
5. Wrapping existing StatTrio items in `<details>` — values unchanged, just hidden by default
6. Same as 5, for the report header
7. Adding a static text note

The data layer (Prisma queries, server actions, aggregation functions) remains intact.

---

## Validation

```
npm run lint          ✓ (clean)
npm run typecheck     ✓ (clean)
npm run test          ✓ 142 pass, 0 fail
npm run build         ✓ all pages compiled
```

---

## Follow-ups for Later Phases

### WCAG / Accessibility

The `<details>/<summary>` elements added in Fixes 5 and 6 use
`[&::-webkit-details-marker]:hidden` to remove the native browser disclosure triangle.
A follow-up accessibility pass should:
- Add `aria-expanded` or `aria-label` to the summary elements
- Verify keyboard navigation (Enter/Space to toggle) works correctly across browsers
- Check contrast of the summary text (`text-ink-3`) against WCAG AA (3:1 minimum for non-text
  interactive elements)

### Goals note visibility

The impact-source note in `CraftedGoals` does not appear on the `CraftedGoalsEmptyState`.
If the empty state is shown more often than goals, it may be worth adding a shorter version
there too (e.g., "Le mete si costruiscono con cose non comprate e confronti positivi.").

### Stats second StatTrio — default closed UX

The `<details>` for "Dettagli del periodo" starts collapsed. If user research shows that
`Indice netto` or `Avresti speso` are used frequently, a persistent open-state preference
(localStorage) could be added. For now, closed-by-default matches the Phase 13 recommendation.

### Dashboard couple balance wording

The current copy (`A favore di [nome]`) was identified in Phase 13 as oblique. A follow-up
wording pass can change it to `Devi X€ a [nome]` / `[nome] ti deve X€` for directness.
No logic change needed — only the Serif text strings inside the couple balance block.
