# Product Ready Context

## Project

Non l'ho comprato is a personal/couple expense tracking PWA.

The app already has:

- entries and movements;
- categories;
- workspaces;
- users and members;
- shared expenses;
- stats;
- monthly reports;
- CSV export;
- PWA install behavior;
- dashboard cards.

The app is already online and being tested with real users. This work is not a visual redesign.

## Current maturity

Current status:

- Private beta: about 7.5/10.
- Product readiness for real external users: about 5/10.

Target status:

- Private beta: 10/10.
- Product readiness: at least 7/10.

## Main trust problem

The product currently risks showing one ambiguous saved/risparmio number that mixes different concepts:

1. Money actually not spent because the user did not buy something.
2. Money saved by choosing a cheaper option.
3. Money overspent compared to an expected or alternative cost.
4. Large subjective comparisons that can dominate totals.

This creates a trust problem because the user cannot understand whether the app is reporting real spending discipline, avoided purchases, cheaper choices, or subjective comparisons.

## Real data signal

A real export showed:

- 126 movements from 2026-05-03 to 2026-06-11.
- Total spent really: 2,818.83 EUR.
- Total would have spent: 3,584.12 EUR.
- Current net saved/impact: 765.29 EUR.

Two large comparison movements dominate that total:

- Shein: spent 19.80 EUR, would have spent 600.00 EUR, impact +580.20 EUR.
- Temu: spent 27.02 EUR, would have spent 256.00 EUR, impact +228.98 EUR.

Together these two entries contribute +809.18 EUR.

Without them, the ordinary impact is approximately -43.89 EUR.

Therefore the app must not present one generic saved metric without a breakdown.

## Official product direction

The app should communicate clearly:

- how much users really spent;
- how much they avoided by not buying;
- how much they saved by choosing better;
- how much they overspent compared to a reference;
- net impact;
- ordinary impact excluding large comparisons;
- large comparison impact.

## Non-goals

This initiative must not:

- redesign the app visually;
- introduce monetization;
- add ads;
- add AI features;
- remove existing features;
- make broad unrelated refactors;
- change authentication or workspace behavior unless strictly necessary for metric correctness;
- change DB schema before a phase explicitly requires it and is accepted;
- use `createdAt` for financial reporting periods.

## Date rule

Financial reporting, stats, heatmaps, streaks, monthly ranges, exports, and reports must use the entry `date` field.

`createdAt` is metadata for when the row was inserted. It must not decide which financial day/month an entry belongs to.

This must be tested with at least one entry inserted later but assigned to an earlier entry date.

## Work discipline

Work phase by phase.

Do not skip phases.

Do not implement later phases before earlier phases are accepted.

At the end of every phase, report:

- files changed;
- what was done;
- what was not done;
- validation commands run;
- risks or follow-up items.

Update `docs/product-ready/02_EXECUTION_CHECKLIST.md` after every accepted phase.
