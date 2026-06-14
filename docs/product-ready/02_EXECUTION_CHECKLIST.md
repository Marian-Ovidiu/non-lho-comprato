# Execution Checklist

## Current recommended next step

**Phase 20 — Design / visual polish pass is complete.**

All metric, wording, form, shared-balance, category, accessibility, and first-pass visual polish work is complete (Phases 1–20). Use `NEXT_STEPS.md` for later roadmap items and keep the Phase 20 hard rules in force for any follow-up visual work.

---

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

Status: `[x]` (absorbed/completed by Phase 4D + pre-Phase-6 CSV fix)

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

Completion notes (Phase 5 — absorbed by Phase 4D + pre-Phase-6 CSV fix):

- Phase 4D completed the CSV export migration before Phase 5 was started as a separate implementation phase.
- Metric breakdown columns were added in Phase 4D: `spentReal`, `wouldHaveSpentMetric`, `avoidedAmount`, `comparisonSaved`, `comparisonOverspent`, `grossPositiveImpact`, `netImpact`, `ordinaryImpact`, `largeComparisonImpact`, `isLargeComparison`.
- Sharing columns were added in Phase 4D: `paidByUserId`, `paidByName`, `beneficiaryUserIds`, `beneficiaryNames`, `beneficiaryCount`, `sharePerBeneficiary`, `isShared`.
- Backward compatibility columns were preserved in Phase 4D: existing legacy export columns remained present alongside the new metric/sharing columns.
- Unified metric module usage was added in Phase 4D: export row metric fields are derived through `calculateEntryMetrics`.
- Pre-Phase-6 CSV fix removed empty/anomalous exported rows by filtering entries without a real `id` or valid `date` at export serialization time.
- Pre-Phase-6 CSV fix also stopped appending the `# SUMMARY` block to the movement CSV because parsers treated it as empty movement rows.
- Legacy valid entries without sharing data are still exported with safe empty sharing fields.
- The original Phase 5 item “Ensure export summary uses unified aggregate metrics” is superseded by the CSV empty-row fix: the export no longer emits an inline summary block in the same movement CSV.
- No additional Phase 5 implementation remains pending.
- No application source code was changed by this checklist update.
- Validation recorded for the implementation that completed this phase: `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓.

## Phase 6 - UX wording/content pass

Status: `[x]`

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
- `npm run test`;
- `npm run build`.

Completion notes (Phase 6 — UX wording/content pass):

- Dashboard, stats, monthly reports, entry rows/lists, goals, habits, more, onboarding, app metadata, manifest, and public landing copy were audited for ambiguous saved/risparmio wording.
- Product labels were normalized around `Speso davvero`, `Non comprato`, `Risparmiato scegliendo meglio`, `Speso in più del confronto`, `Impatto netto`, `Grandi confronti`, and `Impatto ordinario`.
- Helper text was clarified where metric semantics were ambiguous, especially positive impact, net impact, and large comparison notes.
- No metric formulas, CSV export columns, DB schema, auth/workspace behavior, create/edit form logic, or visual redesign were changed.
- Added `docs/product-ready/06_UX_WORDING_NOTES.md` with changed labels and Phase 7 follow-ups.
- Validation: `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓ (109/109 pass), `npm run build` ✓.

## Phase 7 - Form logic clarity

Status: `[x]`

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

Completion notes (Phase 7 — Form logic clarity):

- Create/edit entry forms now expose three explicit movement intents: `Ho speso`, `Speso + confronto` (`aria-label="Ho speso e voglio confrontarlo"`), and `Non l'ho comprato`.
- The third intent keeps existing persistence semantics: `mode=spent`, `savingContext=comparison`.
- Quick-add now exposes the same three intents and preserves prefill behavior for full-form navigation.
- Preset creation/editing now exposes the same intent model; saved preset summaries use Phase 6 metric wording.
- Comparison microcopy added: `Quanto avresti speso di solito?` and `Usalo quando hai scelto un'opzione più economica.`
- Avoided microcopy added: `Segna quanto avresti speso se l'avessi comprato.`
- Large comparison warning added in create/edit entry forms, quick-add, and preset form: `Questo confronto pesa molto sulle statistiche.`
- `Chi paga` / `Vale per` copy clarified in shared-expense fields. The details toggle now names `chi paga` and `vale per` directly instead of generic `ripartizione`.
- Added `docs/product-ready/07_FORM_CLARITY_NOTES.md`.
- Added form-domain tests for the three user intents in `src/features/entries/form-money.test.ts`.
- No metric formulas, DB/schema, dashboard/stats/reports/export, auth/workspace behavior, monetization, ads, or AI features changed.
- `npm run prisma:validate` not run because schema was not touched.
- Validation: `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓ (112/112 pass), `npm run build` ✓.

## Phase 8 — Lightweight feedback collection (beta debugging)

Status: `[x]`

Output required:

- Add `Feedback` Prisma model.
- Add `submitFeedback` server action.
- Add floating feedback button + dialog component.
- Mount in authenticated app shell.
- Add validation tests.
- Add `docs/product-ready/08_FEEDBACK_BETA_DEBUGGING_NOTES.md`.

Rules:

- No metric formulas changed.
- No dashboard/stats/reports/export logic changed.
- No auth behavior changed.
- No external services added.
- No sensitive financial details collected.

Completion notes (Phase 8 — Lightweight feedback collection):

- Added `Feedback` model to `prisma/schema.prisma` with named relations `"FeedbackUser"` and `"FeedbackWorkspace"` (required because both User and Workspace have multiple pre-existing named relations). Back-references added to `User.feedbacks` and `Workspace.feedbacks`.
- Migration: `prisma/migrations/20260612100000_add_feedback/migration.sql`.
- Validation module: `src/features/feedback/validation.ts` — pure, no React dependency, testable.
- Tests: `src/features/feedback/validation.test.ts` — 10 tests covering all boundary conditions.
- Server action: `src/actions/feedback.ts` — `submitFeedback(prev, formData)`. Auth/workspace context read silently; feedback accepted even if anonymous.
- UI: `src/components/feedback/feedback-button.tsx` — floating `PenLine` button, Dialog with pill type selector, textarea, success/error states, 1.4 s auto-close on success.
- Mounted in `src/components/layout/app-shell.tsx` — only rendered for authenticated users.
- Context collected: pathname, userAgent, viewport, timezone, locale, displayMode (client-side hidden fields) + userId, workspaceId (server-side, optional).
- Intentionally excluded: entry data, financial details, localStorage, screenshots.
- Validation: `npx prisma validate` ✓, `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓, `npm run build` ✓.

## Phase 9 — Private debug / app health page

Status: `[x]`

Output required:

- Add `/debug` server page, gated to `h.marian914@gmail.com`.
- Show session, workspace, environment, browser/PWA, recent feedback.
- Add `docs/product-ready/09_PRIVATE_DEBUG_PAGE_NOTES.md`.

Rules:

- No metric formulas changed.
- No dashboard/stats/reports/export changed.
- No create/edit form logic changed.
- No auth behavior changed beyond gating this route.
- No workspace behavior changed.
- No secrets exposed.
- No raw financial data exposed.

Completion notes (Phase 9 — Private debug page):

- Access control: `getAuthenticatedUser()` + exact email match `"h.marian914@gmail.com"` → `notFound()` for all others. No role tables, no schema changes.
- Server data module: `src/lib/debug-page-data.ts` — session, workspace (id/name/kind/role/memberCount), environment (NODE_ENV/VERCEL_ENV/version/commitSha/booleans for DB/Sentry/PostHog), recent 20 feedback rows.
- Client component: `src/components/debug/debug-browser-info.tsx` — `DebugBrowserInfo` reads browser state in `useEffect` (pathname, viewport, displayMode, locale, timezone, online, SW controller/count, local time). `DebugTable` component shared between server and client sections.
- Page: `app/debug/page.tsx` — six sections: Sessione, Workspace, Ambiente, Browser/PWA, Feedback recenti, Note sicurezza.
- Navigation: developer-only `"Debug app"` link added at bottom of `app/more/page.tsx` when authenticated email matches `DEVELOPER_EMAIL`.
- No new DB schema changes. No new migration.
- Validation: `npx prisma validate` ✓, `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓, `npm run build` ✓.

## Phase 10 — Legacy data normalization audit

Status: `[x]`

Output required:

- Audit all entries for missing `paidByUserId`, missing beneficiaries, legacy-only entries.
- Create `docs/product-ready/10_LEGACY_DATA_NORMALIZATION_AUDIT.md`.
- Add `scripts/audit-legacy-data.ts` (read-only).
- No code or data changes.

Completion notes (Phase 10):

- Audit script ran against local production-mirror DB (148 entries).
- Found: 2 entries missing `paidByUserId`, 1 entry with zero beneficiaries, 1 fully legacy entry.
- Found: 0 `person`/`beneficiaries` mismatches, 0 misclassified `mode`/`savingContext`.
- Identified entry `cmp4b2ayr000904laxr9pouwr` (TUTTI, paidBy=MARIAN, 2 beneficiaries, paidByUserId=null) as direct cause of balance asymmetry.
- Full root cause analysis documented in `10_LEGACY_DATA_NORMALIZATION_AUDIT.md`.
- No application code, data, or schema changed.
- Validation: `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓.

## Phase 11 — Targeted legacy sharing repair

Status: `[x]`

Output required:

- Create `scripts/repair-legacy-sharing.ts` with dry-run default and `--apply` mode.
- Add `repair:legacy-sharing` npm script.
- Add cross-field guard to `src/lib/entry-ownership.ts`.
- Add balance invariant tests in `src/lib/workspace-balance.test.ts`.
- Create `docs/product-ready/11_LEGACY_SHARING_REPAIR_NOTES.md`.

Completion notes (Phase 11):

- Repair script created: dry-run confirms 2 repairs planned, 0 skipped. Maps legacy `paidBy`/`person` enums to modern user IDs via workspace member sort order. Transactional writes.
- Cross-field guard added: `validateEntryOwnership` now explicitly rejects shared entries (beneficiaries > 1) without a payer, with Italian error message.
- 18 balance invariant tests added in `src/lib/workspace-balance.test.ts`: single payer, combined payers, orphan entry (documents asymmetry bug), post-repair antisymmetry, edge cases.
- No application data modified by Phase 11 itself. Repair must be applied separately via `npm run repair:legacy-sharing -- --apply`.
- Validation: `npx prisma validate` ✓, `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓ (142 pass, 18 added), `npm run build` ✓.

## Phase 12 — Shared balance closure

Status: `[x]`

Output required:

- Apply repair (data fix).
- Confirm post-repair audit shows all ownership gaps resolved.
- Confirm dashboard balance is symmetric for both users.
- Create `docs/product-ready/12_SHARED_BALANCE_CLOSURE_NOTES.md`.
- Update this checklist.

Completion notes (Phase 12):

- `npm run repair:legacy-sharing -- --apply` applied. 2 entries repaired: 2 `paidByUserId` backfilled, 1 `EntryBeneficiary` row created.
- Post-repair audit: `missingPaidByUserId=0`, `zeroBeneficiaries=0`, `fullyModern=148`, `fullyLegacy=0`.
- Manual verification confirmed: Marian/Martina dashboard balance is now symmetric (same amount, opposite directions).
- No remaining blocking follow-ups. Legacy `person`/`paidBy` columns remain in sync and are non-blocking.
- No application code, schema, or tests changed by Phase 12 itself.

## Phase 13 — Information architecture and data distribution audit

Status: `[x]`

Output required:

- Audit how financial/product data is distributed across pages.
- Propose a simpler, psychologically clear information architecture.
- Create `docs/product-ready/13_INFORMATION_ARCHITECTURE_RECOMMENDATIONS.md`.
- No code, schema, UI, or test changes.

Completion notes (Phase 13):

- Read `crafted-dashboard.tsx`, `crafted-stats.tsx`, `crafted-monthly-report-detail.tsx`,
  `crafted-top-savings-list.tsx`, and all prior phase docs to map current page-by-page data layout.
- Identified 5 structural failure modes: dashboard overload, stats as a dumping ground,
  couple balance buried too low, `Indice netto` shown at primary weight, report duplicating
  dashboard overview numbers.
- Recommended concrete moves: promote couple balance to position 3 on dashboard; remove
  `Impatto oggi` from dashboard today strip; remove per-category `impatto netto` micro-labels
  from dashboard; move `Avresti speso`/`Impatto medio`/`Indice netto` to collapsible in Stats;
  remove StatTrio from More page; demote report numeric header in favour of the narrative summary.
- Produced a priority implementation plan (7 items, all UI-only — no schema or API changes needed).
- No application code, schema, tests, or UI modified by this phase.
- Validation: no commands required (no code touched).

## Phase 14 — UI data distribution cleanup

Status: `[x]`

Output required:

- Apply 7 UI-only data distribution fixes from Phase 13 recommendations.
- Update checklist.
- Create `docs/product-ready/14_DATA_DISTRIBUTION_CLEANUP_NOTES.md`.

Completion notes (Phase 14):

- Fix 1: Couple balance promoted to position 3 on dashboard (after quick actions, before categories). Visibility logic unchanged.
- Fix 2: "Impatto oggi" removed from dashboard today StatTrio. `savedToday` prop removed from `CraftedDashboardProps`, `buildCraftedDashboardProps` input, and the `buildCraftedDashboardProps` call in `app/page.tsx`. `DailyCheckinOverlay` is unaffected (receives `savedToday` directly from `app/page.tsx`).
- Fix 3: Per-category `impatto netto` micro-labels removed from dashboard category list. Category impact remains in Stats `CraftedCategoryBars`.
- Fix 4: StatTrio (Impatto netto / Movimenti / Streak) removed from More page. Removed `monthSaved`, `entriesCount`, `streak` props from `CraftedMoreProps`. Removed `getDashboardSummary` and `getGlobalStreak` calls from `app/more/page.tsx` (page is now lighter, two fewer server actions).
- Fix 5: Second StatTrio in Stats (Avresti speso / Impatto medio / Indice netto) wrapped in native `<details>/<summary>` collapsed by default under label "Dettagli del periodo".
- Fix 6: StatTrio in monthly report header (Impatto netto / Movimenti / Indice netto) wrapped in native `<details>/<summary>` collapsed by default under label "Riepilogo del mese".
- Fix 7: Impact-source note added at top of `CraftedGoals`: "Le mete avanzano con l'impatto positivo: cose non comprate e confronti dove hai speso meno del riferimento."
- No metric formulas, Prisma schema, server actions, tests, auth/workspace behavior, feedback/debug, or form logic changed.
- Validation: `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓ (142 pass), `npm run build` ✓.

## Phase 15A — Habit notifications delivery audit

Status: `[x]`

Output required:

- Audit current notification implementation end-to-end.
- Answer 8 specific questions about the delivery infrastructure.
- Create `docs/product-ready/15A_HABIT_NOTIFICATIONS_AUDIT.md`.
- No application code, schema, or test changes.

Completion notes (Phase 15A):

- Service worker (`public/sw.js`): install + activate + no-op fetch. No `push` event listener. No `notificationclick`. Exists for PWA installability only.
- Both notification paths (`daily-reminder.ts` and `habit-reminder-banner.tsx`) use `new Notification()` from page context — requires the page to be open. No Web Push.
- `HabitReminderBanner` mounted only on `/habits` — habit reminders cannot fire on other routes.
- `daily-reminder.ts` uses `Europe/Rome` timezone correctly. `habit-reminder-banner.tsx` uses device local time — inconsistency documented.
- No `PushManager.subscribe()`, no VAPID keys, no `PushSubscription` DB model, no web-push npm package, no server-side push endpoint, no cron scheduler anywhere in the codebase.
- Root cause of "notifications not arriving": on iOS, `new Notification()` is unsupported regardless of PWA install status; on Android/desktop, the app must be open. No background delivery mechanism exists.
- Tier 1 fixes (no new infra needed): move `HabitReminderBanner` logic to `AppShell`, switch to `registration.showNotification()`, add `notificationclick` handler to SW, fix Rome timezone in habit banner.
- Tier 2 (true background delivery): VAPID keys, `PushManager.subscribe()`, `PushSubscription` DB model, server push endpoint, `push` event handler in SW, Vercel Cron scheduler.
- No application code, schema, or test modified by this phase.
- Validation: no commands required (no code touched).

## Phase 15A.1 — Notification quick fix (open-app delivery)

Status: `[x]`

Output required:

- SW-backed notification delivery with `new Notification()` fallback.
- `notificationclick` handler in service worker.
- Rome timezone for habit reminder time comparison.
- Accurate permission prompt copy.
- Tests for Rome time helper.
- Create `docs/product-ready/15A1_NOTIFICATION_QUICK_FIX_NOTES.md`.

Completion notes (Phase 15A.1):

- `public/sw.js`: added `notificationclick` handler — focuses existing app window or opens `data.url`.
- `src/lib/notifications/daily-reminder.ts`: `showDailyReminderNotification` is now async; tries `registration.showNotification()` (guarded by `controller !== null`) then falls back to `new Notification()`; adds `data: { url: "/" }` to options. Extracted and exported `getRomeNowMinutes(date)`.
- `src/components/notifications/habit-reminder-banner.tsx`: uses `getRomeNowMinutes` (Rome time) and `getRomeTodayDateKey` (Rome date) instead of device-local equivalents; `new Notification()` replaced with `showHabitReminderNotification` async helper (same SW-first / fallback pattern); adds `data: { url: "/habits" }` to options; removed `pad`, `getLocalDateKey`, `getNowMinutes` helpers.
- `src/components/notifications/notification-permission-prompt.tsx`: removed "o installata" from copy — now reads "Funzionano quando l'app è aperta." Same change in habit banner in-app fallback text.
- `src/lib/notifications/daily-reminder.test.ts`: new file, 10 tests for `getRomeNowMinutes` and `isAfterReminderHour` covering summer/winter UTC offsets and boundary conditions.
- What still doesn't work: closed-app notifications (requires Web Push), iOS non-PWA, iOS PWA < 16.4, habit reminders on pages other than `/habits`.
- Validation: `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓ (152 pass, 10 new), `npm run build` ✓.

## Phase 15B — Category customization audit

Status: `[x]`

Output required:

- Audit category model, default flow, workspace scoping, entry/category relationship.
- Answer 15 specific questions about the current and recommended implementation.
- Create `docs/product-ready/15B_CATEGORY_CUSTOMIZATION_AUDIT.md`.
- No application code, schema, or test changes.

Completion notes (Phase 15B):

- Categories are workspace-scoped at the DB level (`workspaceId` FK, `@@unique([workspaceId, slug/name])`) but the static `DEFAULT_CATEGORIES` list is globally shared — mix of hardcoded + lazy DB.
- Defaults are lazily provisioned per workspace: first write for a slug triggers `upsertDefaultCategoryForWorkspace`; read-time `mergeCategoryOptions` fills unprovisioned defaults with static fallback (slug as id).
- Entry stores only `categoryId` (cuid FK); name/slug/icon/color resolved via JOIN at query time — no denormalization. Stats/reports/export read live category labels.
- **Critical bug found:** `upsertDefaultCategoryForWorkspace` has `update: { name, icon, color }`, which silently reverts user customizations every time the lazy upsert is triggered for a default slug. Must fix to `update: {}` before exposing rename UX.
- `onDelete: Restrict` on Entry/Habit/QuickPreset → Category blocks hard delete if any references exist. No soft-delete/archive mechanism today.
- No `/workspace/categories` management page exists.
- Recommended schema additions: `isDefault Boolean @default(false)` and `archivedAt DateTime?` on Category. No other FK/relation changes needed.
- Workspace-scoped customization is sufficient; user-scoped is not needed for the current model.
- Identified 4 implementation phases (A: schema+bug-fix, B: server actions, C: management UI, D: picker refinements).
- **Blocking decision before Phase 16:** Confirm that in the shared workspace, Marian and Martina share the same category set (including custom categories and archives), vs. each having their own subset.
- No application code, schema, or tests modified by this phase.
- Validation: no commands required (no code touched).

## Phase 16A — Category lifecycle foundation

Status: `[x]`

Output required:

- Add `isDefault Boolean @default(false)` and `archivedAt DateTime?` to Category schema.
- Add `@@index([workspaceId, archivedAt])`.
- Create migration `20260612120000_category_lifecycle` with ADD COLUMN + backfill.
- Fix `upsertDefaultCategoryForWorkspace`: `update: {}`, `isDefault: true` on create.
- Update `mergeCategoryOptions` to accept `archivedDefaultSlugs` and skip those slugs in static fallback.
- Update `getCategories` to filter archived categories and build `archivedDefaultSlugs` Set.
- Add tests for `mergeCategoryOptions` with archived slugs.
- Create `docs/product-ready/16A_CATEGORY_LIFECYCLE_FOUNDATION_NOTES.md`.

Rules:

- No UI changes.
- No new server actions for archive/rename (Phase 16B scope).
- No `/workspace/categories` management page (Phase 16C scope).

Completion notes (Phase 16A):

- Schema: added `isDefault Boolean @default(false)` and `archivedAt DateTime?` to `Category`, plus `@@index([workspaceId, archivedAt])`.
- Migration `20260612120000_category_lifecycle`: `ALTER TABLE` for both columns, new composite index, `UPDATE` backfill for all 17 default slugs.
- Upsert bug fixed: `update: {}` (no longer overwrites user customizations), `isDefault: true` in `create`. All lazy category creation paths (`entries/repository.ts`, `habits.ts`, `presets.ts`) route through this function — no separate changes needed there.
- `mergeCategoryOptions`: added `archivedAt?` to `dbCategories` type; added `archivedDefaultSlugs: ReadonlySet<string> = new Set()` parameter; static fallback skips slugs in the Set.
- `getCategories`: fetches `isDefault` + `archivedAt`; splits into `activeCategories` list and `archivedDefaultSlugs` Set; passes both to `mergeCategoryOptions`. Archived custom categories are simply excluded; archived defaults are also suppressed from the static fallback.
- Tests: 9 new `mergeCategoryOptions` tests in `src/lib/categories.test.ts`.
- No UI changes. No archive/rename actions. `prisma generate` run after schema change.
- Validation: `npx prisma validate` ✓, `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓ (161 pass, 9 new), `npm run build` ✓.

## Phase 16B — Category management server actions

Status: `[x]`

Output required:

- `generateSlugFromName` pure helper in `src/features/categories/slug.ts`.
- `src/actions/categories.ts` with 7 server actions: `getWorkspaceCategories`, `createCategory`, `updateCategory`, `archiveCategory`, `restoreCategory`, `deleteCategory`, `resetDefaultCategories`.
- Owner-only for all mutations.
- Tests for pure slug helper.
- Create `docs/product-ready/16B_CATEGORY_MANAGEMENT_ACTIONS_NOTES.md`.

Rules:

- No UI page (Phase 16C scope).
- No schema changes.
- No metric formula changes.
- No dashboard/stats/reports/export changes.

Completion notes (Phase 16B):

- `src/features/categories/slug.ts`: pure `generateSlugFromName` — NFD decompose, strip diacritics, lowercase, non-alnum → single dash, trim, fallback "categoria".
- `src/features/categories/slug.test.ts`: 12 tests covering Italian characters, diacritics, special chars, empty, fallback.
- `src/actions/categories.ts`: 7 actions with `"use server"` directive:
  - `getWorkspaceCategories()`: all DB-backed workspace categories with `_count` for entries/habits/presets. No owner check (read-only). Ordered active-first, defaults-first, alphabetical.
  - `createCategory(formData)`: owner-only; validates name; auto-generates slug with numeric suffix for uniqueness; `isDefault: false`.
  - `updateCategory(categoryId, formData)`: owner-only; name/icon/color only; slug immutable; workspace-scoped lookup before update.
  - `archiveCategory(categoryId)`: owner-only; sets `archivedAt = now`; idempotent if already archived.
  - `restoreCategory(categoryId)`: owner-only; clears `archivedAt`; checks for active-name conflict first.
  - `deleteCategory(categoryId)`: owner-only; checks `_count` and returns friendly error if references exist; hard-deletes only if no entries/habits/presets.
  - `resetDefaultCategories()`: owner-only; restores archived defaults (no-conflict only), provisions missing defaults, never overwrites active customizations.
- All mutations use `requireWorkspaceRole(prisma, { roles: ["owner"] })` and catch `WorkspaceRbacError`.
- `P2002` (duplicate name) and `P2003` (FK violation) caught and returned as friendly Italian messages.
- Revalidation: `revalidatePath("/", "layout")` cascades to all form pages.
- Validation: `npx prisma validate` ✓, `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓ (173 pass, 12 new), `npm run build` ✓.

## Phase 16C — Category management UI

Status: `[x]`

Output required:

- `app/workspace/categories/page.tsx` — owner-visible server page.
- `src/components/workspace/crafted-category-management.tsx` — client component with full management UI.
- Add "Gestisci categorie" `CraftedMoreRow` in `src/components/more/crafted-more.tsx`.
- Create `docs/product-ready/16C_CATEGORY_MANAGEMENT_UI_NOTES.md`.

Rules:

- No schema changes.
- No new server actions (Phase 16B scope).
- No metric formula changes.

Completion notes (Phase 16C):

- `app/workspace/categories/page.tsx`: server page with `force-dynamic`; loads `getWorkspaceCategories()` in try/catch; renders `CraftedSubpageHeader` (backHref="/more", eyebrow="Workspace", title="Gestisci categorie", context="Le categorie valgono solo..."); delegates to `CraftedCategoryManagement`; `DataLoadErrorBanner` on failure.
- `src/components/workspace/crafted-category-management.tsx`: client component with `useTransition` pattern throughout:
  - `CategoryCreateForm`: creates category via `createCategory(FormData)`; name/icon/color fields; shows error inline.
  - `CategoryEditForm`: edits name/icon/color via `updateCategory(id, FormData)`; inline per-row; cancel closes.
  - `CategoryRow`: per-row `useTransition`; Modifica (toggle edit), Archivia/Ripristina, Elimina (with `window.confirm`); shows destructive error messages inline; shows archived badge for archived categories.
  - Main component: active/archived split; archived section collapsed by default with chevron toggle; reset section with `resetDefaultCategories`; `router.refresh()` after every successful action.
- `src/components/more/crafted-more.tsx`: added `CraftedMoreRow` for `/workspace/categories` between Partecipanti and Crea workspace; uses `icon="receipt"`.
- Validation: `npx prisma validate` ✓, `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓ (173 pass, unchanged), `npm run build` ✓ (`/workspace/categories` in route table).

## Phase 17 — WCAG/Accessibility Audit

Status: `[x]`

Output required:

- Audit the app against practical WCAG 2.2 AA accessibility concerns.
- Create `docs/product-ready/17_ACCESSIBILITY_WCAG_AUDIT.md`.
- No application code, UI, schema, or test changes.

Completion notes (Phase 17 — WCAG/Accessibility Audit):

- Audited 27 files covering all specified pages and components (Dashboard, Entries, Entry create/edit, Quick-add, Presets, Stats, Monthly report, Goals, Habits, More, Feedback dialog, Debug page, Workspace members, Workspace categories, Bottom nav/app shell, PWA notification prompt).
- Confirmed `Label` from `@/components/crafted/label.tsx` is a styled `<span>`, not an HTML `<label>` — root cause of multiple unlabeled input issues.
- Confirmed `ProgressLine` has `role="progressbar"` + `aria-valuenow/min/max` but no `aria-label` naming what is tracked.
- Confirmed intent toggle buttons in entry form and quick-add correctly have `aria-pressed`.
- Confirmed `<details>/<summary>` for stats and report collapsibles is natively accessible.
- Confirmed bottom nav has `aria-label`, `aria-current`, focus rings, and adequate touch targets.
- Key risks found: 3 critical blockers (unlabeled inputs, category selector state, error-input linking) + 10 medium/low issues documented.
- No application code, schema, or tests modified by this phase.
- Validation: no commands required (no code touched).

## Phase 18 — UI Accessibility Hardening

Status: `[x]`

Output required:

- Fix P1 accessibility blockers found in Phase 17.
- Create `docs/product-ready/18_ACCESSIBILITY_HARDENING_NOTES.md`.
- No DB/schema changes, no server action changes, no metric changes, no visual redesign.

Completion notes (Phase 18 — UI Accessibility Hardening):

- `FormFieldError` gained optional `id` prop enabling `aria-describedby` linking (used in entry forms and habit form).
- `crafted-entry-form.tsx`: Title/Date/Note inputs now have real `<label htmlFor>` associations; category selector buttons have `aria-pressed` + `role="group" aria-label`; `aria-describedby` + `aria-invalid` wired to title and date error messages.
- `crafted-entry-edit-form.tsx`: Same fixes as create form — label associations, `aria-pressed` on category buttons, error linking.
- `crafted-habit-form.tsx`: Name/Category/Amount inputs wrapped in real `<label>` by containment; `aria-describedby` wired to name and amount error messages.
- `crafted-category-management.tsx` (CategoryEditForm): Added `htmlFor`/`id` pairs to all three field labels (name, icon, color). (CategoryCreateForm): Same fix for all three fields. (CategoryRow): All action buttons have contextual `aria-label` — `Modifica/Archivia/Ripristina/Elimina categoria {name}`.
- `feedback-button.tsx`: Type pill buttons have `aria-pressed={selectedType === value}`.
- `app-shell.tsx`: `DesktopNavLink` gains `focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50`.
- `quick-add-sheet.tsx`: Date `<Label>` gained `htmlFor="quick-date"`; preset buttons gained `aria-pressed={isActive}`.
- `crafted-preset-form.tsx`: Title/Category/Amount/Comparison-amount inputs wrapped in real `<label htmlFor>` by containment.
- Color-only bars: documented as follow-up (aria-hidden + adjacent text already present in most cases); no regression risk.
- Validation: lint ✓ · typecheck ✓ · tests 173/173 ✓ · build ✓

## Phase 19 — Product documentation cleanup and roadmap consolidation

Status: `[x]`

Output required:

- Create `docs/product-ready/README.md` — phase index and navigation guide.
- Create `docs/product-ready/CURRENT_STATUS.md` — stability rating, completed areas, known limitations, key invariants.
- Create `docs/product-ready/NEXT_STEPS.md` — Phase 20 scope and rules, later roadmap.
- Update `docs/product-ready/02_EXECUTION_CHECKLIST.md` — Phase 19 complete + "Current recommended next step" at top.
- No application code, schema, test, or UI changes.

Completion notes (Phase 19 — Documentation cleanup):

- `docs/product-ready/README.md` created: what this folder is, phase index with one-line descriptions, distinction between historical/audit docs and current operational docs, key invariants, how to continue work safely.
- `docs/product-ready/CURRENT_STATUS.md` created: stability ratings (9/10 private beta, 7/10 public launch), summary of all 9 completed major areas, 6 known limitations (notifications, privacy/deletion, rate limiting, design polish, production migration awareness, habit banner scope), and key invariants table.
- `docs/product-ready/NEXT_STEPS.md` created: Phase 20 design pass scope + 8 hard rules, later roadmap (Web Push, privacy/deletion, rate limiting, monitoring, onboarding, public launch checklist), and "what not to do next" section.
- No docs deleted. All historical phase notes preserved.
- No application code, schema, or tests touched.
- Validation: no commands required (docs-only).

## Phase 20 — Design / visual polish pass

Status: `[x]`

Output required:

- Apply the Phase 20 visual polish handoff to the real app components.
- Scope the priority pass to dashboard hierarchy, entry row readability, bottom nav/app shell, create/edit form polish, and `/workspace/categories`.
- Apply only a light consistency pass to quick-add, stats, monthly report, goals/habits, feedback dialog, and empty states.
- Add semantic design tokens from `phase20/phase20.css` into the existing styling system.
- Create `docs/product-ready/20_DESIGN_POLISH_IMPLEMENTATION_NOTES.md`.

Rules:

- No database schema, Prisma model, or migration changes.
- No server action changes.
- No metric formula, financial calculation, shared-balance, category behavior, or category server-action changes.
- Preserve Phase 18 accessibility semantics.
- Preserve Phase 14 information architecture.
- No new dependencies, features, pages, data flows, or renamed core concepts.

Completion notes (Phase 20):

- Added Phase 20 semantic spacing/radius/elevation/state tokens in `app/globals.css`.
- Dashboard: tightened hero rhythm, changed the month delta to a right-aligned muted pill, improved recent-entry row readability, unified CTA radius, and removed quick-action card shadows.
- Entry rows: standardized row hit area, badge padding/weight, comparison detail wrapping, metadata line-height, and euro baseline alignment.
- Bottom nav: unified item radius, locked active-dot offset, enlarged quick-add FAB target to 40px, and adjusted safe-area baseline.
- Create/edit entry forms: standardized field rhythm, replaced off-palette amber large-comparison warning with an in-palette warm note, and unified CTA radius.
- `/workspace/categories`: restyled inputs, badges, action links, row rhythm, and buttons without changing create/edit/archive/restore/delete/reset flows.
- Light pass: quick-add sheet now matches the editorial intent-control and preset-card dialect; Stats/report collapsed details gained clearer affordance while staying collapsed; goals and empty states use shared rhythm/CTA radius; feedback dialog fields and CTA match Phase 20 tokens.
- Toast and button primitive elevation adjusted to respect the Phase 20 overlay-only shadow rule.
- No schema, Prisma, migration, server action, metric, shared-balance, or category action files changed.
- Accessibility semantics preserved: labels, `aria-describedby`, `aria-pressed`, contextual `aria-label`, `aria-current`, `aria-invalid`, and focus-visible states remain in touched surfaces.
- Validation: `npm run lint` ✓, `npm run typecheck` ✓, `npm run test` ✓ (173/173 pass), `npm run build` ✓.

## Deferred decisions

These must be resolved during or after Phase 1 before implementation if the existing model is ambiguous:

- How the current app distinguishes normal expense, comparison, and avoided purchase.
- Whether existing fields are enough to derive entry mode reliably.
- Whether legacy `person` remains only a compatibility field or still drives member-specific views.
- Whether large avoided purchases should ever count as large comparisons. Default: no.
- Whether shared expense balance belongs in the metric module or a separate shared-expense module consumed by metrics.
