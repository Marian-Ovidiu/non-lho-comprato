# Phase 18 — UI Accessibility Hardening Notes

**Date:** 2026-06-14
**Scope:** Fix P1 accessibility blockers from Phase 17. UI/aria attributes only. No schema, server action, metric, or visual changes.

---

## What was changed and why

### 1. `FormFieldError` — `id` prop added

**File:** `src/components/shared/form-field-error.tsx`

Added optional `id?: string` prop so callers can write `aria-describedby="..."` on the associated input, pointing to the error `<p>`. Without this, screen readers couldn't link validation errors to their fields.

---

### 2. Entry create form

**File:** `src/components/entries/crafted-entry-form.tsx`

- **Title input**: wrapper div replaced with `<label htmlFor="entry-title">`; input gains `id="entry-title"` + `aria-describedby="entry-title-error"` (conditional); `FormFieldError` gains `id="entry-title-error"`.
- **Date input** (advanced section): crafted `<Label>` span replaced with `<label htmlFor="entry-date" className="...">` (same visual styles); input gains `id="entry-date"` + `aria-describedby` + `aria-invalid`; `FormFieldError` gains `id="entry-date-error"`.
- **Note textarea**: crafted `<Label>` span replaced with `<label htmlFor="entry-note" className="...">` wrapping; textarea gains `id="entry-note"`.
- **Category selector**: container div gains `role="group" aria-label="Categoria"`; each category button gains `aria-pressed={selected}`.
- **Money fields**: were already wrapped in `<label>` by containment — no change needed.

---

### 3. Entry edit form

**File:** `src/components/entries/crafted-entry-edit-form.tsx`

Identical fixes to the create form — title/date/note label associations, error linking, and category button `aria-pressed` + `role="group"`.

---

### 4. Habit form

**File:** `src/components/habits/crafted-habit-form.tsx`

- **Name input**: wrapper div replaced with `<label htmlFor="habit-name">`; input gains `id="habit-name"`, `aria-describedby`, `aria-invalid`; `FormFieldError` gains `id="habit-name-error"`.
- **Category select**: wrapper div replaced with `<label htmlFor="habit-categoryId">`; select gains `id="habit-categoryId"`.
- **Amount input**: wrapper div replaced with `<label htmlFor="habit-amount">`; input gains `id="habit-amount"`, `aria-describedby`; `FormFieldError` gains `id="habit-amount-error"`.
- Weekday checkboxes were already wrapped in `<label>` by containment — no change needed.

---

### 5. Category management

**File:** `src/components/workspace/crafted-category-management.tsx`

**CategoryEditForm:**
- Name label: `htmlFor="edit-cat-name"` → input `id="edit-cat-name"`.
- Icon label: `htmlFor="edit-cat-icon"` → input `id="edit-cat-icon"`.
- Color label: `htmlFor="edit-cat-color"` → input `id="edit-cat-color"`.
- Labels were already native `<label>` elements; they just lacked `htmlFor`.

**CategoryCreateForm:**
- Same pattern: `htmlFor`/`id` pairs added for name (`create-cat-name`), icon (`create-cat-icon`), color (`create-cat-color`).

**CategoryRow buttons:**
- All action buttons now carry contextual `aria-label`:
  - `aria-label={`Modifica categoria ${category.name}`}`
  - `aria-label={`Archivia categoria ${category.name}`}`
  - `aria-label={`Ripristina categoria ${category.name}`}`
  - `aria-label={`Elimina categoria ${category.name}`}`
- Without these, a screen reader would announce multiple "Elimina" buttons with no way to distinguish which category each targets.

---

### 6. Feedback button — type pill `aria-pressed`

**File:** `src/components/feedback/feedback-button.tsx`

Each type pill button (Problema, Consiglio, Non ho capito qualcosa, Altro) gains `aria-pressed={selectedType === value}`. The pills already used a `<fieldset>/<legend>` group — `aria-pressed` completes the toggle semantics.

---

### 7. Desktop nav focus ring

**File:** `src/components/layout/app-shell.tsx`

`DesktopNavLink` Link className gains:

```
focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50
```

This provides a visible keyboard focus indicator for mouse-first users who switch to keyboard navigation.

---

### 8. Quick-add sheet

**File:** `src/components/entries/quick-add-sheet.tsx`

- Date `<Label>Data</Label>` (ShadCN Label, already a real `<label>`) gains `htmlFor="quick-date"`. The matching input already had `id="quick-date"`.
- Preset buttons gain `aria-pressed={isActive}` — communicates the currently selected/applied preset to screen readers.
- The category field already used ShadCN Label with proper `htmlFor="quick-category"` — no change needed.

---

### 9. Preset form

**File:** `src/components/presets/crafted-preset-form.tsx`

- **Title**: wrapper div replaced with `<label htmlFor="preset-title">`; input gains `id="preset-title"`.
- **Category select**: wrapper div replaced with `<label htmlFor="preset-categoryId">`; select gains `id="preset-categoryId"`.
- **Primary amount**: wrapper div replaced with `<label htmlFor="preset-amount">`; input gains `id="preset-amount"`.
- **Comparison amount**: wrapper div replaced with `<label htmlFor="preset-comparison-amount">`; input gains `id="preset-comparison-amount"`.
- All use label-by-containment: the crafted `<Label>` span stays inside the `<label>` and provides the visual text.

---

## Deferred — color-only visualizations

The streak week bar and category chart use color as the sole differentiator. Both are either adjacent to or replaced by text-based information:
- Streak week bar: the individual day labels directly below each bar carry the date context.
- Category chart: each segment is accompanied by category name + amount text.

These bars are candidates for `aria-hidden="true"` + a visually-hidden text summary in a follow-up. No regression was introduced; the visual treatment is unchanged.

---

## Validation results

| Check | Result |
|---|---|
| `npm run lint` | ✓ No errors |
| `npm run typecheck` | ✓ No errors |
| `npm run test` | ✓ 173/173 pass |
| `npm run build` | ✓ Clean Turbopack build |
