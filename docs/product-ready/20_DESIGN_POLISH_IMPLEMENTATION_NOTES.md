# Phase 20 — Design Polish Implementation Notes

**Date:** 2026-06-14
**Status:** Complete

## Files changed

- `app/globals.css`
- `components/crafted/motion/toast-provider.tsx`
- `components/ui/button.tsx`
- `src/components/dashboard/crafted-dashboard.tsx`
- `src/components/dashboard/crafted-dashboard-empty-state.tsx`
- `src/components/dashboard/dashboard-quick-actions.tsx`
- `src/components/entries/crafted-entry-row.tsx`
- `src/components/entries/crafted-entry-list.tsx`
- `src/components/entries/crafted-entry-form.tsx`
- `src/components/entries/crafted-entry-edit-form.tsx`
- `src/components/entries/quick-add-sheet.tsx`
- `src/components/layout/crafted-bottom-bar.tsx`
- `src/components/workspace/crafted-category-management.tsx`
- `src/components/stats/crafted-stats.tsx`
- `src/components/stats/crafted-stats-empty-state.tsx`
- `src/components/reports/crafted-monthly-report-header.tsx`
- `src/components/reports/crafted-monthly-report-detail.tsx`
- `src/components/goals/crafted-goals.tsx`
- `src/components/goals/crafted-goals-empty-state.tsx`
- `src/components/habits/crafted-habits-empty-state.tsx`
- `src/components/feedback/feedback-button.tsx`
- `docs/product-ready/02_EXECUTION_CHECKLIST.md`
- `docs/product-ready/20_DESIGN_POLISH_IMPLEMENTATION_NOTES.md`

## Surfaces polished

- Dashboard hierarchy: hero spacing, monthly delta pill, recent-entry row rhythm, primary CTA radius, quick action card radius and shadow removal.
- Entry row readability: consistent row hit area, badge padding/weight, detail wrapping, metadata line-height, euro baseline alignment.
- Bottom nav/app shell: unified item radius, active indicator offset, quick-add FAB target size, safe-area baseline.
- Create/edit entry UX: hairline field rhythm, calmer CTA radius, in-palette warm large-comparison warning, disclosure spacing preserved.
- `/workspace/categories`: editorial input styling, muted/warm pills, row rhythm, action link sizing, calmer buttons.
- Light consistency pass: quick-add sheet, stats collapsed details affordance, monthly report collapsed summary affordance and narrative measure, goals row rhythm, feedback dialog fields/CTA, empty-state CTA radius and vertical rhythm.

## Tokens/classes added

- Added Phase 20 semantic tokens in `app/globals.css`:
  - spacing: `--sp-page-x`, `--sp-section-y`, `--sp-row-y`, `--sp-field-y`, `--sp-stack`, `--sp-stack-sm`, `--sp-inline`
  - radius: `--r-chip`, `--r-control`, `--r-cta`, `--r-card`, `--r-sheet`
  - elevation/state: `--shadow-none`, `--shadow-sheet`, `--shadow-pop`, `--state-press`, `--state-hover`
- Reused Tailwind arbitrary value classes referencing those tokens, e.g. `rounded-[var(--r-cta)]`, `py-[var(--sp-row-y)]`, `shadow-[var(--shadow-sheet)]`.
- Added local category management class constants for editorial input and button styling.

## Constraint confirmation

- No database schema, Prisma model, or migration files changed.
- No server action logic changed.
- No metric formulas, financial calculations, shared balance logic, category behavior, or category server actions changed.
- Phase 18 accessibility semantics were preserved: real labels, `aria-describedby`, `aria-pressed`, contextual `aria-label`, `aria-current`, `aria-invalid`, and focus-visible states remain in the touched surfaces.
- Phase 14 information architecture was preserved: dashboard remains simplified, couple balance remains promoted before categories, Stats and report secondary details remain collapsed by default, and goals impact note remains present.
- No dependencies added.
- No new product features, pages, data flows, or renamed core concepts.

## Validation

- `npm run lint` ✓
- `npm run typecheck` ✓
- `npm run test` ✓ (173/173 passing)
- `npm run build` ✓

## Deferred visual polish items

- Some lower-priority surfaces still use older card/shadow styling outside the Phase 20 priority scope, such as workspace switcher, daily check-in overlay, heatmap popover, older dashboard preview cards, and some form pages outside entry create/edit.
- Habit card dropdown and habit form CTA radius can be brought fully onto the Phase 20 tokens in a later focused habit polish pass.
- Monthly report legacy non-crafted selector components still contain older `shadow-sm` styling and can be reconciled if those components remain in active use.
