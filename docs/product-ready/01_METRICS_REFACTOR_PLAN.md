# Metrics Refactor Plan

## Goal

Make the app trustworthy by replacing ambiguous saved/risparmio semantics with explicit, consistent product metrics.

The app must distinguish:

- real money spent;
- money avoided by not buying;
- money saved by choosing a cheaper option;
- money overspent compared to a reference;
- positive impact;
- net impact;
- ordinary impact;
- large comparison impact.

## Official metrics

### spentReal

Money that actually left the user's pocket.

UI label: `Speso davvero`

Definition:

```ts
spentReal = realCost
```

Notes:

- Normal expenses contribute to spentReal.
- Avoided purchases usually have spentReal = 0.
- Comparisons still contribute the real amount actually paid.

### wouldHaveSpent

Reference amount, alternative cost, or expected cost.

UI label: `Avresti speso`

Definition:

```ts
wouldHaveSpent = alternativeCost
```

Notes:

- This is not money necessarily spent.
- It is a comparison/reference value.
- It must be displayed carefully to avoid looking like real spending.

### avoidedAmount

Positive amount only for entries where the user did not buy something.

UI label: `Non comprato`

Example:

```ts
spentReal = 0
wouldHaveSpent = 18
avoidedAmount = 18
```

Rules:

- Applies to entries semantically representing "Non l'ho comprato".
- Does not apply to normal expenses.
- Does not apply to cheaper-option comparisons where spentReal > 0.

### comparisonSaved

Positive difference when the user spent less than the reference amount.

UI label: `Risparmiato scegliendo meglio`

Example:

```ts
spentReal = 8
wouldHaveSpent = 15
comparisonSaved = 7
```

Rules:

- Applies to comparison-based entries.
- Must be zero when spentReal >= wouldHaveSpent.
- Must not include avoided purchases if the entry is classified as not bought.

### comparisonOverspent

Positive value representing how much more the user spent compared to the reference.

UI label: `Speso in più del confronto`

Example:

```ts
spentReal = 60
wouldHaveSpent = 40
comparisonOverspent = 20
```

Rules:

- This value is positive in UI.
- It subtracts from netImpact.
- It applies only to comparison-based entries.

### grossPositiveImpact

Positive impact before subtracting overspending.

UI label: `Impatto positivo`

Formula:

```ts
grossPositiveImpact = avoidedAmount + comparisonSaved
```

### netImpact

Net effect after positive impact and overspending.

UI label: `Impatto netto`

Formula:

```ts
netImpact = avoidedAmount + comparisonSaved - comparisonOverspent
```

### isLargeComparison

A comparison that can significantly distort totals.

UI label: `Grande confronto`

Default rule:

```ts
isLargeComparison = isComparisonBasedEntry && Math.abs(netImpact) >= 100
```

Rules:

- Applies only to comparison-based entries.
- Does not apply to normal expenses.
- Does not apply to avoided purchases unless the final product decision explicitly classifies them as comparison-based.
- Threshold default is 100 EUR.

### largeComparisonImpact

Sum of netImpact where isLargeComparison is true.

UI label: `Grandi confronti`

Formula:

```ts
largeComparisonImpact = sum(entry.netImpact where entry.isLargeComparison)
```

### ordinaryImpact

Net impact excluding large comparisons.

UI label: `Impatto ordinario`

Formula:

```ts
ordinaryImpact = netImpact - largeComparisonImpact
```

## Entry classification

The product must make entry intent explicit enough to calculate metrics correctly.

Required user-facing modes for Phase 7:

1. `Ho speso`
2. `Ho speso e voglio confrontarlo`
3. `Non l'ho comprato`

Expected semantic mapping:

- `Ho speso`: normal expense. spentReal contributes; comparison metrics are zero unless explicitly configured otherwise.
- `Ho speso e voglio confrontarlo`: comparison entry. spentReal and wouldHaveSpent are compared.
- `Non l'ho comprato`: avoided purchase. spentReal is zero or treated as zero for avoided impact; wouldHaveSpent becomes avoidedAmount.

## Shared expense rule

The app must not confuse:

- who paid;
- who benefited;
- who owes whom;
- who consumed the expense.

For each entry, the system should be able to derive:

- paidByUserId;
- beneficiaries;
- beneficiaryCount;
- sharePerBeneficiary;
- payerBalanceImpact;
- isShared.

Example:

Martina pays 20 EUR.

Beneficiaries: Marian + Martina.

Expected:

- total spent: 20 EUR;
- Marian share: 10 EUR;
- Martina share: 10 EUR;
- balance: Marian owes 10 EUR to Martina.

Metric implications:

- `spentReal` for the entry remains 20 EUR.
- Personal/member views must distinguish total entry amount from each person's share.
- Balance views must use payer and beneficiaries, not only the legacy `person` field.

## Export target columns

CSV export should eventually include:

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

## Golden test dataset

Golden tests must eventually cover:

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

## Required implementation phases

### Phase 1 - Audit only

Create `docs/product-ready/04_METRICS_AUDIT.md`.

Map all files, functions, components, hooks, and utilities where the app calculates or displays:

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

No application code changes in Phase 1.

### Phase 2 - Unified metric module

Create a single source of truth for entry metrics.

Suggested file: `src/lib/domain/entry-metrics.ts`, unless the project structure suggests a better location during the audit.

The module must expose functions like:

- `calculateEntryMetrics(entry)`;
- `aggregateEntryMetrics(entries)`.

Rules:

- Must not depend on React components.
- Must be safe to use from server actions, reports, stats, exports, and tests.
- Must centralize rounding and numeric conversion rules.
- Must explicitly handle normal expense, comparison, avoided purchase, and large comparison classification.

### Phase 3 - Unit tests

Add golden tests for:

- entry-level metrics;
- aggregate metrics;
- large comparison classification;
- ordinary impact;
- shared expense derivation;
- date vs createdAt reporting behavior.

### Phase 4 - Replace duplicated calculations

Migrate duplicated calculations to the unified module in:

- dashboard;
- stats;
- monthly reports;
- export;
- reusable metric cards/hooks/utilities.

The goal is consistency, not redesign.

### Phase 5 - Export improvement

Update CSV export with:

- explicit metric breakdown columns;
- large comparison columns;
- ordinary impact columns;
- sharing columns;
- date and createdAt both present but clearly distinct.

### Phase 6 - UX wording/content pass

Only change wording, content, and labels. No visual redesign.

Use these labels consistently:

- `Speso davvero`;
- `Non comprato`;
- `Risparmiato scegliendo meglio`;
- `Speso in più del confronto`;
- `Impatto netto`;
- `Grandi confronti`;
- `Impatto ordinario`.

### Phase 7 - Form logic clarity

Improve creation/edit form logic and microcopy so users clearly choose between:

1. `Ho speso`
2. `Ho speso e voglio confrontarlo`
3. `Non l'ho comprato`

Make paidBy and beneficiaries visible enough to avoid incorrect shared expenses.

## Reporting requirements per phase

At the end of every phase, report:

- files changed;
- what was done;
- what was not done;
- validation commands run;
- risks or follow-up items.

Then update `docs/product-ready/02_EXECUTION_CHECKLIST.md`.
