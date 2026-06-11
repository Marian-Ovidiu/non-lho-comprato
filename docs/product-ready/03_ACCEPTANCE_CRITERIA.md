# Acceptance Criteria

## Global acceptance criteria

The refactor is successful when the app becomes trustworthy about money semantics without a visual redesign.

The app must not show one ambiguous saved/risparmio number without explaining the breakdown.

The app must consistently communicate:

- `Speso davvero`;
- `Non comprato`;
- `Risparmiato scegliendo meglio`;
- `Speso in più del confronto`;
- `Impatto netto`;
- `Grandi confronti`;
- `Impatto ordinario`.

## Metric correctness acceptance criteria

For every relevant entry, the system can derive:

- spentReal;
- wouldHaveSpent;
- avoidedAmount;
- comparisonSaved;
- comparisonOverspent;
- grossPositiveImpact;
- netImpact;
- isLargeComparison.

For every relevant aggregate, the system can derive:

- total spentReal;
- total wouldHaveSpent;
- total avoidedAmount;
- total comparisonSaved;
- total comparisonOverspent;
- total grossPositiveImpact;
- total netImpact;
- largeComparisonImpact;
- ordinaryImpact.

## Formula acceptance criteria

The following formulas must hold:

```ts
grossPositiveImpact = avoidedAmount + comparisonSaved
netImpact = avoidedAmount + comparisonSaved - comparisonOverspent
largeComparisonImpact = sum(entry.netImpact where entry.isLargeComparison)
ordinaryImpact = netImpact - largeComparisonImpact
```

`comparisonOverspent` must be displayed as a positive amount but subtract from netImpact.

`isLargeComparison` default rule:

```ts
isLargeComparison = isComparisonBasedEntry && Math.abs(netImpact) >= 100
```

Large comparison classification must not apply to normal expenses.

## Date acceptance criteria

Financial reporting must use entry `date`, not `createdAt`, for:

- dashboard ranges;
- stats ranges;
- monthly reports;
- heatmaps;
- streaks;
- category summaries;
- member summaries;
- CSV export reporting periods.

`createdAt` may remain available as metadata in export and audit/debug contexts.

The golden dataset must prove that an entry inserted later but assigned to an earlier entry date is reported in the earlier entry date period.

## Shared expense acceptance criteria

The app must not confuse payer, beneficiaries, debt/balance, and consumption.

For each shared entry, the system should derive:

- paidByUserId;
- beneficiaries;
- beneficiaryCount;
- sharePerBeneficiary;
- payerBalanceImpact;
- isShared.

Example acceptance case:

Martina pays 20 EUR.

Beneficiaries: Marian + Martina.

Expected:

- total spent: 20 EUR;
- Marian share: 10 EUR;
- Martina share: 10 EUR;
- balance: Marian owes 10 EUR to Martina.

Member-specific views must not treat the payer as the only consumer of the expense.

## Export acceptance criteria

CSV export must eventually include these columns:

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

Export summary totals must match dashboard/report/stats totals after Phase 4 and Phase 5.

## Golden dataset acceptance criteria

Tests must cover:

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

Expected special case from real data:

- Shein impact: +580.20 EUR.
- Temu impact: +228.98 EUR.
- Combined large comparison contribution: +809.18 EUR.
- Ordinary impact without those large comparisons: approximately -43.89 EUR for the observed dataset.

## UX wording acceptance criteria

Ambiguous labels like generic saved/risparmio must be replaced or contextualized where they can mislead.

Approved labels:

- `Speso davvero`;
- `Non comprato`;
- `Risparmiato scegliendo meglio`;
- `Speso in più del confronto`;
- `Impatto netto`;
- `Grandi confronti`;
- `Impatto ordinario`.

No visual redesign is required or accepted as part of this initiative.

## Form clarity acceptance criteria

The create/edit forms must make the entry intent clear:

1. `Ho speso`
2. `Ho speso e voglio confrontarlo`
3. `Non l'ho comprato`

PaidBy and beneficiaries must be visible enough that a user can avoid creating incorrect shared expenses.

## Phase acceptance criteria

### Phase 1

Accepted when `docs/product-ready/04_METRICS_AUDIT.md` maps all relevant calculation/display/date/sharing locations and no application code has been changed.

### Phase 2

Accepted when a reusable metric module exists and compiles without migrating callers yet.

### Phase 3

Accepted when golden tests cover entry-level and aggregate metric behavior.

### Phase 4

Accepted when dashboard, stats, reports, export, and reusable metric displays use the unified module.

### Phase 5

Accepted when CSV export includes the metric and sharing breakdown and totals align with the unified aggregate logic.

### Phase 6

Accepted when visible wording uses approved labels and avoids misleading generic saved language.

### Phase 7

Accepted when form intent, paidBy, and beneficiaries are clear enough to support correct metric and shared-expense behavior.

## Validation command expectations

Depending on phase scope, use the appropriate subset of:

```bash
npm run prisma:validate
npm run lint
npm run typecheck
npm run test
npm run build
```

Do not run DB migration, DB push, Supabase, Vercel, or production configuration commands unless a later accepted phase explicitly authorizes them.
