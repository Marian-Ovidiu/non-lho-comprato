# Product Ready Metrics Refactor Plan — Non l'ho comprato

## Goal

Bring the app from:

- Private beta: 7.5/10
- Product readiness: 5/10

to:

- Private beta: 10/10
- Product readiness: 7+/10

This refactor focuses on data correctness, metric consistency, trustworthy reporting, and clearer product semantics.

Visual redesign is explicitly out of scope for this phase.

---

## Current Product Problem

The app works and is already used with real users, but the meaning of the financial metrics is not clear enough.

The current generic idea of "saved amount" mixes different concepts:

1. Money not spent because the user did not buy something.
2. Money saved by choosing a cheaper option.
3. Money overspent compared to an expected or alternative cost.
4. Large subjective comparisons that can dominate total savings.

This creates a trust problem.

Example from real data:

- Total spent: 2,818.83€
- Total would have spent: 3,584.12€
- Net impact: 765.29€

But two large comparison entries produce most of that positive impact:

- Shein: spent 19.80€, would have spent 600.00€, impact +580.20€
- Temu: spent 27.02€, would have spent 256.00€, impact +228.98€

Together they contribute +809.18€.

Without these two entries, the ordinary impact is approximately -43.89€.

The app must communicate this honestly.

---

## Product Principle

The app should not show one ambiguous "saved" number.

It must separate:

- real money spent;
- money avoided by not buying;
- money saved by choosing a cheaper option;
- money overspent compared to a reference;
- net impact;
- ordinary impact;
- large comparison impact.

---

## Official Metric Vocabulary

Use these names consistently in code and UI.

### spentReal

Money that actually left the user's pocket.

Formula:

```ts
spentReal = realCost