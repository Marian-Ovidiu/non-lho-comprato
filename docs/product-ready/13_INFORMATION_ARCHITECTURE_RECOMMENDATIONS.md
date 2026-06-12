# Phase 13 — Information Architecture Recommendations

Date: 2026-06-12

No application code, tests, or schema were modified.

---

## 1. Current Suspected Problem

The app has made significant wording and metric improvements through Phases 1–12. The underlying
data is now correct and the labels are honest. The remaining problem is **structural**: the right
numbers exist but they are distributed across the wrong surfaces, or shown in the wrong order
within a page, in a way that creates two recurring failure modes.

### Failure mode A — Dashboard cognitive overload

The dashboard currently shows, in order:

1. Real spend this month (odometer, very visible)
2. Net impact this month (secondary, but on the same card)
3. Grandi confronti footnote (tertiary)
4. Today: spent + impact + count (StatTrio)
5. Quick actions
6. Category breakdown with impact per category
7. Streak + habits today
8. Couple balance
9. Goals progress
10. Recent entries

That is approximately 10 distinct information zones before the user scrolls past the fold. The
problem is not that any individual zone is wrong — each one is defensible in isolation. The
problem is that none of them is unambiguously primary. A user who opens the dashboard to answer
"how am I doing right now?" receives: real spend, net impact, a large-comparison caveat, three
today numbers, category bars, streak, habits, couple balance, goals, and a list of entries. Every
section competes for the same level of visual weight.

### Failure mode B — Stats as a dumping ground

Stats currently contains:

1. A period filter
2. A hero number (changes meaning by period: totalSaved all-time, totalRealSpent year, etc.)
3. A "Bilancio" StatTrio: Speso / Impatto netto / Movimenti
4. A second StatTrio: Avresti speso / Impatto medio / Indice netto
5. A 12-month spending chart
6. A daily heatmap (month view only)
7. Top categoria del periodo
8. Per-categoria bars with impact
9. "Impatto positivo" list (top savings entries)
10. A third StatTrio: Media spesa/mese / Giorni attivi / Movimenti
11. Habits discipline list

Six numbers for "this period" before the user reaches the category breakdown. The page correctly
separates "spending where" from "impact how much", but only for someone who already knows what
each section means.

### Failure mode C — Balance buried on the dashboard

The couple balance is rendered as block #8 on the dashboard (after streak, habits, below the fold
on most phones). It is one of the most actionable numbers in the app for a couple using it
together, yet it is treated as an afterthought below decorative content.

### Failure mode D — Indice netto has no obvious home

`Indice netto` (savingRatePercent = netImpact / totalAlternativeCost) currently appears in both
Stats "Bilancio" row and Monthly Reports header. It is a useful ratio but it is not a primary
number. It is shown at the same visual weight as `Speso davvero`, which is a primary number. The
ratio implies a normative judgment ("you are X% efficient") without explaining the denominator,
which most users cannot reconstruct.

### Failure mode E — Report page duplicates dashboard

The Monthly Report shows: overview netImpact → who paid more → evidenze del mese → per-category
breakdown → entry list. The "who paid more" section (member split) is genuinely report-specific
and valuable. The "evidenze" (best category, best entry by impact) are valuable. But the overview
numbers at the top (`Impatto netto`, `Indice netto`) duplicate what the dashboard already shows
for the same month.

---

## 2. Recommended Page-by-Page Data Distribution

### Dashboard — "How am I doing now?"

Primary purpose: give the user a confident, immediate orientation. One number above all else.

**Hero zone (above the fold, always visible):**

- `Speso davvero` this month — the odometer, full typographic weight, no change needed
- Single secondary line: `Impatto netto` with sign and € — exactly as it is today
- `Grandi confronti` footnote only when > 0 — already implemented, keep as-is

**Contextual today strip:**

- `Speso oggi` + `Movimenti oggi` (2 numbers, not 3)
- Remove `Impatto oggi` from the today strip — today's impact is a secondary metric that belongs
  in the entry list, not a dashboard number. Most days it is 0 or misleadingly large due to a
  single comparison entry.

**Quick actions:** keep exactly as-is.

**Couple balance — promote to position 3 (before categories):**

- Move `Bilancio coppia` up, immediately after the quick actions strip.
- For couples, this is a primary operational number ("who owes what, right now").
- It should be visible without scrolling on most phones.
- When balanced or unsupported: hide the section entirely (already done — keep this behaviour).

**Categories — keep as-is, compact:**

- The spending breakdown bar + per-category list is well placed.
- Remove the per-category `impatto netto` micro-annotation from the dashboard view.
  Category-level impact belongs on the Stats page. On the dashboard, categories should only
  show spend amounts and entry counts — the user's question here is "where did money go?", not
  "how did I do per category?".

**Streak + Habits today:**

- Keep the streak counter and today's habit count.
- Remove the habits note text (`habitsNote`) from the dashboard — it belongs in the Habits page.

**Goals:** keep as-is, below streak. Goals motivate; they do not compete with spending data.

**Recent entries:** keep at the bottom. Useful for quick audit but not primary data.

**Remove from dashboard entirely:**

- `Impatto oggi` from the StatTrio (move to the daily check-in overlay only)
- Per-category `impatto netto` micro-labels in the category bar list
- `habitsNote` summary line (surfaced through the habits page instead)

---

### Stats — "Where do I spend and improve?"

Primary purpose: patterns over time, category breakdown, habit discipline, comparison wins.

**Restructure into three explicit sections:**

**Section 1 — Spesa**
- Hero: `Speso davvero` for the selected period (current month, year, or all-time)
- Trend vs average (already present, keep)
- 12-month bar chart (already present, keep)
- Daily heatmap for month view (already present, keep)

**Section 2 — Per categoria**
- Top category of the period (queen card, already present)
- Category bars showing spend + entry count
- Add: `Impatto netto` per category here (moved from dashboard)
- Keep the "Impatto positivo" top-entries list here — it is a stats-level insight, not a
  dashboard headline

**Section 3 — Bilancio sintetico**
- A single compact StatTrio: `Speso` / `Impatto netto` / `Movimenti`
- Move to the bottom of the page (after categories), not the top
- Remove the second StatTrio (`Avresti speso` / `Impatto medio` / `Indice netto`) from the
  primary flow — these belong in a collapsible "Dettagli" expansion or the monthly report
- The `Avresti speso` total is particularly confusing as a page-level headline because it
  conflates avoided reference amounts, comparison reference amounts, and normal spend

**Section 4 — Ricorrenti**
- Keep habit discipline list at the bottom (already present)
- Consider renaming section from "Ricorrenti" to "Disciplina ricorrenti" to clarify it shows
  consistency, not just a list of habits

---

### Monthly Report — "How did this month go?"

Primary purpose: retrospective narrative. One month, full breakdown, member context.

**Keep current structure; make two changes:**

1. **Move `Impatto netto` and `Indice netto` from the overview header into the body.**
   The report header currently shows the same numbers the dashboard shows for the same month.
   The report's unique value is the *breakdown*: who paid, which category led, which entry had
   the most impact. Lead with the narrative summary text (`getSummaryText`) promoted to a larger
   typographic treatment, rather than the numeric overview row.

2. **Promote `Chi ha pagato di più` (member split) higher in the report.**
   This section answers a question specific to the report context (was the month balanced
   between members?) and should appear near the top, not after the overview numbers.

**Keep:** evidenze del mese (best category, best entry), per-category breakdown with filter,
entry list with detail.

---

### Entries — "What did I record and can I fix it?"

The entries page and entry rows are well-structured. No architectural changes recommended.

Two improvements worth noting but not yet implementing:

- Entry rows currently show `Non comprato`, `Risparmiato scegliendo meglio`, and
  `Speso in più del confronto` badges. These are correct. They could benefit from a filter
  chip for each type (separate from the person filter) to let the user answer "show me all
  my avoided purchases".
- The entries header shows `Impatto netto` for the visible month's total. This is correct.
  No change needed.

---

### Goals — "Am I making progress?"

The goals page correctly shows progress bars and impact contributions. No structural change.

One clarification worth making:

- Goals are currently fed by `impatto positivo` (grossPositiveImpact), not `Speso davvero`.
  This should be stated once, clearly, at the top of the goals page. Currently it is implied
  in the empty state but not stated for active goals. Users may not understand why spending
  a lot does not advance a goal.

---

### Habits — "Am I keeping my patterns?"

The habits page shows today's occurrences with their status (spent / avoided / pending).
Stats page shows habit discipline rate. This split is acceptable.

One gap: the habits page does not show cumulative impact over time per habit. Stats shows this
in the "Ricorrenti" section (discipline rate + totalSaved). Consider whether this belongs in
habits or stays in stats. Recommendation: keep in stats; habits page answers "did I do it today?",
stats answers "how consistent am I?".

---

### More — "Tools and settings"

The More page shows: profile, a `StatTrio` with `Impatto netto` + `Movimenti totali`, workspace
links, and feature navigation. The `StatTrio` on More is the most structurally misplaced element
in the app: it surfaces `Impatto netto` and movement count as if they are navigation items, but
they are not actionable here. A user who wants to understand their net impact will go to Stats or
the Dashboard, not More.

**Recommendation:** remove the StatTrio from More. The page should only contain navigation and
tools. Adding a numerical summary to a settings/tools page creates a third place where the same
number appears (alongside Dashboard and Stats), without adding clarity.

---

### Debug / Export

The `/debug` and CSV export remain unchanged. They are not user-facing product surfaces.

---

## 3. Primary / Secondary / Hidden per Page

| Page | Primary | Secondary | Remove or hide |
|---|---|---|---|
| Dashboard | Speso davvero (month), Impatto netto (month) | Saldo condiviso, Streak, Goals | Impatto oggi (strip), per-category impatto netto micro-labels, habitsNote |
| Stats | Speso davvero (period), Per-categoria breakdown | Impatto netto (section footer), Impatto positivo list, Habit discipline | Avresti speso headline, Indice netto from primary flow, Impatto medio from primary flow |
| Monthly Report | Narrative summary, Chi ha pagato, Evidenze del mese | Per-category breakdown, Entry list | Impatto netto / Indice netto from overview header (move to body) |
| Entries | Entry list, today's Impatto netto header | Entry row badges (Non comprato, etc.) | Nothing — structure is correct |
| Goals | Progress bars, closest goal | Impact source note | Nothing structural |
| Habits | Today's occurrence status | Pattern from stats link | Nothing structural |
| More | Navigation links, profile | — | StatTrio (Impatto netto + Movimenti) |

---

## 4. What Should Move from Dashboard to Stats / Report

| Data point | Current location | Recommended location |
|---|---|---|
| Per-category `impatto netto` micro-label | Dashboard category list | Stats per-category section |
| `Impatto oggi` in StatTrio | Dashboard today strip | Daily check-in overlay only |
| `habitsNote` summary line | Dashboard | Habits page |
| Couple balance | Dashboard block 8 | Dashboard block 3 (promote) |

---

## 5. What Should Move from Stats / Report to Debug / Export

| Data point | Current location | Recommended location |
|---|---|---|
| `Avresti speso` (totalAlternativeCost) as primary headline | Stats StatTrio row 2 | Remove from top; keep in CSV export and optionally in a "Dettagli" expansion |
| `Impatto medio` | Stats StatTrio row 2 | Collapsible detail or export only |
| `Indice netto` (savingRatePercent) | Stats + Report header | Move to secondary/collapsible in stats; remove from report header |
| `ordinaryImpact` / `largeComparisonImpact` as raw numbers | Currently only in dashboard footnote and CSV | Keep footnote on dashboard; keep in CSV; do not promote to standalone report or stats cells |

---

## 6. Suggested User-Facing Copy

### Dashboard hero zone copy

```
Speso questo mese          [odometer — primary, full size]
[month] — impatto netto    [secondary, same card]
Grandi confronti: X€       [tertiary footnote, only when >0]
```

### Today strip (2 items, not 3)

```
Speso oggi     X€
Movimenti      N
```

### Couple balance card (promoted position)

```
Bilancio coppia
Devi X€ a [nome]         [you-owe state]
[nome] ti deve X€        [they-owe state]
[hidden when balanced or unsupported]
```

Current copy says "A favore di [nome]" which is oblique. The direct forms above are clearer.

### Stats page section headers

```
Spesa                     [Section 1 — real spend over time]
Per categoria             [Section 2 — breakdown]
Impatto positivo          [Section 2 sub — top avoided/comparison wins]
Bilancio del periodo      [Section 3 footer — compact trio]
Disciplina ricorrenti     [Section 4 — habit rates]
```

### Monthly report narrative

Replace the numeric overview header with a sentence-level summary as the first visible element:

```
[Month]: X€ spesi, [member] ha pagato di più.
Impatto netto: +Y€ | Indice netto: Z%
```

Where the second line is typographically smaller than the narrative sentence, making the
narrative the primary artifact.

### Goals — impact source clarification

Add once, near the page header:

```
Le mete avanzano con l'impatto positivo: cose non comprate e confronti
dove hai speso meno del riferimento.
```

---

## 7. Suggested Progressive Disclosure Rules

### Rule 1 — Large comparison caveat

Show the Grandi confronti footnote on the dashboard **only when**
`largeComparisonImpact > 0` for the current month. Currently implemented. Keep.

Do not surface `ordinaryImpact` as a standalone number on any primary surface. If the user
asks "what would impact be without large comparisons?", the footnote gives the answer
contextually. A second explicit number would add cognitive work, not reduce it.

### Rule 2 — Couple balance

Show `Bilancio coppia` only when:
- The workspace has exactly 2 members, AND
- The current user is one of them, AND
- The balance amount is > 0 (non-zero).

Currently implemented for the last condition. The first two conditions are also implemented
(`supported` flag). Keep all three conditions. When balanced or unsupported, the section
disappears entirely — this is correct.

### Rule 3 — Indice netto

Show `Indice netto` (savingRatePercent) only:
- In a collapsible "Dettagli" section in Stats (not in the primary StatTrio)
- In the Monthly Report body (after the member split, not in the header)
- Never on the Dashboard

Rationale: the denominator of the ratio is `totalAlternativeCost`, which includes the reference
amounts of normal expenses (where `alternativeCost = realCost`). This means the denominator
inflates for workspaces that log primarily normal expenses, making the rate appear lower than
intuition suggests. Showing it at top-level implies it is a definitive performance score, which
it is not.

### Rule 4 — Secondary metric breakdown

`Non comprato`, `Risparmiato scegliendo meglio`, and `Speso in più del confronto` as standalone
aggregate numbers (not per-entry labels):

- On the Dashboard: do not show as standalone aggregate numbers. The `Impatto netto` line already
  captures the net; the breakdown adds noise without context.
- On Stats: show as part of a collapsible "Come si compone l'impatto" sub-section under the
  Bilancio sintetico, toggled off by default.
- On Monthly Report: could appear in "Evidenze del mese" when there are notable entries in each
  category. Already partially implemented via `biggestSaving` and best-category highlights.
- On CSV export: already present as dedicated columns. Keep.

### Rule 5 — Entry-level badges

Row-level badges (`Non comprato`, `Risparmiato scegliendo meglio`, `Speso in più del confronto`)
remain always visible on entry rows. They are already correctly implemented. These are the
right place to surface entry-level intent — they are scoped to a single movement and carry no
risk of being misread as aggregate claims.

---

## 8. Priority Implementation Plan

These are recommendations only. None requires schema or API changes. Each is a UI-only pass.

### Priority 1 — Promote couple balance on dashboard (HIGH, LOW EFFORT)

Change the order of sections in `crafted-dashboard.tsx` so that `coupleBalance` renders
immediately after the quick actions section, before the category breakdown.
Estimated change: move one JSX block, ~5 lines.

Impact: the most actionable interpersonal number becomes immediately visible.

### Priority 2 — Remove `Impatto oggi` from the today StatTrio (MEDIUM, LOW EFFORT)

Remove the middle cell of the today StatTrio, leaving `Speso oggi` and `Movimenti oggi`.
The `Impatto oggi` is already shown in the daily check-in overlay where it has context.
On the main StatTrio it competes with `Speso oggi` and is confusing when negative.
Estimated change: 1 StatTrio item removed, ~8 lines.

### Priority 3 — Remove per-category `impatto netto` micro-labels from dashboard category list (MEDIUM, LOW EFFORT)

The `{category.saved !== 0 ? … impatto netto}` annotation in `crafted-dashboard.tsx` adds
clutter. On the dashboard, the category list answers "where did I spend?", not "was it a good
spend?". Impact analysis belongs in Stats.
Estimated change: remove 5-line conditional block.

### Priority 4 — Remove StatTrio from More page (MEDIUM, LOW EFFORT)

Remove the StatTrio block in `crafted-more.tsx` that shows `Impatto netto` and `Movimenti totali`.
This number has no actionable context on a tools/settings page.
Estimated change: remove 1 StatTrio block, ~15 lines.

### Priority 5 — Move `Avresti speso` / `Impatto medio` / `Indice netto` to collapsible in Stats (MEDIUM, MEDIUM EFFORT)

The second StatTrio in `crafted-stats.tsx` (rows: Avresti speso / Impatto medio / Indice netto)
should be hidden behind a "Mostra dettagli" toggle by default. A new user seeing "Avresti speso
X€" as a large number at the top of Stats will not understand that this is a reference total, not
additional spending.
Estimated change: wrap existing StatTrio in a collapsible component.

### Priority 6 — Monthly report: move numeric overview below narrative (LOW, MEDIUM EFFORT)

Restructure the `crafted-monthly-report-header.tsx` so that the auto-generated `getSummaryText`
narrative is the typographic hero and the `Impatto netto` + `Indice netto` numbers appear below
it in a smaller StatTrio. Currently it is the reverse.
Estimated change: swap two elements in JSX, adjust typography classes.

### Priority 7 — Goals page: add impact-source note (LOW, TRIVIAL EFFORT)

Add a one-line Serif note below the goals page header explaining that goals are fed by
`impatto positivo` (avoided purchases and positive comparisons), not real spend.

---

## 9. Risks and Things Not to Change

### Do not change metric formulas

All metric formulas were validated and tested in Phases 2–4. The recommendations in this
document are purely about which numbers are shown where and at what hierarchy level. No formula
changes are implied.

### Do not change the entry-level badge system

The per-row badges (`Non comprato`, `Risparmiato scegliendo meglio`, `Speso in più del confronto`)
in `crafted-entry-row.tsx` are working correctly and are a key part of the product's legibility.
They should not be removed or consolidated.

### Do not redesign

All recommendations above are achievable by reordering existing sections, removing a few
redundant items, and adjusting one or two labels. None requires new components, new API calls,
schema changes, or visual redesign.

### Do not remove `Indice netto` entirely

`Indice netto` (savingRatePercent) is a useful number for power users who want to understand
their comparison efficiency over time. The recommendation is to move it to a secondary position
(collapsible or below the fold), not to delete it. It should remain accessible in Stats and
in the monthly report body.

### Do not remove `Avresti speso` from export

The `wouldHaveSpent` / `alternativeCost` column remains in the CSV export. This is important for
external analysis. The recommendation only removes it from the primary visual hierarchy on Stats.

### Do not change the couple balance formula

The balance formula (`computeCoupleWorkspaceBalance`) was repaired in Phase 11 and tested in
Phase 12. The recommendations here affect only its placement on the dashboard (promote it higher),
not how it is computed or displayed.

### Risk: promoting couple balance for single-user workspaces

`coupleBalance.supported` is false for single-member workspaces, so the section already hides
itself. Promoting the section's position does not create a risk for non-couple workspaces.

### Risk: removing `Impatto oggi` may reduce daily engagement signal

`Impatto oggi` gives users a quick read on whether today had any positive comparison or avoided
entries. If the engagement feedback from beta testing shows users rely on this number to motivate
daily entries, the removal should be reconsidered. The recommendation is to move it to the daily
check-in overlay (where it already appears with context), not to remove it from the app entirely.
