# Phase 1 — Metrics Audit

Date: 2026-06-11

No application source code was changed during this phase.

---

## 1. Current Metric Calculation Map

### Server Actions

| File | Functions | What they compute |
|---|---|---|
| `src/actions/entries.ts` | `getDashboardSummary` | Monthly totalRealSpent, totalAlternativeCost, totalSaved, entriesCount |
| `src/actions/entries.ts` | `getTodayDashboardSummary` (via dashboard.ts) | Today's totalRealSpentToday, totalSavedToday |
| `src/actions/entries.ts` | `serializeEntry` | Per-entry money view via `toEntryMoneyView` |
| `src/actions/stats.ts` | `getStatsPageData`, `getStatsFromEntries` | Overview, monthlyStats, categoryStats, topSavings, insights — all from savedAmount |
| `src/actions/stats.ts` | `getStatsOverview` | Prisma aggregate over realCost, alternativeCost, savedAmount |
| `src/actions/stats.ts` | `getMonthlyStats` | Per-month totals grouped by `getRomeMonthKey(entry.date)` |
| `src/actions/stats.ts` | `getCategoryStats` | Prisma groupBy over savedAmount, realCost, alternativeCost |
| `src/actions/stats.ts` | `getTopSavings` | Entries ordered by savedAmount desc |
| `src/actions/stats.ts` | `getWorkspaceMemberSpendingStats` | Per-member paid/personal/shared via `aggregateMemberSpendingStats` |
| `src/actions/reports.ts` | `getMonthlyReport` | Overview, memberSplit, bestCategory, worstCategory, biggestSaving |
| `src/actions/streaks.ts` | `loadStreakData` | Streak from `getRomeDateKey(entry.date)` |
| `src/actions/dashboard.ts` | `getTodayDashboardSummary` | Today's spending via `getRomeDayRangeForDate` |
| `src/actions/dashboard.ts` | `getHomeDashboardMetrics` | Aggregates summary, todaySummary, workspaceBalance, monthlyStats, categoryStats |
| `src/actions/dashboard.ts` | `getWorkspaceBalance` | Balance via `computeCoupleWorkspaceBalance` |

### Library Modules

| File | Functions | Role |
|---|---|---|
| `src/lib/entry-calculations.ts` | `calculateSavedAmount`, `calculateSavedPercentage` | Standalone helpers (non-throwing, returns 0 on negatives) |
| `src/lib/entry-domain.ts` | `calculateEntryMoney`, `toEntryMoneyView`, `calculateEntrySavedAmount`, `inferEntryMode`, `inferEntrySavingContext`, `isAvoidedEntry`, `isComparedEntry` | **Core entry money logic** — only source that produces `mode`, `savingContext`, `savingImpact` |
| `src/features/entries/form-money.ts` | `resolveEntryMoneyFromForm` | Form-to-money bridge; dispatches to legacy path or tracker-first path |
| `src/lib/monthly-report-analytics.ts` | `buildMonthlyReportAnalyticsSnapshot` | Analytics snapshot for reports page (category, user, savings candidates) |
| `src/lib/member-spending-stats.ts` | `aggregateMemberSpendingStats`, `applyMemberSpendingEntry` | Per-member totalPaidByUser, personalSpending, sharedSpending |
| `src/lib/workspace-balance.ts` | `computeCoupleWorkspaceBalance`, `computeWorkspaceBalance` | Balance/debt computation from paidByUserId + beneficiaryUserIds |
| `src/lib/crafted-dashboard-build.ts` | `buildCraftedCategories`, `buildCraftedDashboardProps` | Dashboard prop builder from stats data |
| `src/lib/crafted-stats-build.ts` | (types and helpers) | Stats prop shape |
| `src/lib/daily-spending-comparison.ts` | `buildDailySpendingComparison` | Heatmap-style daily spending comparison |
| `src/lib/ai-export.ts` | `buildAiExpenseExportRow`, `updateAiExpenseExportSummary`, `buildAiExpenseExportSummaryBlock` | CSV export row-building and summary |

### API Routes

| File | Route | What it does |
|---|---|---|
| `app/api/exports/ai-analysis/route.ts` | `GET /api/exports/ai-analysis` | Streams CSV of all entries; range filter on `date` field |

### Components (Display Only)

| File | Metric displayed |
|---|---|
| `src/components/dashboard/crafted-dashboard.tsx` | monthRealSpent, monthSaved, spentToday, savedToday, per-entry mode detection |
| `src/components/stats/crafted-stats.tsx` | totalSaved as "Evitato/risparmiato", savingRatePercent as "Efficienza", averageSavedPerEntry as "Impatto medio" |
| `src/components/reports/crafted-monthly-report-header.tsx` | totalSaved as "Evitato/risparmiato", savingRatePercent as "Efficienza" |
| `src/components/entries/crafted-entries-header.tsx` | totalSaved as "Evitato / risparmio" |
| `src/components/entries/crafted-entry-list.tsx` | Group totalSaved as "evitati / risparmio" or "impatto confronto" |
| `src/components/dashboard/daily-checkin-overlay.tsx` | Saved today as "Evitato / risparmio oggi" |
| `src/components/dashboard/monthly-report-preview.tsx` | totalSaved as "Evitato / risparmio" |

---

## 2. Current Formulas Found

### `spentReal` (stored as `realCost`)

No formula — read directly from DB column.

```
spentReal = entry.realCost
```

All actions (`stats`, `reports`, `dashboard`, `entries`, `export`) read `realCost` from Prisma results and call `toNumber(entry.realCost)`.

### `wouldHaveSpent` (stored as `alternativeCost`)

No formula — read directly from DB column.

```
wouldHaveSpent = entry.alternativeCost
```

For normal expenses with no comparison, `alternativeCost = realCost` (set at write time by `calculateEntryMoney`).

### `savedAmount` (DB stored field — the current unified metric)

Written to DB at entry creation/edit via `calculateEntryMoney` or `toEntryMoneyView`.

Formula depends on entry type:

```
// avoided entry:
savedAmount = comparisonAmount   (always positive)

// spent + comparison:
savedAmount = round2(comparisonAmount - amountSpent)   // can be negative

// spent + no comparison:
savedAmount = 0
```

**The current `savedAmount` conflates `avoidedAmount`, `comparisonSaved`, and `-comparisonOverspent` into a single signed value.** There is no separate storage for each.

In `src/lib/entry-calculations.ts:calculateSavedAmount`:
```ts
round2(alternative - real)   // returns 0 if either is negative or NaN
```

In `src/lib/entry-domain.ts:calculateEntrySavedAmount`:
```ts
round2(alternative - real)   // throws on invalid input; returns signed value
```

### `totalSaved` (aggregated saved)

Computed in every aggregation path by summing `entry.savedAmount` directly:

```ts
// stats.ts
overview.totalSaved = round2(overview.totalSaved + savedAmount);

// reports.ts
totalSaved = round2(monthEntries.reduce((t, e) => t + toNumber(e.savedAmount), 0));

// monthly-report-analytics.ts
totalSaved = round2(entries.reduce((t, e) => t + toNumber(e.savedAmount), 0));
```

**No current code separates positive from negative saved amounts. `totalSaved` can be negative and is shown in dashboards and reports without qualification.**

### `savingRatePercent`

```ts
round2((totalSaved / totalAlternativeCost) * 100)
```

Used in stats, reports, and monthly analytics. Displayed as "Efficienza" in the UI.

This ratio is unreliable because:
- `totalSaved` can include negative values (overspent comparisons).
- `totalAlternativeCost` includes the alternativeCost for ALL entries, including normal expenses where alternativeCost = realCost.
- The result does not tell users anything meaningful about spending discipline.

### `averageSavedPerEntry`

```ts
round2(totalSaved / entriesCount)
```

Used in stats overview. Can be negative.

### `totalRealSpent` (category totals)

```ts
// stats.ts
categoryCurrent.totalRealSpent = round2(categoryCurrent.totalRealSpent + realCost);

// reports.ts
current.totalRealSpent = round2(current.totalRealSpent + toNumber(entry.realCost));

// monthly-report-analytics.ts
categoryTotals.totalRealSpent = round2(categoryTotals.totalRealSpent + realCost);
```

Consistent across all paths.

### `totalRealSpent` (member/person totals)

```ts
// member-spending-stats.ts
payerTotals.totalPaidByUser = round2(payerTotals.totalPaidByUser + realCost);
// personal: goes to sole beneficiary
// shared: goes to payer's sharedSpending only
```

```ts
// monthly-report-analytics.ts / reports.ts
// Uses resolvePayerUserId and resolveBeneficiaryUserIds
totals.totalPaid = round2(totals.totalPaid + realCost);
```

**See Section 5 for ambiguities.**

### `totalRealSpent` (monthly totals)

```ts
// stats.ts/getMonthlyStats
current.totalRealSpent = round2(current.totalRealSpent + toNumber(entry.realCost));
```

Grouped by `getRomeMonthKey(entry.date)`. Uses `entry.date`, correct.

### Dashboard monthly summary (entries.ts:getDashboardSummary)

```ts
summary.totalRealSpent += Number(entry.realCost);
summary.totalAlternativeCost += Number(entry.alternativeCost);
summary.totalSaved += Number(entry.savedAmount);
```

**No `round2`. Accumulates floats and rounds only at the end with `.toFixed(2)`.**

### `biggestSaving`

In `reports.ts`:
```ts
if (toNumber(entry.savedAmount) > 0 && (!biggestSaving || toNumber(entry.savedAmount) > biggestSaving.savedAmount))
```

In `monthly-report-analytics.ts`:
```ts
biggestSavingCandidates.push(...) // only when savedAmount > 0
// then sorted by savedAmount desc
```

Both correctly filter `savedAmount > 0`.

### `streakData`

```ts
// streaks.ts
dayTotals.set(dateKey, round2((dayTotals.get(dateKey) ?? 0) + toNumber(entry.savedAmount)));
// streak is built from days that have any positive savedAmount
```

**Streak is currently based on `savedAmount > 0` presence per day, NOT on whether the user added any entry.**

### `workspaceBalance`

```ts
// workspace-balance.ts:computeCoupleWorkspaceBalance
// Only shared entries (beneficiaryUserIds.length > 1) contribute to balance
share = entry.realCost / beneficiaryUserIds.length;
owedTotals.set(beneficiaryUserId, ...);
paidTotals.set(payerUserId, ...);
currentNet = paidTotals[currentUser] - owedTotals[currentUser];
```

---

## 3. Duplicated or Conflicting Logic

### `round2` — duplicated in 11 places

```
src/lib/entry-calculations.ts:2
src/lib/entry-domain.ts:42
src/lib/monthly-report-analytics.ts:109
src/actions/stats.ts:153
src/actions/reports.ts:186
src/actions/dashboard.ts:56
src/actions/entries.ts (implicit via .toFixed(2) in getDashboardSummary)
src/lib/crafted-dashboard-build.ts:61
src/lib/workspace-balance.ts:22
src/lib/ai-export.ts:114
src/lib/daily-spending-comparison.ts:35
src/lib/member-spending-stats.ts:14
```

### `toNumber` — duplicated in 7 places

```
src/lib/monthly-report-analytics.ts:113
src/actions/stats.ts:157
src/actions/reports.ts:165
src/actions/dashboard.ts:33
src/actions/entries.ts:241
src/actions/streaks.ts:29
src/lib/daily-spending-comparison.ts:39
```

Each has slightly different behavior on edge cases (some return 0, some may return NaN for object values).

### `calculateSavedAmount` vs `calculateEntrySavedAmount`

| | `entry-calculations.ts:calculateSavedAmount` | `entry-domain.ts:calculateEntrySavedAmount` |
|---|---|---|
| On negative input | Returns 0 | Throws |
| On NaN | Returns 0 | Throws |
| Signed output | No (clamps to 0 for negatives) | Yes (can return negative) |
| Used by | `entry-calculations.ts:calculateSavedPercentage` | `entry-domain.ts:calculateEntryMoney`, `form-money.ts` |

**Conflict**: `entry-calculations.ts:calculateSavedAmount` hides negative impacts (overspending). `entry-domain.ts:calculateEntrySavedAmount` correctly preserves them.

### Category key inconsistency

- `reports.ts` uses `entry.category.slug` as category map key — can conflict for deleted categories (slug is nullable).
- `monthly-report-analytics.ts` uses `entry.category.id || entry.category.slug || entry.category.name` — more robust fallback.

### Float accumulation in `getDashboardSummary`

`getDashboardSummary` in `entries.ts` accumulates with `+=` and rounds at the end via `.toFixed(2)`. All other aggregation paths use `round2` at each step. Minor numerical difference possible for large datasets.

---

## 4. `createdAt` vs `date` Usage

### RISKY — `getDashboardSummary` in `src/actions/entries.ts:894`

```ts
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
}
```

`new Date(year, month, day, 0, 0, 0, 0)` uses the **local system timezone**, not Europe/Rome.

On a server running UTC, entries on January 31 between 23:00–23:59 Rome time (= February 1 00:00–00:59 UTC) will be excluded from the January monthly summary and included in February. This is wrong.

This function computes the dashboard "this month" summary shown on the home page (`monthSaved`, `monthRealSpent`).

**This month's dashboard card is timezone-incorrect.**

The correct equivalent already exists: `getRomeMonthRangeForMonthKey` in `rome-dates.ts`, used by `getMonthlyReport`.

### SAFE — `getTodayDashboardSummary` in `src/actions/dashboard.ts:62`

Uses `getRomeDayRangeForDate(new Date())` — correctly Rome-timezone-aware.

### SAFE — `getMonthlyReport` in `src/actions/reports.ts:275`

Uses `getRomeMonthRangeForMonthKey(monthKey)` — correct.

### SAFE — `getAvailableReportMonths` in `src/actions/reports.ts:481`

Uses raw SQL `to_char("date" AT TIME ZONE 'Europe/Rome', 'YYYY-MM')` — explicitly correct.

### SAFE — `getMonthlyStats`, `getStatsFromEntries` in `src/actions/stats.ts`

Uses `getRomeMonthKey(entry.date)` — correct.

### SAFE — Streaks in `src/actions/streaks.ts:92`

Uses `getRomeDateKey(entry.date)` — correct.

### SAFE — Export range in `app/api/exports/ai-analysis/route.ts:72`

Uses `getRomeMonthKey(new Date())` + `getRomeMonthRangeForMonthKey` — correct.

### `createdAt` as sort tiebreaker — ACCEPTABLE

Multiple queries use `orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }]` in `entries.ts` and the export route. This is metadata ordering, not financial period assignment. Acceptable.

### Summary of risky usages

| Location | Risk | Description |
|---|---|---|
| `entries.ts:getDashboardSummary` — `startOfMonth`/`startOfNextMonth` | **HIGH** | Uses local timezone for month boundary — wrong on UTC servers |
| `streaks.ts:loadStreakData` — `savedAmount > 0` for day marking | **LOW** | Streak is driven by savings, not all entries; users without positive savings don't build streaks |

---

## 5. `paidBy` / `beneficiaries` / `person` Audit

### System overview

The app maintains two parallel ownership tracking systems:

- **Legacy**: `entry.person` (enum: MARIAN, MARTINA, TUTTI) + `entry.paidBy` (enum)
- **New**: `entry.paidByUserId` (string) + `EntryBeneficiary` join table

Both are written at entry creation via `syncEntryPersonColumns` and `ownership.beneficiaryUserIds`.

### Where each system is used

| Feature | System used |
|---|---|
| Entry list filter (`buildPersonWhere`) | Legacy `person` column |
| Stats member filter (`buildWorkspaceMemberEntryWhere`) | New `paidByUserId` + `beneficiaries` with legacy fallback |
| Dashboard today filter (`buildPersonWhere`) | Legacy `person` column |
| Monthly report member split (`buildMemberSplit`) | New `resolveEntryPeopleFromRecord` |
| Monthly report analytics (`resolvePayerUserId`) | New `paidByUserId` with legacy `person` fallback |
| Workspace balance (`computeCoupleWorkspaceBalance`) | New `paidByUserId` + `beneficiaryUserIds` |
| Member spending stats (`aggregateMemberSpendingStats`) | New `paidByUserId` + `beneficiaryUserIds` |
| CSV export | Only legacy `person` field via `getEntryOwnershipLabel(entry.person)` |

### Ambiguities and risks

**Risk 1 — Empty beneficiaries fallback (MEDIUM)**

In `workspace-members.ts:resolveEntryPeopleFromRecord`:
```ts
beneficiaryUserIds:
  beneficiaryUserIds.length > 0
    ? beneficiaryUserIds
    : getDefaultBeneficiaryUserIds(members, paidByUserId)
```

If `EntryBeneficiary` rows are missing for an entry, the sole beneficiary defaults to the payer. A shared expense created before the `EntryBeneficiary` table existed (or one that failed to create beneficiary rows) becomes a personal expense in all member-view computations.

**Risk 2 — Legacy person-to-slot mapping in monthly-report-analytics.ts (MEDIUM)**

`resolvePayerUserId` in `monthly-report-analytics.ts:152` contains:
```ts
if (entry.person === "MARTINA") {
  return slots.secondaryUserId ?? ...;
}
if (entry.person === "TUTTI") {
  return slots.primaryUserId ?? ...;
}
if (entry.person === "MARIAN") {
  return slots.primaryUserId ?? ...;
}
```

This assumes a fixed slot-to-person mapping. If the primary/secondary slot assignment does not match the historical MARIAN/MARTINA assignment, monthly report per-person amounts will be wrong.

**Risk 3 — Balance excludes personal entries (BY DESIGN, but undocumented)**

`computeCoupleWorkspaceBalance` only processes entries with `beneficiaryUserIds.length > 1`. Personal entries (one beneficiary) are ignored for balance purposes. This is correct semantically but not documented in the UI.

**Risk 4 — `person` field is still the filter in entry list and today's dashboard (HIGH)**

`buildPersonWhere` in `person-filter.ts` filters by the legacy `entry.person` column, not by `paidByUserId` or `beneficiaries`. If an entry was created with `paidByUserId` set but `person` not synced correctly, the person filter will return wrong results.

`syncEntryPersonColumns` is supposed to keep them in sync, but if the sync was incomplete for older entries, the legacy filter remains incorrect.

**Risk 5 — `getWorkspaceMemberSpendingStats` ignores `person` (LOW)**

Uses only new fields. For entries with empty `beneficiaries`, the beneficiary defaults to the payer, inflating personal spend. This is consistent with Risk 1.

**Risk 6 — `sharePerBeneficiary` is never computed (MISSING)**

No current code computes `sharePerBeneficiary = realCost / beneficiaryCount`. The acceptance criteria require this for export and member views.

### Summary

| Field | Written | Read for filtering | Read for display | Ambiguity |
|---|---|---|---|---|
| `person` (legacy enum) | Yes (via sync) | Entry list, today's dashboard | Export person label | Still primary for list filter |
| `paidBy` (legacy enum) | Yes (via sync) | Not used for filtering | Not used | Redundant |
| `paidByUserId` | Yes | Stats member filter, balance, member stats | Monthly report | Fallback if null |
| `beneficiaries` rows | Yes | Stats member filter, balance, member stats | Monthly report | Default to payer if empty |

---

## 6. UI Wording Audit

### Ambiguous labels identified

| File | Label used | Ambiguity |
|---|---|---|
| `src/components/entries/crafted-entries-header.tsx:34` | `"Evitato / risparmio"` | Mixes avoided and comparison saving |
| `src/components/entries/crafted-entry-list.tsx:489` | `"evitati / risparmio"` or `"impatto confronto"` | Inconsistent between groups |
| `src/components/entries/crafted-entry-list.tsx:518` | `"evitati / risparmio"` (previous month) | Same ambiguity |
| `src/components/dashboard/crafted-dashboard.tsx:236` | `"{monthLabel} — evitato / risparmio"` | Month saved label |
| `src/components/dashboard/crafted-dashboard.tsx:330` | `"evitati / risparmio"` | Category saved label |
| `src/components/dashboard/daily-checkin-overlay.tsx:129` | `"Evitato / risparmio oggi"` | Today's impact label |
| `src/components/dashboard/monthly-report-preview.tsx:86` | `"Evitato / risparmio"` | Dashboard preview card |
| `src/components/stats/crafted-stats.tsx:212` | `"Evitato/risparmiato"` | Overview stat card |
| `src/components/stats/crafted-stats.tsx:235` | `"Impatto medio"` | Per-entry average |
| `src/components/stats/crafted-stats.tsx:240` | `"Efficienza"` | `savingRatePercent` — meaningless ratio |
| `src/components/reports/crafted-monthly-report-header.tsx:43` | `"Evitato/risparmiato"` | Overview stat |
| `src/components/reports/crafted-monthly-report-header.tsx:52` | `"Efficienza"` | Same meaningless ratio |
| `src/components/habits/crafted-habits.tsx:177` | `"impatto mese"` | Habit savings label |
| `src/components/more/crafted-more.tsx:74` | `"Risparmio"` | More page metric |
| `src/components/goals/crafted-goals.tsx:234` | `"Risparmio mese"` | Goal feed-through |

### Form labels (not critical but ambiguous)

| File | Label | Note |
|---|---|---|
| `src/components/entries/crafted-entry-form.tsx:121` | `"Avresti speso"` | Correct label for avoided mode but not for comparison mode |
| `src/components/entries/crafted-entry-edit-form.tsx:100` | `"Avresti speso"` | Same |
| `src/components/entries/quick-add-sheet.tsx:980` | `"Quanto avresti speso"` / `"Quanto hai speso"` | Only two modes shown, no explicit "comparison" mode |
| `src/components/presets/crafted-preset-form.tsx:271` | `"Avresti speso"` | Same |

The form currently only shows two modes: "spent" and "avoided". There is no explicit "Ho speso e voglio confrontarlo" mode visible to the user. The `savingContext: "comparison"` is inferred from whether a second amount is provided.

---

## 7. Export Audit

### Export route

`app/api/exports/ai-analysis/route.ts` — `GET /api/exports/ai-analysis`

### Current columns (30 columns)

```
id, createdAt, updatedAt, date, month, year, dayOfWeek, person, workspace,
title, description, category, subcategory, tags, type,
spentReally, wouldHaveSpent, savedAmount,
currency, habitId, habitName, isHabitGenerated,
location, paymentMethod, notes,
mode, savingContext, amountSpent, comparisonAmount, savingImpact
```

### Missing columns vs `01_METRICS_REFACTOR_PLAN.md`

| Required column | Present? | Notes |
|---|---|---|
| `title` | Yes | |
| `category` | Yes | Category name only |
| `spentReal` | Partial | Named `spentReally` (naming discrepancy) |
| `wouldHaveSpent` | Yes | |
| `avoidedAmount` | **No** | `savedAmount` conflates all; no separate column |
| `comparisonSaved` | **No** | |
| `comparisonOverspent` | **No** | |
| `grossPositiveImpact` | **No** | |
| `netImpact` | **No** | |
| `ordinaryImpact` | **No** | |
| `largeComparisonImpact` | **No** | |
| `isLargeComparison` | **No** | |
| `paidByUserId` | **No** | |
| `paidByName` | **No** | |
| `beneficiaryUserIds` | **No** | |
| `beneficiaryNames` | **No** | |
| `beneficiaryCount` | **No** | |
| `sharePerBeneficiary` | **No** | |
| `isShared` | **No** | |
| `date` | Yes | |
| `createdAt` | Yes | |
| `workspace` | Yes | |

### Data quality issues in current export

- `person` column uses legacy enum label via `getEntryOwnershipLabel(entry.person)` — returns "Marian"/"Martina"/"Condivisa". Sharing information is not derived from `paidByUserId`/`beneficiaries`.
- `savedAmount` can be negative (overspent comparisons). The column name misleads — it is a net impact, not a pure saving.
- Summary block includes `totalSaved` which has the same signed ambiguity.
- Current export does NOT include `mode` or `savingContext` in the DB select — these are derived at export time from the raw cost fields via `toEntryMoneyView`. This means the inferred mode/savingContext in the export may not match what the user intended if explicit `mode`/`savingContext` fields exist in the DB.

---

## 8. Test Coverage Audit

### Existing tests related to metrics

| File | What it tests |
|---|---|
| `src/lib/entry-domain.test.ts` | `calculateEntryMoney`, `parseEntryMoneyInput`, `toEntryMoneyView`, `inferEntryMode`, `inferEntrySavingContext`, `calculateEntrySavedAmount`, `isAvoidedEntry`, `isComparedEntry` |
| `src/lib/ai-export.test.ts` | `buildAiExpenseExportRow` — 3 cases (normal spent, avoided, negative comparison) |
| `src/features/entries/form-money.test.ts` | `resolveEntryMoneyFromForm` — legacy and tracker-first paths |
| `src/lib/daily-spending-comparison.test.ts` | Heatmap daily comparison builder |
| `src/lib/rome-dates.test.ts` | Rome timezone date functions |
| `src/lib/workspace-invites.test.ts` | Invite logic — not metric-related |
| `src/lib/auth/provisioning.test.ts` | Auth provisioning — not metric-related |
| `src/features/categories/category-scope.test.ts` | Category scoping — not metric-related |
| `src/features/workspaces/rbac-policy.test.ts` | RBAC — not metric-related |

### Missing tests — critical gaps

The following are entirely absent:

| Missing test | Why critical |
|---|---|
| Aggregate metrics (totalSaved, ordinaryImpact, largeComparisonImpact) | No test for the metric combinations the plan requires |
| `isLargeComparison` classification | No test for the 100 EUR threshold rule |
| `avoidedAmount` separate from `comparisonSaved` | These are the same `savedAmount` field today — the split must be tested when the module is built |
| `comparisonOverspent` | No test for negative impact classification |
| `grossPositiveImpact` | No test |
| `netImpact` | No test |
| `ordinaryImpact = netImpact - largeComparisonImpact` | No test |
| Golden dataset — all 12 cases | None of the 12 golden cases exist |
| Date vs createdAt — entry inserted later | No test proving an earlier-dated entry lands in the earlier month |
| Shared expense derivation | `sharePerBeneficiary`, `beneficiaryCount`, `isShared` — no tests |
| `getDashboardSummary` timezone boundary | No test catching the `startOfMonth` UTC bug |
| Category totals | No tests for category aggregation |
| Member/person totals | No tests for per-member spending accuracy |
| Balance calculation | No tests for couple balance correctness |
| Monthly range boundary | No tests for first/last day of month edge cases |

---

## 9. Recommended Implementation Order

Based on the actual codebase, the safest implementation order for Phase 2 onward is:

### Phase 2 — Unified metric module

**Location**: `src/lib/entry-metrics.ts` (alongside `entry-domain.ts`).

The module should accept the current stored fields (`realCost`, `alternativeCost`, `savedAmount`, `mode`, `savingContext`) and derive:
- `avoidedAmount` — positive only when `mode = "avoided"`
- `comparisonSaved` — positive when `mode = "spent"` and `savedAmount > 0`
- `comparisonOverspent` — positive when `mode = "spent"` and `savedAmount < 0`
- `grossPositiveImpact = avoidedAmount + comparisonSaved`
- `netImpact = avoidedAmount + comparisonSaved - comparisonOverspent`
- `isLargeComparison = isComparisonEntry && Math.abs(netImpact) >= 100`

For aggregates:
- `largeComparisonImpact = sum(entry.netImpact where entry.isLargeComparison)`
- `ordinaryImpact = netImpact - largeComparisonImpact`

Also consolidate `round2` and `toNumber` helpers into a single shared location (`src/lib/math.ts` or inlined into `entry-metrics.ts`).

**Do not migrate callers yet.** The module must compile standalone.

### Phase 3 — Unit tests

Write the 12 golden cases first, with entry-date vs createdAt test as the final case. This will also catch the `startOfMonth` UTC bug when a date-range function is added to `entry-metrics.ts`.

### Phase 4 — Replace duplicated calculations

Fix `getDashboardSummary`'s `startOfMonth`/`startOfNextMonth` to use `getRomeMonthRangeForMonthKey` **first**, before migrating callers to the unified module. This bug affects the home dashboard's monthly totals.

Then migrate callers in this order:
1. `src/actions/stats.ts` — largest aggregation; most risk
2. `src/actions/reports.ts` — monthly report
3. `src/actions/entries.ts:getDashboardSummary`
4. `src/lib/monthly-report-analytics.ts`
5. `src/lib/crafted-dashboard-build.ts`

### Phase 5 — Export improvement

After Phase 4, add the missing columns. Requires fetching `paidByUserId` and `beneficiaries` in the export select (currently absent). Rename `spentReally` → `spentReal` to match plan naming.

### Phase 6 — UX wording

Straightforward. One label update per file. No logic changes.

### Phase 7 — Form logic

Add explicit three-mode selector. Most risk of UI regression. Do last.

### Deferred decisions requiring product input before implementation

1. **Entry classification for legacy entries** — entries that predate the `mode`/`savingContext` columns will have `inferEntryMode` and `inferEntrySavingContext` applied. Verify this inference is always correct via the golden dataset.
2. **Large avoided purchases** — the plan defaults to: avoided purchases do NOT count as large comparisons. Confirm this is the final product decision.
3. **`person` filter vs member filter** — `buildPersonWhere` (legacy) is still the primary filter for the entry list and today's dashboard. A decision is needed: migrate to the member-based filter immediately in Phase 4, or keep legacy as-is until Phase 7.
4. **`sharePerBeneficiary`** — not currently computed anywhere. The plan requires it for export (Phase 5) and member views. Confirm whether this field should also appear in stats and reports.

---

## Phase Exit Report

### Files read (no changes made)

```
docs/product-ready/00_CONTEXT.md
docs/product-ready/01_METRICS_REFACTOR_PLAN.md
docs/product-ready/02_EXECUTION_CHECKLIST.md
docs/product-ready/03_ACCEPTANCE_CRITERIA.md
src/lib/entry-calculations.ts
src/lib/entry-domain.ts
src/lib/entry-domain.test.ts
src/features/entries/form-money.ts
src/features/entries/form-money.test.ts
src/lib/stats-overview.ts
src/lib/monthly-report-analytics.ts
src/lib/member-spending-stats.ts
src/lib/workspace-balance.ts
src/lib/crafted-dashboard-build.ts
src/lib/crafted-stats-build.ts
src/lib/daily-spending-comparison.ts
src/lib/rome-dates.ts
src/lib/ai-export.ts
src/lib/ai-export.test.ts
src/lib/entry-ownership.ts
src/lib/person-filter.ts
src/lib/ui-person.ts
src/lib/workspace-members.ts
src/lib/workspace-member-filter.ts
src/actions/stats.ts
src/actions/reports.ts
src/actions/entries.ts
src/actions/dashboard.ts
src/actions/streaks.ts
app/api/exports/ai-analysis/route.ts
app/page.tsx
src/components/dashboard/crafted-dashboard.tsx (partial)
src/components/stats/crafted-stats.tsx (grep)
src/components/reports/crafted-monthly-report-header.tsx (grep)
src/components/entries/crafted-entries-header.tsx (grep)
src/components/entries/crafted-entry-list.tsx (grep)
src/components/dashboard/daily-checkin-overlay.tsx (grep)
+ grep over all src/components/**/*.tsx for wording
```

### Files changed

None.

### Risk areas found

1. **`getDashboardSummary` — UTC-based month boundary** — home dashboard monthly totals are computed with local/UTC `startOfMonth` instead of Europe/Rome. Entries on the last day of a month after 23:00 Rome time land in the wrong month.
2. **`savedAmount` is a signed net impact** — the app stores and displays a single `savedAmount` that conflates avoided amounts, comparison savings, and overspending. No separation exists. This is the root cause of the "misleading saved number" identified in the product context.
3. **No `avoidedAmount`, `comparisonSaved`, or `comparisonOverspent` in the current model** — all three are implicit in the sign and mode of a single `savedAmount`.
4. **Empty beneficiaries fallback** — entries without `EntryBeneficiary` rows default to payer-as-sole-beneficiary, making shared expenses look personal in all member-specific views.
5. **Legacy `person` still drives entry list filter and today's dashboard** — inconsistent with the member-based filter used in stats and reports.
6. **Export is missing all 9 sharing columns** — `paidByUserId`, `paidByName`, `beneficiaryUserIds`, `beneficiaryNames`, `beneficiaryCount`, `sharePerBeneficiary`, `isShared`, plus the full metric breakdown.
7. **`savingRatePercent` ("Efficienza") is unreliable** — computed as `totalSaved / totalAlternativeCost`; can be negative or misleading because `totalAlternativeCost` includes normal expenses.
8. **Streak counts days with `savedAmount > 0`**, not days with any entry — a day with only normal expenses does not build a streak.

### Suspected duplicated calculations

- `round2` — 11 locations.
- `toNumber` — 7 locations.
- Monthly total aggregation pattern — 4 locations (stats.ts, reports.ts, monthly-report-analytics.ts, entries.ts).
- Category total aggregation — 3 locations (stats.ts, reports.ts, monthly-report-analytics.ts).
- `biggestSaving` candidate selection — 2 locations (reports.ts, monthly-report-analytics.ts).

### Suspected incorrect `createdAt` usage

- `entries.ts:getDashboardSummary:startOfMonth` — uses JS local time, not `createdAt` but also not Rome time. **Incorrect**.
- All other date ranging uses `entry.date` correctly.

### Suspected shared-expense ambiguity

- `resolveEntryPeopleFromRecord` fallback to payer when beneficiaries is empty.
- `resolvePayerUserId` in `monthly-report-analytics.ts` uses legacy person values mapped to slots.
- `person` filter vs member filter split — legacy filter active for entry list.
- Export uses legacy `person` enum label, not `paidByUserId`/beneficiaries.

### Validation commands run

None required — Phase 1 is read-only.
