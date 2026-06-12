# Phase 7 - Form clarity notes

Date: 2026-06-11

## Scope completed

Phase 7 improved form clarity only. No metric formulas, dashboard/stats/reports/export logic, DB schema, auth/workspace behavior, monetization, ads, or AI features were changed.

The implementation keeps the existing persistence model:

- `Ho speso` -> `mode=spent`, `savingContext=none`.
- `Ho speso e voglio confrontarlo` -> `mode=spent`, `savingContext=comparison`.
- `Non l'ho comprato` -> `mode=avoided`, forced comparison context as before.

No schema change was needed because the existing `mode` and `savingContext` fields already represent the three product intents.

## Form labels changed

Create and edit entry forms:

- Added an explicit third intent control for comparison entries.
- Visible choices are now:
  - `Ho speso`
  - `Speso + confronto` with accessible label `Ho speso e voglio confrontarlo`
  - `Non l'ho comprato`
- Primary amount label for spent entries changed from `Hai speso` to `Quanto hai speso`.
- Comparison amount label changed from `Quanto sarebbe costato` to `Quanto avresti speso di solito?`.
- Avoided-purchase helper now says: `Segna quanto avresti speso se l'avessi comprato.`
- Comparison helper now says: `Usalo quando hai scelto un'opzione più economica.`
- Negative comparison summary now says `Speso in più del confronto` instead of generic `sopra il confronto`.

Quick-add:

- Added the same three intent choices at the top of the sheet.
- Presets still prefill the same fields as before, but the active intent is now visible.
- `Vai al form completo` continues to preserve title, category, amounts, paidBy, beneficiaries, date, mode, and saving context.

Presets:

- The preset form now exposes the same three intent choices.
- Saved preset summaries now distinguish:
  - `Non comprato`
  - `Risparmiato scegliendo meglio`
  - `Speso in più del confronto`

## Flows clarified

### Ho speso

Used for a normal expense.

- User enters what actually left their pocket.
- The reference amount defaults to the same value internally, preserving existing behavior.
- No positive/negative comparison impact is created.

### Ho speso e voglio confrontarlo

Used when the user paid something and wants to compare it with a reference.

- User enters `Quanto hai speso`.
- User enters `Quanto avresti speso di solito?`.
- The app derives positive comparison saving or overspending using the existing metric module.
- If the absolute comparison delta is at least 100 EUR, the UI shows a non-blocking warning: `Questo confronto pesa molto sulle statistiche.`

### Non l'ho comprato

Used when the purchase did not happen.

- User enters what they would have spent.
- The app sends no real spent amount and preserves the existing avoided-entry behavior.
- Copy clarifies that nothing is counted as `Speso davvero`.

## paidBy and beneficiary decisions

The existing data model already supports payer and beneficiaries, so no DB change was needed.

Changes made:

- The collapsed details toggle now says `Data, nota, chi paga e vale per` instead of generic `ripartizione`.
- `Chi paga` helper text clarifies that this is the person who really anticipates the money.
- Beneficiary section label changed from `Per chi è la spesa` to `Vale per`.
- Beneficiary helper explains that selected people decide whether the movement is personal or shared.
- Personal/shared status now explains whether the amount is treated as personal or split across selected people.

Decision:

- paidBy and beneficiaries remain in the details section to keep the form compact, but the toggle text now names both fields directly so they are not hidden behind an abstract “advanced” label.
- Quick-add still shows paidBy/beneficiaries directly in the sheet because it creates entries immediately.

## Tests added

Updated `src/features/entries/form-money.test.ts` with coverage for the three form intents:

- `Ho speso` as normal expense.
- `Ho speso e voglio confrontarlo` as spent comparison.
- `Non l'ho comprato` as avoided spending.

## Follow-ups

- Consider replacing the short visible tab label `Speso + confronto` with the full sentence if mobile layout testing shows it still fits.
- Preset storage still derives mode/savingContext from realCost/alternativeCost because the current preset table does not persist explicit mode fields. This was left unchanged to avoid schema work in Phase 7.
- If users still miss sharing fields, consider showing a compact always-visible summary such as `Pagato da X · vale per Y` above the details toggle.
- The unused legacy `src/components/presets/preset-form.tsx` still contains older labels. It is not mounted by `app/presets/page.tsx`; clean it up only in a dedicated dead-code pass.
