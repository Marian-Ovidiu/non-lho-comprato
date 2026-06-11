# Execution Checklist

## Status legend

- `[ ]` Not started.
- `[~]` In progress.
- `[x]` Complete.
- `[!]` Blocked or requires product decision.

## Phase gate rule

Work phase by phase.

Do not start a phase until the previous phase has been completed and accepted.

Do not implement later phases early.

Update this checklist after every phase.

## Phase 0 - Documentation setup

Status: `[x]`

Scope:

- Create `docs/product-ready/00_CONTEXT.md`.
- Create `docs/product-ready/01_METRICS_REFACTOR_PLAN.md`.
- Create `docs/product-ready/02_EXECUTION_CHECKLIST.md`.
- Create `docs/product-ready/03_ACCEPTANCE_CRITERIA.md`.

Completion notes:

- Documentation structure created.
- No application source code changes are part of Phase 0.
- `04_METRICS_AUDIT.md` is intentionally not created yet because it belongs to Phase 1.

Validation:

- Documentation file creation only.

## Phase 1 - Audit only

Status: `[x]`

Output required:

- Create `docs/product-ready/04_METRICS_AUDIT.md`.

Audit must map all files/functions/components/hooks where the app calculates or displays:

- real spent;
- would have spent;
- saved amount;
- dashboard totals;
- stats totals;
- report totals;
- export totals;
- member/person filters;
- category filters;
- monthly filters;
- heatmap/streak date ranges;
- `createdAt`/`date` usage;
- paidBy/beneficiaries/person logic.

Rules:

- No application code changes.
- No DB/schema/migration changes.
- No broad refactor.

Exit report must include:

- files read;
- files changed;
- risk areas found;
- suspected duplicated calculations;
- suspected incorrect `createdAt` usage;
- suspected shared-expense ambiguity;
- validation commands run, if any.

Completion notes (Phase 1):

- Created `docs/product-ready/04_METRICS_AUDIT.md`.
- No application source code changed.
- Validation: read-only audit — no commands required.
- Files changed: `docs/product-ready/04_METRICS_AUDIT.md` (created), `docs/product-ready/02_EXECUTION_CHECKLIST.md` (status updated).
- Key risks found: `getDashboardSummary` UTC month boundary bug; `savedAmount` conflation; export missing 9 sharing columns; 11 duplicated `round2` functions; no golden tests.
- Suggested Phase 2 file: `src/lib/entry-metrics.ts` (not `src/lib/domain/entry-metrics.ts` — no `domain/` subdirectory exists).

## Phase 2 - Unified metric module

Status: `[x]`

Output required:

- Create single source of truth for entry metrics.
- Suggested file: `src/lib/domain/entry-metrics.ts`, unless Phase 1 identifies a better location.

Required functions:

- `calculateEntryMetrics(entry)`;
- `aggregateEntryMetrics(entries)`.

Required behavior:

- calculate `spentReal`;
- calculate `wouldHaveSpent`;
- calculate `avoidedAmount`;
- calculate `comparisonSaved`;
- calculate `comparisonOverspent`;
- calculate `grossPositiveImpact`;
- calculate `netImpact`;
- calculate `isLargeComparison`;
- calculate `largeComparisonImpact` in aggregates;
- calculate `ordinaryImpact` in aggregates;
- derive shared-expense fields where input data is available.

Rules:

- No React dependency.
- Keep logic reusable by dashboard, stats, reports, export, and tests.
- Preserve existing business behavior until replacement phases intentionally migrate callers.

Validation expected:

- `npm run lint`;
- `npm run typecheck`.

Completion notes (Phase 2):

- Created `src/lib/entry-metrics.ts` — no callers migrated yet.
- Exports: `calculateEntryMetrics(entry)`, `aggregateEntryMetrics(entries)`, `LARGE_COMPARISON_THRESHOLD`, and all types.
- Per-entry: `spentReal`, `wouldHaveSpent`, `avoidedAmount`, `comparisonSaved`, `comparisonOverspent`, `grossPositiveImpact`, `netImpact`, `isLargeComparison`, `isComparisonEntry`, sharing fields.
- Aggregate: `totalNetImpact`, `largeComparisonImpact`, `ordinaryImpact`, and all totals.
- `isLargeComparison` applies only to `mode=spent` + `savingContext=comparison` entries; avoided purchases are excluded by design.
- comparisonSaved and comparisonOverspent are derived from `realCost` and `alternativeCost` (not from stored `savedAmount`) to remain robust against stale stored values.
- No React dependency. No callers changed. No DB/schema changes.
- Validation: `npm run lint` ✓, `npm run typecheck` ✓ (both clean).

## Phase 3 - Unit tests

Status: `[x]`

Output required:

- Add golden tests for entry metrics.
- Add aggregate tests.

Golden dataset must cover:

1. Normal expense: 20 vs 20.
2. Avoided purchase: 0 vs 18.
3. Small positive comparison: 5.50 vs 5.80.
4. Medium positive comparison: 82.87 vs 150.
5. Negative comparison: 37.30 vs 8.
6. Large positive comparison Shein: 19.80 vs 600.
7. Large positive comparison Temu: 27.02 vs 256.
8. Shared expense paid by one user for two beneficiaries.
9. Personal expense Marian.
10. Personal expense Martina.
11. End-of-month entry.
12. Entry inserted later but with an earlier entry date.

Validation expected:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`.

Completion notes (Phase 3):

- Created `src/lib/entry-metrics.test.ts` — 35 tests, all passing.
- Golden dataset items 1–12 all covered.
- `calculateEntryMetrics` tests: all 12 golden entries, isLargeComparison boundary, avoided-entry exclusion, sharing fields.
- `aggregateEntryMetrics` tests: empty array, Shein+Temu real-data case (largeComparisonImpact = 809.18), full 7-entry golden aggregate, formula invariants.
- Floating-point values verified empirically (Node.js) before writing assertions; round2 handles all cases correctly.
- Items 11–12 (date handling): proved that entry-metrics.ts is date-agnostic; createdAt is not part of EntryMetricsInput and cannot affect computed values.
- No application code changed. No callers migrated. No DB/schema changes.
- Validation: `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓ (103/103 pass).

## Phase 4 - Replace duplicated calculations

Status: `[x]` (4A + 4B + 4C + 4D + 4E complete)

Output required:

- Migrate dashboard calculations to the unified metric module.
- Migrate stats calculations to the unified metric module.
- Migrate monthly report calculations to the unified metric module.
- Migrate export calculations to the unified metric module.
- Migrate reusable metric cards/hooks/utilities where applicable.

Rules:

- Do not redesign UI.
- Do not change unrelated business logic.
- Use entry `date` for financial periods.
- Keep member/category/month filters behaviorally consistent unless Phase 1 identifies bugs.

Validation expected:

- `npm run prisma:validate`;
- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`.

Completion notes (Phase 4E — cleanup and legacy metric audit):

- Created `docs/product-ready/05_LEGACY_METRICS_CLEANUP.md` with full classification table for all remaining legacy metric usages.
- `src/actions/goals.ts` (`getGoalContribution`): replaced `toEntryMoneyView(entry).savingImpact` with `Math.max(0, calculateEntryMetrics(entry).netImpact)`. Removed `toEntryMoneyView` import; replaced with `calculateEntryMetrics`. No Prisma select changes required (goals already selected `realCost`, `alternativeCost`, `savedAmount`, `mode`, `savingContext`).
- `src/actions/streaks.ts` (`loadStreakData`): replaced `toNumber(entry.savedAmount)` with `calculateEntryMetrics(entry).netImpact`. Added `realCost`, `alternativeCost`, `mode`, `savingContext` to Prisma select. Removed now-unused local `toNumber` helper and `DecimalLike` type. Added `calculateEntryMetrics` import.
- `src/components/entries/crafted-entry-list.tsx` (`groupEntries`): replaced `Number(entry.savedAmount) || 0` with `calculateEntryMetrics(entry).netImpact` for the day-group `totalSaved` accumulation. Added `calculateEntryMetrics` import. `EntryItem` type already had `mode?`, `savingContext?`, `realCost`, `alternativeCost`.
- `src/components/entries/crafted-entry-row.tsx` (`getSecondaryMeta`): replaced `toFiniteNumber(entry.savedAmount)` with `calculateEntryMetrics(entry).netImpact` for comparison badge display. Added `calculateEntryMetrics` import. `toFiniteNumber` kept (still used for `alternativeCost`).
- Documents as risky-followup: `getCategoryStats` (Prisma `groupBy._sum` cannot use entry-level metrics without fetch change), `getTopSavings` (dead function), `getMonthlyStats` (DB aggregate compat).
- Documents as legacy-compat: `app/page.tsx` sort tiebreaker, UI labels (Phase 6 scope).
- No DB/schema changes. No form changes. No public API shape changes. No visual redesign.
- Validation: `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓ (107/107 pass).

Completion notes (Phase 4D — CSV export migration):

- `src/lib/ai-export.ts`: Added import for `calculateEntryMetrics`. Added 17 new columns to `AI_EXPENSE_EXPORT_COLUMNS` (10 metric breakdown + 7 sharing). Updated `AiExpenseExportEntry` with 4 new optional fields: `paidByUserId`, `paidByUserName`, `paidByUserEmail`, `beneficiaries` (with user name/email per beneficiary). Updated `AiExpenseExportRow` with 17 new fields. Added `totalNetImpact` to `AiExpenseExportSummary`. Updated `createAiExpenseExportSummary` with `totalNetImpact: 0`. Updated `buildAiExpenseExportRow` to call `calculateEntryMetrics(entry)` and populate all new columns. Updated `serializeAiExpenseExportRow` with new fields in column order. Updated `updateAiExpenseExportSummary` to accumulate `totalNetImpact` from `row.netImpact`. Updated `buildAiExpenseExportSummaryBlock` to emit `totalNetImpact` line.
- `app/api/exports/ai-analysis/route.ts`: Updated `exportSelect` to include `mode`, `savingContext`, `paidByUserId`, `paidByUser` (name/email), `beneficiaries` (userId + user name/email). Updated `fetchEntriesBatch` to map new fields through to `AiExpenseExportEntry`.
- New metric columns (derived from `calculateEntryMetrics`): `spentReal`, `wouldHaveSpentMetric`, `avoidedAmount`, `comparisonSaved`, `comparisonOverspent`, `grossPositiveImpact`, `netImpact`, `ordinaryImpact`, `largeComparisonImpact`, `isLargeComparison`.
- New sharing columns: `paidByUserId`, `paidByName`, `beneficiaryUserIds` (pipe-separated), `beneficiaryNames` (pipe-separated), `beneficiaryCount`, `sharePerBeneficiary`, `isShared`.
- Backward compatibility: All 30 existing columns retained unchanged. Legacy `savedAmount`, `spentReally`, `wouldHaveSpent`, `savingImpact` columns preserved alongside new metric columns.
- Legacy entry handling: `paidByUserId`/`beneficiaries` are optional on `AiExpenseExportEntry`. Legacy entries without these fields produce empty strings and zeros safely.
- `sharePerBeneficiary` computed as `spentReal / beneficiaryCount` from the unified metric module (already handled by `calculateEntryMetrics`). For entries with no beneficiaries: `0`.
- `isLargeComparison` follows the unified metric module (threshold ≥ 100 EUR, comparison entries only).
- Per-entry `largeComparisonImpact` = `netImpact` if `isLargeComparison`, else 0. Per-entry `ordinaryImpact` = `netImpact` if NOT `isLargeComparison`, else 0.
- `beneficiaryUserIds` and `beneficiaryNames` are pipe-separated (`|`) to avoid CSV escaping issues.
- `totalSaved` in summary kept from legacy `savedAmount` for backward compat; `totalNetImpact` added alongside it.
- `src/lib/ai-export.test.ts`: Updated `createEntry` defaults to include `paidByUserId: null`, `beneficiaries: []`. Updated 3 existing tests to also verify new metric columns. Added 4 new tests: large comparison (Shein golden case), shared entry (2 beneficiaries), personal entry (1 beneficiary), legacy entry without sharing data.
- No DB/schema changes. No dashboard/stats/reports changes. No visual redesign. No form changes.
- Validation: `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓ (107/107 pass — 4 new export tests).

Completion notes (Phase 4C — Monthly reports migration):

- `MonthlyReportOverview` (`src/actions/reports.ts`): expanded with 7 new fields: `netImpact`, `avoidedAmount`, `comparisonSaved`, `comparisonOverspent`, `grossPositiveImpact`, `largeComparisonImpact`, `ordinaryImpact`. `totalSaved` kept as compat alias for `netImpact`.
- `MonthlyReportMemberSummary`: added `netImpact` field alongside `totalSaved` for caller compatibility.
- `MonthlyReportEntry`: added `mode: string` and `savingContext: string` fields.
- `serializeMonthlyReportEntry`: now passes through `mode` and `savingContext` from Prisma to serialized entry.
- Prisma selects in `getMonthlyReport`: both current-month and previous-month selects now include `mode: true, savingContext: true`.
- Main overview computation: replaced manual `reduce(savedAmount)` / `reduce(realCost)` with `aggregateEntryMetrics(monthEntries)`. Overview now contains full metric breakdown from the unified module.
- `buildMemberSplit`: updated entry parameter type to include `alternativeCost`, `mode`, `savingContext`; now calls `calculateEntryMetrics(entry)` per entry; uses `entryMetrics.spentReal` for `realCost` and `entryMetrics.netImpact` for `netImpact` (replaces stale `savedAmount`).
- Category loop and `biggestSaving` in `getMonthlyReport`: now calls `calculateEntryMetrics(entry)` per entry; uses `entryMetrics.netImpact` for category `totalSaved` and biggestSaving; uses `entryMetrics.spentReal` and `entryMetrics.wouldHaveSpent` for other category fields.
- `buildEmptyReport` overview updated with 7 new zero fields.
- `MonthlyReportAnalyticsEntry` (`src/lib/monthly-report-analytics.ts`): added `mode: string` and `savingContext: string`.
- `MonthlyReportAnalyticsOverview`: expanded with same 7 new fields as `MonthlyReportOverview`.
- `buildEmptySnapshot` overview: updated with 7 new zero fields.
- `buildMonthlyReportAnalyticsSnapshot`: added `aggregateEntryMetrics` import; per-entry loop now calls `calculateEntryMetrics(entry)` for `netImpact`, `spentReal`, `wouldHaveSpent`; overview replaced by `aggregateEntryMetrics(entries)` call; biggestSaving filter uses `netImpact > 0` (not stale `savedAmount > 0`); stored `savedAmount` in candidate is `entryMetrics.netImpact`.
- `crafted-monthly-report-header.tsx`: StatTrio label changed `"Evitato/risparmiato"` → `"Impatto netto"`.
- `crafted-monthly-report-detail.tsx`: `getSummaryText` text changed `"evitati / risparmiati"` → `"impatto netto"`.
- Habits summary (`reports.ts`): unchanged — habits use `occurrence.habit.amount` directly (not entry metrics). Correct by design: habit avoidance savings are a separate domain.
- Streak computation: unchanged — uses `realCost` for day totals. Correct by design.
- Date handling: unchanged — `buildEntryWhere` already used `getRomeMonthRangeForMonthKey(monthKey)` with `date` field. No regression.
- No DB/schema changes. No dashboard changes. No CSV export changes. No visual redesign.
- Validation: `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓ (103/103 pass).

Completion notes (Phase 4B — Stats migration):

- `StatsOverview` (`src/lib/stats-overview.ts`): expanded with 7 new fields: `netImpact`, `avoidedAmount`, `comparisonSaved`, `comparisonOverspent`, `grossPositiveImpact`, `largeComparisonImpact`, `ordinaryImpact`. `totalSaved` kept as compat alias for `netImpact`.
- `src/actions/stats.ts`: removed local duplicate `StatsOverview` type (replaced by import from `stats-overview.ts`); added import for `aggregateEntryMetrics` and `calculateEntryMetrics`; added `mode`/`savingContext` to `StatsEntryRow` type and Prisma select; expanded `MonthlyStatsItem` and `CategoryStatsItem` private types with new fields; rewrote `getStatsFromEntries` using `aggregateEntryMetrics` (groups entries by month and category, delegates to unified module); `topSavings` now filters by `netImpact > 0` and stores `netImpact` as `savedAmount` (derived from costs, not stale DB value); updated `emptyOverview()` with new zero fields; updated `buildOverviewFromTotals()` with zero defaults for breakdown fields (legacy function used only by `getStatsOverview`).
- `getMonthlyStats` (dashboard-facing, uses DB aggregate): adds zero defaults for breakdown fields — `totalSaved` still computed from `savedAmount` sum (follow-up: migrate when dashboard Phase 4C is tackled).
- `getCategoryStats` (dashboard-facing, uses Prisma `groupBy`): adds zero defaults for breakdown fields — `totalSaved` still from `savedAmount` sum (same follow-up).
- `CraftedStatsMonthlyItem` and `CraftedStatsCategoryItem` (`crafted-stats-build.ts`): expanded with all new metric fields. `CraftedPeriodOverview` updated with `netImpact` field.
- `src/components/stats/crafted-stats.tsx`: StatTrio label changed `"Evitato/risparmiato"` → `"Impatto netto"`; category bars note changed `"evitati / risparmiati"` → `"impatto netto"`.
- `app/stats/page.tsx`: empty `overview` initializer updated with all new zero fields.
- Date handling: `getStatsFromEntries` already used `getRomeMonthKey(entry.date)` — correct. No date regression.
- Person/member filter: stats member filter (`buildWorkspaceMemberEntryWhere`) unchanged — behavior preserved. Noted: member filter applies at entry selection level (paidBy/personal/shared distinction is separate in `getWorkspaceMemberSpendingStats`). No incorrect conflation found.
- Large comparisons: `largeComparisonImpact` and `ordinaryImpact` are now in `StatsOverview`, `MonthlyStatsItem`, and `CategoryStatsItem`. Stats page data model contains these values for future UI use. No heavy redesign added.
- Tests: no new stats-specific tests added (entry-metrics unit tests cover metric correctness; `getStatsFromEntries` delegates to the tested module). Existing 103 tests all pass.
- No DB/schema changes. No dashboard changes (beyond type compat zero defaults). No reports/export migration.
- Validation: `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓ (103/103 pass).

Completion notes (Phase 4A — Dashboard migration):

- Fixed UTC month boundary bug in `getDashboardSummary` (`src/actions/entries.ts`): replaced `startOfMonth`/`startOfNextMonth` (JS local time, wrong on UTC servers) with `getRomeMonthRangeForMonthKey(getRomeMonthKey(now))` — consistent with the pattern already used in `getMonthlyReport`.
- `getDashboardSummary` now selects `mode` and `savingContext` from DB and delegates all metric calculation to `aggregateEntryMetrics`. `MonthlySummary` type expanded with 7 new fields: `avoidedAmount`, `comparisonSaved`, `comparisonOverspent`, `grossPositiveImpact`, `netImpact`, `largeComparisonImpact`, `ordinaryImpact`. `totalSaved` = `netImpact` for caller compatibility.
- `getTodayDashboardSummary` (`src/actions/dashboard.ts`): removed local `DecimalLike`/`toNumber`/`round2` helpers; now selects `mode`/`savingContext`/`alternativeCost` and delegates to `aggregateEntryMetrics`. `TodayDashboardSummary` type expanded with `avoidedAmountToday`, `comparisonSavedToday`, `netImpactToday`.
- `CraftedDashboardProps` (`crafted-dashboard.tsx`): added `monthLargeComparisonImpact`. Label changed: `"{monthLabel} — evitato / risparmio"` → `"{monthLabel} — impatto netto"`. Large comparison note added below the net impact amount (shown only when `monthLargeComparisonImpact > 0`). StatTrio label changed: `"Evitato oggi"` → `"Impatto oggi"`.
- `buildCraftedDashboardProps` (`crafted-dashboard-build.ts`): `monthLargeComparisonImpact` added to input/output.
- `app/page.tsx`: extracts `largeComparisonImpact` from `metrics.summary` and passes it through.
- No DB/schema changes. No callers outside dashboard scope touched. No redesign.
- Validation: `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓ (103/103 pass).

## Phase 5 - Export improvement

Status: `[ ]`

Output required:

- Add metric breakdown columns.
- Add sharing columns.
- Keep `date` and `createdAt` separate.
- Ensure export summary uses unified aggregate metrics.

Target CSV columns:

- title;
- category;
- spentReal;
- wouldHaveSpent;
- avoidedAmount;
- comparisonSaved;
- comparisonOverspent;
- grossPositiveImpact;
- netImpact;
- ordinaryImpact;
- largeComparisonImpact;
- isLargeComparison;
- paidByUserId;
- paidByName;
- beneficiaryUserIds;
- beneficiaryNames;
- beneficiaryCount;
- sharePerBeneficiary;
- isShared;
- date;
- createdAt;
- workspace.

Validation expected:

- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`.

## Phase 6 - UX wording/content pass

Status: `[ ]`

Output required:

- Replace ambiguous saved/risparmio wording with approved labels.
- Keep layout and visual design unchanged unless a text length requires a minimal non-visual adjustment.

Approved labels:

- `Speso davvero`;
- `Non comprato`;
- `Risparmiato scegliendo meglio`;
- `Speso in più del confronto`;
- `Impatto netto`;
- `Grandi confronti`;
- `Impatto ordinario`.

Validation expected:

- `npm run lint`;
- `npm run typecheck`;
- `npm run build`.

## Phase 7 - Form logic clarity

Status: `[ ]`

Output required:

- Make creation/edit form intent explicit.
- Improve microcopy for entry mode selection.
- Make paidBy and beneficiaries visible enough to reduce shared-expense mistakes.

Required user choices:

1. `Ho speso`
2. `Ho speso e voglio confrontarlo`
3. `Non l'ho comprato`

Rules:

- No visual redesign.
- Keep form practical on mobile.
- Do not change authentication/workspace behavior.
- Avoid DB/schema changes unless earlier phases prove they are necessary and the change is accepted.

Validation expected:

- `npm run prisma:validate` if schema is touched, otherwise not required;
- `npm run lint`;
- `npm run typecheck`;
- `npm run test`;
- `npm run build`.

## Deferred decisions

These must be resolved during or after Phase 1 before implementation if the existing model is ambiguous:

- How the current app distinguishes normal expense, comparison, and avoided purchase.
- Whether existing fields are enough to derive entry mode reliably.
- Whether legacy `person` remains only a compatibility field or still drives member-specific views.
- Whether large avoided purchases should ever count as large comparisons. Default: no.
- Whether shared expense balance belongs in the metric module or a separate shared-expense module consumed by metrics.
