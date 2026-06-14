# Phase 20 — Design / Visual Polish Notes

> **Status:** Spec complete — ready for Codex implementation.
> **Scope:** Presentational only. No schema, server-action, metric, or accessibility-semantic changes.
> **Authoring environment note:** This spec + the HTML pixel targets were produced in the NLC *design* project. The code edits and the four validation commands (`lint` / `typecheck` / `test` / `build`) must be executed by Codex/Claude Code against the repo. The "Validation" section below lists exactly what to run; it is **not** claimed as already-run here.

Pixel targets:
- `phase20/Phase 20 - Visual Polish Reference.html` — tokens + 5 priority before→after.
- `phase20/Phase 20 - Light Pass Screens.html` — 6 connected surfaces, after-only.

---

## 0. Thesis

NLC's look is **flat editorial**: full-bleed sections divided by hairline `Rule`s, no card shadows, mono tabular numerals, serif-italic asides, one gold accent on warm black. It is deliberate and good. The weakness is **consistency**, not concept. Two visual dialects coexist:

1. **Editorial-divided** — dashboard, entries, entry form, stats, report, goals. The canonical system.
2. **Card-filled** — quick-add sheet (filled gold segmented control, heavy ring/translate preset cards, drop-shadows) and category management (raw shadcn `Input`/`Button`/`Badge`).

Phase 20 pulls everything onto **one spacing rhythm, one radius logic, one state model**, and nudges dialect (2) toward dialect (1). No new cards, gradients, or shadows beyond true overlays.

---

## 1. Design tokens (additive — append to `app/globals.css` `:root`/`.dark`)

These are **new** semantic tokens layered over the existing scale. Nothing existing is renamed or removed. Tailwind v4: expose via `@theme inline` only if you want utility classes; otherwise reference as `var(--…)` in `style`/`cn` as the codebase already does for `--accent` etc.

```css
:root {
  /* ── spacing rhythm (role-named; 4px base) ── */
  --sp-page-x: 20px;     /* page / section horizontal padding (replaces ad-hoc px-5) */
  --sp-section-y: 22px;  /* vertical padding inside a section block */
  --sp-row-y: 14px;      /* list-row vertical padding (≈ existing py-3.5) */
  --sp-field-y: 14px;    /* hairline form-field vertical padding */
  --sp-stack: 12px;      /* gap between stacked elements */
  --sp-stack-sm: 8px;
  --sp-inline: 10px;     /* gap between inline siblings */

  /* ── radius semantic aliases (over existing 10/14/18/22/28) ── */
  --r-chip: 12px;        /* pills, small toggles */
  --r-control: 14px;     /* inputs, segmented controls */
  --r-cta: 16px;         /* primary buttons — DOWN from 28 (rounded-2xl) */
  --r-card: 18px;        /* grouped cards (sheet sub-cards) */
  --r-sheet: 28px;       /* bottom-sheet top corners */

  /* ── elevation (FLAT app — overlays only) ── */
  --shadow-none: none;
  --shadow-sheet: 0 -24px 70px rgba(0,0,0,0.42);  /* quick-add bottom sheet */
  --shadow-pop: 0 14px 40px rgba(0,0,0,0.34);     /* dialogs / toasts */

  /* ── state ── */
  --state-press: 0.965;                  /* active scale (already used by .nlc-press) */
  --state-hover: rgba(244,241,234,0.04);
  /* focus ring already exists: focus-visible:ring-2 ring-ring/50 — KEEP */
}
```

**Mapping rules (apply consistently):**
- Page/section horizontal padding → `--sp-page-x` (was `px-5`, already 20px — make it the single source).
- List rows (`CraftedEntryRow`, dashboard recents, category rows, member splits) → `--sp-row-y`.
- Hairline fields (`.field` pattern in entry form) → `--sp-field-y`.
- **All primary buttons → `--r-cta` (16).** Today: entry-form CTA, dashboard "Aggiungi movimento", quick-add CTA use `rounded-2xl` = 28. Calm them to 16. Keep height (54 / 44).
- Pills/badges → `--r-chip` / `rounded-full`. Inputs/segmented → `--r-control`. Sheet → `--r-sheet`.
- **Shadows:** remove any non-overlay shadow. Keep exactly two — `--shadow-sheet` on the quick-add sheet, `--shadow-pop` on dialogs/toasts.

---

## 2. Per-area before → after

### 2.1 Dashboard — hero hierarchy  ·  `src/components/dashboard/crafted-dashboard.tsx`
| Item | Before | After |
|---|---|---|
| Hero gap | label `mb-4` (16px) | `mb-3` (12px); amount baseline-aligned to sparkline |
| Secondary row | impatto-netto + Δ wrap awkwardly | one baseline row; Δ as a **right-aligned muted pill** (`−38,10€ vs aprile`), never wraps under |
| Sparkline | cramped "6 mesi" caption | +1 baseline gridline; caption gets `--sp-stack-sm` |
| Rhythm | mixed `pt-5/pb-5/mt-4/mt-3` | uniform `--sp-page-x 20` / `--sp-section-y 22`; stacks 12 |
| CTA | `rounded-2xl` (28) | `--r-cta` (16) |

Keep: couple balance at **position 3** (Phase 14); StatTrio content; the serif "la spesa reale viene prima." line; all labels/wording.

### 2.2 Entry list — row readability  ·  `src/components/entries/crafted-entry-row.tsx`
| Item | Before | After |
|---|---|---|
| Tap height | `py-3.5`, tight stack | `--sp-row-y 14` top+bottom → ≥48px hit area |
| Badge | pill `px-2 py-0.5` | `px-[9px] py-[3px]`, weight 500, tracking 0.12em |
| Comparison detail | crowds badge on narrow widths | wraps to its **own line** under the badge (`flex-wrap`) |
| Meta | mono 11, tight | line-height +1; icon locked `text-muted-foreground` |
| Amount | € superscript drifts | € baseline-aligned (`vertical-align`) |

Keep: `nlc-press`, `focus-visible:ring`, `calculateEntryMetrics` call (metric logic untouched), all wording.

### 2.3 Bottom nav  ·  `src/components/layout/crafted-bottom-bar.tsx`
| Item | Before | After |
|---|---|---|
| Item radius | mixed `rounded-2xl` | unify `--r-card` (18) |
| Gold dot | `bottom-1.5` | locked 7px offset, 16×4 pill (slide already wired via `.nlc-tab-dot`) |
| FAB (quick-add trigger) | 38px | **40px** target, 1.5px accent ring |
| Safe area | uneven | `env(safe-area-inset-bottom)` + 16 baseline |

Keep: `aria-current`, `aria-label="Navigazione principale"`, focus ring, `triggerHaptic("subtle")`.

### 2.4 Entry create/edit — form polish  ·  `src/components/entries/crafted-entry-form.tsx`
| Item | Before | After |
|---|---|---|
| **Large-comparison warning** | `text-amber-700 dark:text-amber-300` — **off-palette** | in-palette **warm note** (accent-tinted border+bg), consistent dark/light |
| Field rhythm | mixed padding | every hairline field on `--sp-field-y 14`, mono label right-aligned |
| Intent tabs | underline-accent (canonical) | keep; ensure `min-h-12` (48) targets |
| CTA | `rounded-2xl` (28), 54px | `--r-cta` (16), 54px held |
| Disclosures | chevron + spacing varies | standardize rotation + gap |

Keep (critical — Phase 7 + Phase 18): three intents `Ho speso` / `Speso + confronto` / `Non l'ho comprato`; `aria-pressed` on intent buttons; `aria-label="Ho speso e voglio confrontarlo"`; `<label htmlFor>` + `id` on title/date/note; `aria-describedby` error links; `aria-invalid`. **The amber→warm change is the one true bug fix here** — it's the only off-palette color in the form.

### 2.5 Workspace categories  ·  `src/components/workspace/crafted-category-management.tsx`
| Item | Before | After |
|---|---|---|
| Inputs | shadcn boxed `Input` | `--r-control 14`, `surface-muted` fill, 1px line, accent focus ring |
| Badges | shadcn `Badge` | editorial pill (Default/Personalizzata = muted; Archiviata = warm) |
| Action links | mixed underline sizes | one size 13 / icon 14, even gap; destructive in `--destructive` |
| Row rhythm | `py-3.5` | `--sp-row-y 14`, soft rule between; section labels use crafted `Label` |

Keep: every flow — create / edit / archive / restore / delete + `window.confirm` dialogs — functionally identical; owner-only gating; `aria-label` on each row action; `getWorkspaceCategories`/`createCategory`/etc. server actions **untouched**.

### 2.6 Quick-add sheet  ·  `src/components/entries/quick-add-sheet.tsx`  (light)
- Intent control: **filled gold segmented → hairline-bordered group + accent underline** on active (mirror entry form).
- Preset tiles: drop `ring-1 ring-primary/20 -translate-y-px bg-primary/8` → 1px `line` on `surface`, `--r-card 18`, quiet press only.
- Sheet: top radius `--r-sheet 28`, single `--shadow-sheet`.
- Header workspace chip → editorial pill; "Aggiunta rapida" → mono `Label`.
- **Unchanged:** presets logic, undo toast (`useToast`/`deleteEntry`), optimistic close, `aria-pressed`, `createEntry`.

### 2.7 Stats  ·  `src/components/stats/crafted-stats.tsx`  (light)
- "Dettagli del periodo" `<details>` gets a clear chevron-row affordance, **stays collapsed** (Phase 14).
- Chart columns: even baseline + one gap, `.nlc-grow-y` on mount.
- Category bars: `ProgressLine` + `.nlc-grow-x`.
- Uniform `--sp-section-y`. "Impatto netto" label kept (Phase 6).

### 2.8 Monthly report  ·  `src/components/reports/crafted-monthly-report-*.tsx`  (light)
- Serif lede at full weight, ~32em measure, `text-wrap:pretty`.
- Numeric StatTrio stays inside "Riepilogo del mese" `<details>`, collapsed (Phase 14).
- Member split: even rows, mono amounts right, soft rules.

### 2.9 Goals & Habits  ·  `src/components/goals/crafted-goals.tsx`, `src/components/habits/*`  (light)
- One `ProgressLine` treatment; rows on `--sp-row-y`; aligned icons.
- Phase 14 goals impact note retained at top.
- Habits "Evitata" check uses `.nlc-check-draw`; 4/4 celebration unchanged.

### 2.10 Feedback dialog  ·  `src/components/feedback/feedback-button.tsx`  (light)
- Type selector → editorial pill row; textarea → `surface-muted` + `--r-control` + accent focus ring; CTA → `--r-cta`.
- **Unchanged:** `submitFeedback`, hidden context fields, 1.4s success auto-close.

### 2.11 Empty states  ·  `src/components/**/*empty*`  (light)
- One template: mono `Label` · serif headline · muted one-liner · single `cta-outline`. Centered, ~64px vertical rhythm, ~28em measure. No illustrations. Honest, specific copy (no generic "Nessun dato").

---

## 3. Notes for Codex — what to touch / what to avoid

**Files in scope (presentational edits only):**
```
app/globals.css                                              (append tokens §1)
src/components/dashboard/crafted-dashboard.tsx
src/components/dashboard/couple-balance-card.tsx             (radius/rhythm only)
src/components/entries/crafted-entry-row.tsx
src/components/entries/crafted-entry-list.tsx                (row rhythm)
src/components/entries/crafted-entry-form.tsx                (incl. amber→warm fix)
src/components/entries/quick-add-sheet.tsx
src/components/layout/crafted-bottom-bar.tsx
src/components/workspace/crafted-category-management.tsx
src/components/stats/crafted-stats.tsx
src/components/reports/crafted-monthly-report-detail.tsx
src/components/reports/crafted-monthly-report-header.tsx
src/components/goals/crafted-goals.tsx
src/components/habits/*                                       (progress/rhythm)
src/components/feedback/feedback-button.tsx
components/crafted/*                                          (only if a primitive needs the new token; prefer Tailwind classes referencing var(--…))
```

**Hard "do NOT touch" list:**
- `prisma/schema.prisma`, any migration — **no schema changes**.
- Anything in `src/actions/**` — **no server-action changes**.
- `src/lib/entry-metrics.ts` and its tests — **metric formulas locked**.
- `src/lib/workspace-balance.ts`, category server actions — **no logic/behavior changes**.
- **Do not remove or weaken any Phase 18 a11y attribute**: `<label htmlFor>`+`id`, `aria-pressed`, `aria-describedby`, `aria-label`, `aria-current`, `aria-invalid`, `focus-visible:ring`. You may restyle a label; you may not change its HTML role.
- **Do not undo Phase 14 IA**: dashboard simplified; couple balance promoted to position 3; More = tools/settings only; Stats "Dettagli del periodo" collapsed; report numeric "Riepilogo del mese" collapsed; goals impact note present.
- Do not rename core concepts (`Speso davvero`, `Non comprato`, `Impatto netto`, intents, etc.).
- No new npm dependencies. No new features, pages, or data flows.

**Implementation order (lowest risk first):**
1. `globals.css` tokens (§1) — verify build, zero visual change.
2. CTA radius sweep `rounded-2xl → --r-cta` across form/dashboard/quick-add.
3. Entry row + list rhythm.
4. Dashboard hero rhythm + Δ pill.
5. Entry form amber→warm fix + field rhythm.
6. Bottom nav tune.
7. Category management → editorial inputs/pills/links.
8. Light pass: quick-add → editorial, then stats / report / goals-habits / feedback / empty states.

Commit per area. After each, check `prefers-reduced-motion` ON/OFF — content must stay fully visible (the existing reduced-motion CSS already guarantees this for `.nlc-*`).

---

## 4. Validation (Codex must run before marking complete)

```
npm run lint
npm run typecheck
npm run test      # entry-metrics golden tests MUST stay green (proves no metric drift)
npm run build
```

Because Phase 20 is presentational, `npm run test` passing is the proof that no metric/logic regressed. If any metric test changes, something out of scope was touched — revert it.

---

## 5. Confirmation of constraints

This pass, as specified, changes **only** spacing, radius, color-token usage, typography rhythm, and component visual consistency. It does **not** change: database schema, Prisma models/migrations, server actions, metric formulas or financial calculations, shared-balance logic, category behavior/actions, Phase 18 accessibility semantics, Phase 14 information architecture, or core concept names. One genuine fix is included and is purely visual: the entry-form large-comparison warning moves from off-palette `amber-700/300` to an in-palette warm note.

## 6. Risks / follow-ups

- **CTA radius change is the most visible delta** (28→16). If the team prefers the rounder look, keep `--r-cta: 20` — but pick one value and apply it everywhere.
- **Quick-add reconciliation** is the largest single diff; ship it as its own commit/PR so it can be reviewed and reverted independently.
- **Category management inputs**: if replacing shadcn `Input` wholesale is too invasive, the minimum viable fix is restyling via `className` (rounded-`--r-control`, `bg-surface-muted`, `border-line`) — no component swap required.
- Light theme: tokens are dark-first but flow through CSS vars, so the light theme inherits the rhythm/radius automatically. Spot-check the warm-note and pill colors in light mode.
- Not in scope (later phases): Web Push (21), account deletion (22), feedback rate-limiting (23), monitoring (24), onboarding refinement (25).