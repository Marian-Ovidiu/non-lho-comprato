# Phase 6 - UX wording/content notes

Date: 2026-06-11

## Scope completed

Phase 6 updated product copy only. No metric formulas, export columns, DB schema, auth/workspace behavior, form logic, or layout redesign were changed.

The wording pass focused on making these concepts explicit:

- `Speso davvero`: money actually spent.
- `Non comprato`: money avoided because the purchase did not happen.
- `Risparmiato scegliendo meglio`: positive comparison where the actual spend is lower than the reference.
- `Speso in più del confronto`: negative comparison where the actual spend is higher than the reference.
- `Impatto netto`: positive impact minus comparison overspend.
- `Grandi confronti`: large comparison entries that can distort totals.
- `Impatto ordinario`: net impact excluding large comparisons.

## Labels changed

Dashboard and home surfaces:

- `risparmio reale` -> `impatto netto` in app metadata and manifest copy.
- `Evitato / risparmio oggi` -> `Impatto netto oggi`.
- `Guarda spesa e risparmio` -> `Guarda spesa e impatto netto`.
- `confronto o evitato` -> `confronto o non comprato`.
- Recent movement details now distinguish:
  - `Non comprato` for avoided purchases.
  - `Risparmiato scegliendo meglio` for positive comparisons.
  - `Speso in più del confronto` for negative comparisons.
- Category rollups now describe `impatto netto` instead of generic `evitati / risparmio`.
- Large comparison note now uses `Grandi confronti` explicitly.

Stats:

- `Confronto stimato` -> `Avresti speso`.
- `Efficienza` -> `Indice netto`.
- `evitati / risparmiati` -> `impatto netto`.
- `Risparmi ed evitate` -> `Impatto positivo`.
- Empty states now refer to missing `impatto positivo` instead of missing `risparmio`.

Monthly reports:

- `Efficienza` -> `Indice netto`.
- `Risparmiato/evitato` -> `Impatto netto positivo`.
- `Dove avete evitato di più` -> `Miglior impatto positivo`.
- `Risparmio più alto` -> `Miglior impatto positivo`.
- Report helper text now says: first real spend, then `non comprato` and positive comparisons.

Entry list and rows:

- Header `Evitato / risparmio` -> `Impatto netto`.
- Group summaries now use `impatto netto`.
- Row-level positive/negative details use `Non comprato`, `Risparmiato scegliendo meglio`, and `Speso in più del confronto`.

Goals, habits, more, onboarding, public landing:

- Goal copy now refers to `impatto positivo` and `impatto netto mese` instead of generic savings.
- Habit summary now says `impatto netto dalle ricorrenti`.
- More page metric label `Risparmio` -> `Impatto netto`.
- Onboarding and landing copy now describe the product in terms of spend plus net impact.

## Helper texts added or clarified

- Dashboard check-in helper now explains that users can add a real spend or a `Non l'ho comprato` entry.
- Stats top-positive list now explains that `Impatto positivo` includes `Non comprato` and comparisons where the user spent less than the reference.
- Report highlights now clarify that real spend is primary, then non-bought purchases and positive comparisons.
- Empty states now avoid saying that the user has no savings when the app only lacks positive impact data.

## Ambiguous labels intentionally kept

The following were intentionally left for Phase 7 or compatibility work:

- Form and quick-add mode labels around `Avresti speso`, `confronto`, and preset editing. Phase 7 is specifically responsible for form logic clarity and user intent selection.
- Internal code identifiers such as `savedAmount`, `totalSaved`, and `savingRatePercent`. They remain compatibility names after Phase 4 legacy cleanup and are not visible product copy.
- Export backward compatibility columns such as legacy `savedAmount`. Phase 6 does not change export columns.
- Historical documentation references in audit/checklist files. They describe previous state and should remain accurate.

## Follow-ups for Phase 7

- Make creation/edit form intent explicit with the three official choices:
  - `Ho speso`
  - `Ho speso e voglio confrontarlo`
  - `Non l'ho comprato`
- Clarify paid-by and beneficiaries near shared expense controls.
- Review quick-add helper text and presets after form mode semantics are finalized.
- Consider whether `Indice netto` should become a more explicit ratio label after product testing.
- Review large-comparison copy for negative large comparisons if the UI starts surfacing them separately.
