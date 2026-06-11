# Phase 4E — Legacy Metrics Cleanup

## Summary

This document records the outcome of Phase 4E: a read-only audit of all remaining legacy metric calculations, followed by safe replacements where the caller was a duplicate that added no value.

## Classification key

| Class | Meaning |
|-------|---------|
| **migrated** | Replaced in Phase 4A–4D. |
| **replaced-4E** | Replaced in Phase 4E (this document). |
| **legacy-compat** | Kept on purpose — backward compatibility alias, DB aggregate, or display string where new API would change public shape. |
| **risky-followup** | Not changed here — requires larger select refactor or schema change. Documented for Phase 5+. |

---

## Findings

### `src/actions/goals.ts` — `getGoalContribution`

**Before (Phase 4E):**
```ts
function getGoalContribution(entry: EntryMoneyLike): number {
  const money = toEntryMoneyView(entry);
  if (money.savingImpact <= 0) return 0;
  if (money.mode === "avoided" || money.savingContext === "comparison") return money.savingImpact;
  return 0;
}
```

**After:**
```ts
function getGoalContribution(entry: EntryMoneyLike): number {
  return Math.max(0, calculateEntryMetrics(entry).netImpact);
}
```

**Classification:** replaced-4E

**Why safe:** `netImpact` is semantically equivalent to `savingImpact` filtered to avoided/comparison entries. For plain "spent" entries with no comparison, `netImpact = 0` by construction. For overspent comparisons, `netImpact < 0` → `Math.max(0, ...)` = 0, matching the original gate. The Prisma select for goals already includes `realCost`, `alternativeCost`, `savedAmount`, `mode`, `savingContext`.

---

### `src/actions/streaks.ts` — `loadStreakData`

**Before (Phase 4E):**
```ts
select: { date: true, savedAmount: true }
// ...
dayTotals.set(dateKey, round2((dayTotals.get(dateKey) ?? 0) + toNumber(entry.savedAmount)));
```

**After:**
```ts
select: { date: true, realCost: true, alternativeCost: true, savedAmount: true, mode: true, savingContext: true }
// ...
dayTotals.set(dateKey, round2((dayTotals.get(dateKey) ?? 0) + calculateEntryMetrics(entry).netImpact));
```

Also removed the now-unused local `toNumber` helper and `DecimalLike` type.

**Classification:** replaced-4E

**Why safe:** Streak day totals represent "net positive impact per day" (used to drive streak continuity: `hasSavedToday = totalSavedToday > 0`). Using `netImpact` from the unified module is strictly more correct than `savedAmount` (which could be stale or missing for legacy entries). `getTodaySavingStatus` is a dead export — never called from any page; `app/page.tsx` uses `getTodayDashboardSummary` (already migrated in 4A).

---

### `src/components/entries/crafted-entry-list.tsx` — `groupEntries`

**Before (Phase 4E):**
```ts
const saved = Number(entry.savedAmount) || 0;
```

**After:**
```ts
const saved = calculateEntryMetrics(entry).netImpact;
```

**Classification:** replaced-4E

**Why safe:** `totalSaved` in `DayGroup` is a per-day aggregate displayed in the entry list header. Using `netImpact` gives the accurate value from the unified module. The `EntryItem` type already has `mode?`, `savingContext?`, `realCost`, `alternativeCost` — all required fields are present. No public API shape changed.

---

### `src/components/entries/crafted-entry-row.tsx` — `getSecondaryMeta`

**Before (Phase 4E):**
```ts
const savedAmount = toFiniteNumber(entry.savedAmount);
```

**After:**
```ts
const savedAmount = calculateEntryMetrics(entry).netImpact;
```

**Classification:** replaced-4E

**Why safe:** `getSecondaryMeta` uses `savedAmount` to determine the comparison badge display ("X€ sotto il confronto" / "X€ sopra il confronto"). For "avoided" entries the display path uses `alternativeCost` directly and never reads `savedAmount`. For comparison entries, `netImpact = alternativeCost - realCost` which equals the legacy DB `savedAmount` for correct data, and is more accurate for legacy entries missing the field. The entry type already has `mode?`, `savingContext?`, `realCost`, `alternativeCost`.

---

### `src/actions/stats.ts` — `getMonthlyStats`

**Classification:** legacy-compat

Uses `savedAmount` sum from a Prisma aggregate (`_sum`). Cannot use `calculateEntryMetrics` without fetching individual entries. Produces a `totalSaved` DB aggregate for a quick dashboard widget. Acceptable as a backward-compat path until a full entry-level migration is planned.

---

### `src/actions/stats.ts` — `getCategoryStats`

**Classification:** risky-followup

Uses Prisma `groupBy._sum.savedAmount`. Migrating this requires switching from a DB aggregate to entry-level iteration with `calculateEntryMetrics`. Non-trivial: the current groupBy approach is efficient for large workspaces. Follow-up in Phase 5 or a dedicated stats refactor.

---

### `src/actions/stats.ts` — `getTopSavings`

**Classification:** risky-followup (dead function)

Defined in `stats.ts` but never imported or called from any page or component. Filters entries by `savedAmount > 0` at DB level and orders by `savedAmount DESC`. No `mode`/`savingContext` in select. Migration is straightforward but risky to do without a caller to validate. Leave for cleanup or remove in Phase 5.

---

### `app/page.tsx` — `getHomeReflection` sort tiebreaker

**Classification:** legacy-compat

`savedAmount` used as a secondary sort tiebreaker in `weekEntries` ordering. Not a financial metric — just a stable sort key. No accuracy requirement. Safe to leave as-is.

---

### UI labels (various)

**Classification:** legacy-compat (Phase 6 scope)

Remaining Italian label strings referencing "evitati / risparmio" in:
- `src/components/entries/crafted-entry-list.tsx` day-group header
- `src/components/entries/crafted-entries-header.tsx`
- `src/components/reports/monthly-report-preview.tsx`

These are text-only changes, scoped to Phase 6 UX wording pass.

---

## Validation results

After all Phase 4E replacements:

- `npm run lint` — 0 errors, 0 warnings
- `npm run typecheck` — 0 errors
- `npm run test` — 107/107 pass

No DB/schema changes. No form changes. No public API shape changes. No visual redesign.
