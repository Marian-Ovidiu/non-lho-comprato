# Phase 20 — Before → After Checklist

Track per area. Check a box when the visual matches the pixel target and the area's "keep" list is intact. Code lands in Codex; this is the design acceptance list.

Targets: `Phase 20 - Visual Polish Reference.html` (1–5) · `Phase 20 - Light Pass Screens.html` (6–11).

---

## Tokens (foundation)
- [ ] `--sp-*` spacing rhythm appended to `globals.css` `:root`/`.dark`
- [ ] `--r-*` radius aliases appended
- [ ] `--shadow-sheet` / `--shadow-pop` defined; all non-overlay shadows removed
- [ ] Build green, **zero** visual change from token addition alone

## 1 · Dashboard hero  ·  `crafted-dashboard.tsx`
- [ ] Label→hero gap `mb-4` → `mb-3`
- [ ] impatto-netto + Δ on one baseline row; Δ = right-aligned muted pill, no wrap-under
- [ ] Sparkline baseline gridline + caption breathing room
- [ ] Uniform `--sp-page-x 20` / `--sp-section-y 22`
- [ ] CTA radius 28 → 16
- [ ] **Keep:** couple balance pos 3 · StatTrio content · serif line · wording

## 2 · Entry row  ·  `crafted-entry-row.tsx`
- [ ] Row padding `--sp-row-y 14` → ≥48px hit area
- [ ] Badge `px-[9px] py-[3px]`, weight 500
- [ ] Comparison detail wraps to own line under badge
- [ ] Meta line-height +1; € baseline-aligned
- [ ] **Keep:** `nlc-press` · focus ring · `calculateEntryMetrics` · wording

## 3 · Bottom nav  ·  `crafted-bottom-bar.tsx`
- [ ] Item radius unified `--r-card 18`
- [ ] Gold dot 7px offset, 16×4
- [ ] FAB 38 → 40px
- [ ] Even safe-area padding
- [ ] **Keep:** `aria-current` · `aria-label` · focus ring · haptic

## 4 · Entry form  ·  `crafted-entry-form.tsx`
- [ ] **amber-700/300 warning → in-palette warm note** (the real bug fix)
- [ ] Hairline fields on `--sp-field-y 14`, mono label right
- [ ] Intent tabs `min-h-12` (48) targets
- [ ] CTA radius 28 → 16
- [ ] **Keep:** 3 intents · `aria-pressed` · `aria-label` · `<label htmlFor>`+`id` · `aria-describedby` · `aria-invalid`

## 5 · Categories  ·  `crafted-category-management.tsx`
- [ ] Inputs → `--r-control 14` + surface-muted + line + accent focus
- [ ] Badges → editorial pills
- [ ] Action links one size 13 / icon 14; destructive token
- [ ] Rows `--sp-row-y 14` + soft rule; section `Label`
- [ ] **Keep:** create/edit/archive/restore/delete + confirms · owner gating · row `aria-label` · server actions

## 6 · Quick-add  ·  `quick-add-sheet.tsx`
- [ ] Intent: filled gold → hairline group + accent underline
- [ ] Preset tiles: line on surface, `--r-card 18`, quiet press
- [ ] Sheet `--r-sheet 28` + `--shadow-sheet`
- [ ] Header chip → pill; "Aggiunta rapida" → mono Label
- [ ] **Keep:** presets · undo toast · optimistic flow · `aria-pressed` · `createEntry`

## 7 · Stats  ·  `crafted-stats.tsx`
- [ ] "Dettagli del periodo" chevron affordance, stays collapsed
- [ ] Chart columns even + `.nlc-grow-y`
- [ ] Category bars `ProgressLine` + `.nlc-grow-x`
- [ ] **Keep:** Phase 14 collapse · "Impatto netto" wording

## 8 · Monthly report  ·  `crafted-monthly-report-*.tsx`
- [ ] Serif lede full weight, ~32em, `text-wrap:pretty`
- [ ] StatTrio stays in "Riepilogo del mese" `<details>`, collapsed
- [ ] Member split even rows + soft rules
- [ ] **Keep:** Phase 14 narrative-primary · wording

## 9 · Goals & Habits  ·  `crafted-goals.tsx`, `habits/*`
- [ ] One `ProgressLine` treatment
- [ ] Rows `--sp-row-y`, aligned icons
- [ ] **Keep:** goals impact note · `.nlc-check-draw` · 4/4 celebration

## 10 · Feedback dialog  ·  `feedback-button.tsx`
- [ ] Type selector → pill row
- [ ] Textarea surface-muted + `--r-control` + accent focus
- [ ] CTA radius 16
- [ ] **Keep:** `submitFeedback` · context fields · success auto-close

## 11 · Empty states  ·  `**/*empty*`
- [ ] One template: Label · serif headline · muted line · `cta-outline`
- [ ] Centered, ~64px rhythm, ~28em measure, no illustrations
- [ ] Honest specific copy
- [ ] Reused across dashboard/entries/stats/goals

---

## Final gate (Codex)
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test` (entry-metrics golden tests green = no metric drift)
- [ ] `npm run build`
- [ ] `prefers-reduced-motion` ON/OFF spot-check
- [ ] Light-theme spot-check (warm note + pills)
