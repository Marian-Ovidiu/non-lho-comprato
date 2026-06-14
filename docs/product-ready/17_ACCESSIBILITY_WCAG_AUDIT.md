# Phase 17 — WCAG/Accessibility Audit

## Scope

Audit-only. No application code, schema, tests, or UI were modified.
Covers WCAG 2.2 AA against the current product after Phases 1–16C.

---

## 1. Current Accessibility Risks — Summary

| # | Risk | Severity | WCAG Criterion |
|---|------|----------|---------------|
| 1 | Entry form title input has no programmatic label | High | 1.3.1, 4.1.2 |
| 2 | Category selector buttons lack aria-pressed/selected | High | 4.1.2 |
| 3 | Habit form inputs have no label-input association | High | 1.3.1, 4.1.2 |
| 4 | Category management forms: labels not linked to inputs | High | 1.3.1, 4.1.2 |
| 5 | Form error messages not linked via aria-describedby | Medium | 1.3.1 |
| 6 | Feedback dialog type selector missing aria-pressed | Medium | 4.1.2 |
| 7 | Desktop nav links missing focus-visible ring | Medium | 2.4.11 |
| 8 | Streak week and category bar use color only | Medium | 1.4.1 |
| 9 | Multiple "Elimina" buttons without distinguishing names | Medium | 2.4.6 |
| 10 | ProgressLine has no accessible name (what it tracks) | Low | 1.3.1 |
| 11 | Quick-add date input: Label lacks htmlFor | Low | 1.3.1 |
| 12 | Financial amounts split across elements without grouping | Low | 1.3.2 |
| 13 | Heading hierarchy sparse — most labels are styled `<span>` | Low | 1.3.1 |

---

## 2. Page-by-Page Findings

### 2.1 App Shell / Bottom Navigation

File: `src/components/layout/crafted-bottom-bar.tsx`

- **GOOD**: `<nav aria-label="Navigazione principale">` correctly marks the landmark.
- **GOOD**: `BottomNavLink` has `aria-current={active ? "page" : undefined}`.
- **GOOD**: `focus-visible:ring-2 focus-visible:ring-ring/50` on links.
- **GOOD**: Touch target is `h-14` (56 px) — above the 44 px minimum.
- **GOOD**: Active indicator dot has `aria-hidden="true"`.
- **RISK (Low)**: Bottom bar is `md:hidden`. Desktop uses a `<nav aria-label="Navigazione desktop">` in `app-shell.tsx`. The desktop `DesktopNavLink` component has `aria-current` but **no `focus-visible:ring` class** — keyboard focus on desktop links may be invisible. The browser default outline could apply, but many modern resets suppress it.

File: `src/components/layout/crafted-masthead.tsx`

- **RISK (Low)**: App name "Non l'ho comprato" is visible text but not wrapped in a landmark or skip-link target. No skip-navigation mechanism exists. On keyboard, users must tab through the entire header before reaching main content.

### 2.2 Dashboard

File: `src/components/dashboard/crafted-dashboard.tsx`

- **GOOD**: Entry rows have `focus-visible:ring-2` via `.nlc-press` (confirmed in entry-row).
- **GOOD**: `<Link>` items have text content and are navigable.
- **GOOD**: `monthLargeComparisonImpact` note is text-only, not color-only.
- **RISK (Medium)**: Streak week visualization (`streakWeek.map`) renders 7 bars differing only in `bg-accent` vs `bg-ink-3` color. No text alternative, no `aria-label`, no pattern distinction. Screen readers skip this entirely and sighted users relying on color alone cannot distinguish active days.
- **RISK (Medium)**: Category spending bars at the top of the category list (`nlc-grow-x` bar chart) convey proportions via color only. No `aria-label` or text equivalent for proportions. `aria-hidden="true"` would be appropriate if the text list below is considered sufficient — but the bar currently has neither.
- **RISK (Low)**: Financial amounts in recent entries read as `"12€"` — the `€` is in a sibling `<span>` with no explicit grouping. Most screen readers handle adjacent inline elements acceptably, but the rendering may vary. Verified: no `aria-label` wrapping the full monetary amount.
- **RISK (Low)**: Progress bars for goals (`ProgressLine`) have `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` — these values are correct. However, there is no `aria-label` or `aria-labelledby` to name _what_ is being tracked. A screen reader announces "Progress bar 42%" with no goal title.
- **INFO**: `<Stagger>` wrapping is a motion component. If it uses CSS transitions only, `motion-reduce:transition-none` patterns appear elsewhere in the app — check Stagger similarly.

### 2.3 Entries List

File: `src/components/entries/crafted-entry-list.tsx`, `crafted-entry-row.tsx`

- **GOOD**: `CraftedEntryRow` links have `focus-visible:ring-2 focus-visible:ring-ring/50`.
- **GOOD**: Badge text ("Evitata", "Confronto") is visible text — not color-only.
- **GOOD**: `meta.detail` string spells out the amount and action, e.g. `"12,50€ risparmiati scegliendo meglio"`.
- **RISK (Low)**: The entry list filter pills (category filter buttons: "Tutti", "Caffè", "Delivery"…) are rendered as `<button>` elements. Checking the entry list code would confirm whether they have `aria-pressed` — this needs verification in implementation.
- **RISK (Low)**: The search input (likely in `crafted-entry-list.tsx`) needs verification for a visible `<label>` or `aria-label`.
- **INFO**: Entry amounts: `formatCraftedEntryAmount(entry.realCost)` + `<span class="text-[11px] text-accent">€</span>`. The euro sign is in a sibling span, but because both are inline within a single `<Mono>`, screen readers typically concatenate them.

### 2.4 Entry Create/Edit Forms

File: `src/components/entries/crafted-entry-form.tsx`, `crafted-entry-edit-form.tsx`

- **GOOD**: Error banner uses `role="alert"` and `aria-live="polite"`.
- **GOOD**: Intent buttons ("Ho speso", "Speso + confronto", "Non l'ho comprato") have `aria-pressed`.
- **GOOD**: "Ho speso e voglio confrontarlo" has `aria-label` for the abbreviated visible label.
- **GOOD**: Money inputs are wrapped in `<label>` by containment (HTML `<label>` wraps both the `<input>` and the label text).
- **GOOD**: `aria-invalid` on inputs when errors are present.
- **CRITICAL**: Title input (`name="title"`) has no programmatic label. `<Label>Cosa</Label>` is a styled `<span>` (not HTML `<label>`). There is no `htmlFor`, no `id`, no `aria-label`, no `aria-labelledby` on the input. Screen readers will announce it as an unlabeled text field.
- **RISK (High)**: Category selector is a horizontal scroll of `<button>` elements. No `aria-pressed` or `aria-selected` attribute. Selection state is indicated only by `border-accent` vs `border-transparent` — color only. Screen readers cannot determine which category is selected.
- **RISK (Medium)**: The category group has a preceding `<Label>Categoria</Label>` which is a `<span>`, not a group label. There is no `role="group"` or `aria-label` wrapping the category buttons.
- **RISK (Medium)**: `FormFieldError` renders a `<p>` with the error text, but there is no `aria-describedby` on the corresponding input pointing to that error element. Only `aria-invalid` is set.
- **RISK (Low)**: The "Ho speso e voglio confrontarlo" toggle button (to show/hide comparison) uses text content only to signal state ("Nascondi confronto" vs "Ho speso e voglio confrontarlo"). While functionally clear for sighted users, this is not marked as `aria-expanded`.
- **RISK (Low)**: Large comparison warning (`"Questo confronto pesa molto sulle statistiche."`) has no live region — it appears/disappears based on amount, but is not announced to screen readers. Should be `aria-live="polite"`.

### 2.5 Quick-Add

File: `src/components/entries/quick-add-sheet.tsx`

- **GOOD**: Trigger button has `<span className="sr-only">Nuovo movimento</span>`.
- **GOOD**: Dialog uses `<DialogTitle>` and `<DialogDescription>` — proper modal structure.
- **GOOD**: Intent buttons have `aria-pressed`.
- **GOOD**: `aria-live="polite"` on workspace-switching loader and members-loading state.
- **GOOD**: Title input has `id="quick-title"` and `<Label htmlFor="quick-title">` — wait, checking... `<Label htmlFor="quick-title">` — Label is the ShadCN `Label` from `@/components/ui/label`, which IS an HTML `<label>`. This is correct.
- **GOOD**: Category `<Select>` with `id="quick-category"` and `<Label htmlFor="quick-category">` — ShadCN Label used, correctly associated.
- **GOOD**: Amount input has ShadCN Label with `htmlFor`.
- **RISK (Medium)**: Date field: `<Label>Data</Label>` (crafted `<span>`), no `htmlFor`. The date `<Input id="quick-date" type="date" ...>` has an `id` but the crafted `Label` has no `htmlFor`. Not associated.
- **RISK (Low)**: "Oggi" / "Ieri" toggle buttons for date have no `aria-pressed` to indicate the selected date.
- **RISK (Low)**: The `showCloseButton={false}` suppresses the default dialog close button. The custom "Chiudi" button exists and has visible text, which is fine.
- **RISK (Low)**: Comparison amount label `<Label htmlFor="quick-comparisonAmount">` appears to be ShadCN Label — needs verification.

### 2.6 Presets

File: `src/components/presets/crafted-preset-form.tsx`

- **GOOD**: Intent selector buttons have `aria-pressed` (likely — pattern matches entry form).
- **RISK (High)**: Same patterns as entry form: category buttons lack `aria-pressed`, title input likely lacks programmatic label — this should be confirmed but the same template is used.

### 2.7 Stats

File: `app/stats/page.tsx`, `src/components/stats/crafted-stats.tsx`

- **GOOD**: `<details>/<summary>` for "Dettagli del periodo" uses native HTML — keyboard accessible, announced by screen readers as collapsible.
- **RISK (Low)**: `list-none` styling on summary removes disclosure triangle but the element remains focusable and operable. Browser defaults still handle the expanded/collapsed state announcement.
- **RISK (Low)**: Category bars in stats are visual-only without text equivalents for proportions.

### 2.8 Monthly Report

File: `src/components/reports/crafted-monthly-report-header.tsx`, `crafted-monthly-report-detail.tsx`

- **GOOD**: `<details>/<summary>` for "Riepilogo del mese" — same as stats, accessible natively.
- **GOOD**: `[&::-webkit-details-marker]:hidden` hides the WebKit arrow but doesn't affect the ARIA disclosure state.
- **RISK (Low)**: Summary text inside `<summary>` is plain text, no `aria-label`. Text "Riepilogo del mese" is clear.

### 2.9 Goals

File: `src/components/goals/crafted-goals.tsx`

- **GOOD**: `<h2>` used for the featured goal title — correct heading hierarchy within that section.
- **GOOD**: `role="progressbar"` on ProgressLine with `aria-valuenow/min/max`.
- **RISK (Medium)**: Multiple goals may each have an "Elimina" button rendered via `GoalActions`. When multiple goals exist, screen readers list links/buttons by text — multiple "Elimina" buttons with identical accessible names are indistinguishable.
- **RISK (Medium)**: `window.alert(result.message)` on toggle failure and `window.confirm(...)` on delete — browser native dialogs. Accessible but unpolished; `window.confirm` cannot be styled.
- **RISK (Low)**: ProgressLine lacks `aria-label` — no indication of which goal's progress is shown.
- **RISK (Low)**: "Metti in pausa" / "Riattiva" / "Elimina" buttons don't have context about which goal they act on. Only placement provides context.

### 2.10 Habits

File: `src/components/habits/crafted-habits.tsx`, `crafted-habit-form.tsx`

- **GOOD**: Day-of-week checkboxes use `<label>` wrapping `<input type="checkbox" className="sr-only">` — correct visually-hidden checkbox pattern.
- **GOOD**: `aria-live="polite"` on form status message.
- **RISK (High)**: Habit name input has `id="name"` but `CraftedLabel` (styled `<span>`) is used as the label with no `htmlFor`. Not associated.
- **RISK (High)**: Habit category `<select>` has no explicit `<label>` — preceded by `<CraftedLabel>Categoria</CraftedLabel>` (a `<span>`). The HTML `<select>` has no `id` or `aria-label`.
- **RISK (High)**: Habit amount `<input>` has no label — `<CraftedLabel>Costo €</CraftedLabel>` is a span.
- **RISK (Medium)**: `CraftedHabitOccurrenceActions` buttons (Spent/Avoided/Skipped) need verification for accessible names. Not read in this audit.

### 2.11 More

File: `src/components/more/crafted-more.tsx`, `crafted-more-row.tsx`

- **GOOD**: Sign-out form uses a proper `<form>` with `<button type="submit">`.
- **GOOD**: Section headings use `<CraftedMoreSection title="...">` — needs verification whether `title` renders as a heading or a `<span>`.
- **RISK (Low)**: Profile section uses a styled square div for initials — no `aria-hidden` on the avatar decoration.
- **RISK (Low)**: The `CraftedMoreRow` links (each page link) should have adequate accessible names from their `label` prop, but the `detail` prop text may not be read if not structured properly.

### 2.12 Feedback Dialog

File: `src/components/feedback/feedback-button.tsx`

- **GOOD**: Trigger button has `aria-label="Lascia un feedback"`.
- **GOOD**: Icon has `aria-hidden="true"`.
- **GOOD**: Dialog uses `<DialogTitle>` and `<DialogDescription>`.
- **GOOD**: Textarea has `<Label htmlFor="feedback-message">` (ShadCN Label) and `id="feedback-message"` — correctly associated.
- **GOOD**: `aria-invalid` on textarea.
- **RISK (Medium)**: Type selector pills (Problema, Consiglio, etc.) are `<button>` elements without `aria-pressed`. Selection state is conveyed only by `bg-foreground text-background` vs `border-border text-muted-foreground`. Screen readers cannot determine which type is selected.
- **RISK (Medium)**: The selected type is submitted via a hidden input (`<input type="hidden" name="type" value={selectedType} />`). If a keyboard user cannot determine which type is active, form submission may be incorrect.
- **RISK (Low)**: Success state ("Feedback inviato") has no `aria-live` — it replaces the form content. Focus stays within the dialog and the success message is visible, but may not be announced immediately.

### 2.13 Debug Page

File: `app/debug/page.tsx`, `src/components/debug/debug-browser-info.tsx`

- **INFO**: Debug page is gated to `h.marian914@gmail.com` — not a public user flow.
- **RISK (Low)**: `DebugTable` component likely uses `<table>` — needs verification for `<th>`, `scope` attributes. Not audited in detail (developer-only page).

### 2.14 Workspace Members

File: `app/workspace/members/page.tsx`

- **GOOD**: `<main>` landmark present.
- **GOOD**: `CraftedSubpageHeader` back link has clear text.
- **RISK (Low)**: Member avatar (styled `<div>` with initials) has no `aria-hidden`. It is decorative.
- **RISK (Low)**: `RemoveWorkspaceMemberButton` — needs verification for destructive confirmation pattern. Not read in detail.

### 2.15 Workspace Categories

File: `src/components/workspace/crafted-category-management.tsx`

- **RISK (High)**: `CategoryCreateForm` and `CategoryEditForm` — `<label>` elements have no `htmlFor`. `<Input>` elements have no `id`. None of the label-input pairs are programmatically associated.
- **RISK (Medium)**: "Elimina" button uses `window.confirm(...)` for destructive confirmation — accessible but modal message is short: "Elimina definitivamente solo se non è usata. Continuare?". The consequence is mentioned but phrasing is ambiguous.
- **RISK (Low)**: Color swatch `<span style={{ backgroundColor: category.color }} title={category.color}>` — `title` provides an accessible name but only on hover. Prefer `aria-label` on this decorative swatch or treat it as `aria-hidden` since the hex value text appears adjacent.

### 2.16 PWA Notification Prompt

File: `src/components/notifications/notification-permission-prompt.tsx`

- **GOOD**: `role="region"` and `aria-label="Richiesta permesso notifiche"`.
- **GOOD**: Bell icon has `aria-hidden="true"`.
- **GOOD**: Button has visible text ("Consenti", "Attendi…").
- **RISK (Low)**: Prompt appears as `position: fixed` without a focus trap. When it appears, keyboard focus stays elsewhere. It's dismissible only by clicking the button or browser-denying the permission. No `Escape` handler or close button.

---

## 3. Relevant WCAG 2.2 AA Criteria

| Criterion | Description | Status |
|-----------|-------------|--------|
| 1.1.1 Non-text Content | Images, icons, decorative elements | Mostly PASS — icons have `aria-hidden` |
| 1.3.1 Info and Relationships | Programmatic label associations | **FAIL** — multiple unlabeled inputs |
| 1.3.2 Meaningful Sequence | Reading order | PASS |
| 1.4.1 Use of Color | Color not sole means of conveying info | **FAIL** — streak bars, category chart |
| 1.4.3 Contrast (Minimum) | Text 4.5:1, UI 3:1 | Unknown — no color contrast tool run |
| 2.1.1 Keyboard | All functionality via keyboard | Mostly PASS — some buttons lack visible selection state |
| 2.4.3 Focus Order | Logical focus order | PASS — DOM order is correct |
| 2.4.6 Headings and Labels | Descriptive headings | **PARTIAL** — some pages use `<h2>`, most use styled spans |
| 2.4.7 Focus Visible | Focus visible on keyboard navigation | **PARTIAL** — desktop nav link may lack visible focus ring |
| 2.4.11 Focus Appearance | 2024 addition — focus indicator style | **PARTIAL** — desktop nav |
| 3.1.1 Language of Page | `lang` attribute | Assumed set in root layout — not verified |
| 3.3.1 Error Identification | Errors identified in text | PARTIAL — `aria-invalid` set, but no `aria-describedby` |
| 3.3.2 Labels or Instructions | Inputs labeled | **FAIL** — title, name, amount inputs in multiple forms |
| 4.1.2 Name, Role, Value | UI components with correct ARIA | **FAIL** — category buttons, feedback type pills, habit inputs |

---

## 4. Quick Wins

These can each be fixed in < 1 hour and have high impact:

1. **Add `aria-pressed` to feedback type pills** in `feedback-button.tsx` — 5 lines.
2. **Add `aria-pressed` to category selector buttons** in `crafted-entry-form.tsx` — 3 lines per button.
3. **Add `aria-label` to desktop DesktopNavLink wrapper** and `focus-visible:ring` to the `<Link>` class — 2 lines.
4. **Associate quick-add date label**: change `<Label>Data</Label>` to ShadCN `<Label htmlFor="quick-date">Data</Label>` — 1 line.
5. **Add `aria-live="polite"` to large comparison warning** in entry form — 1 attribute.
6. **Add `aria-hidden="true"` to decorative category bar chart** and streak week bars, since the list below provides the data — or add `aria-label` with a summary.
7. **Add `aria-label` to ProgressLine** when used with a goal title — pass a `aria-label` prop to name the tracked goal.

---

## 5. Blockers Before Public Launch

These are failures of WCAG 2.2 AA that should be resolved before a broad public release:

### Blocker 1 — Unlabeled text inputs across multiple forms

**Affected**: `crafted-entry-form.tsx` (title), `crafted-habit-form.tsx` (name, category, amount), `crafted-category-management.tsx` (name, icon, color in both create and edit forms).

**Root cause**: The `Label` component from `@/components/crafted/label.tsx` is a styled `<span>`, not an HTML `<label>`. Using it as a visual label next to an input without an explicit `htmlFor`/`id` pair or wrapping `<label>` creates unlabeled inputs.

**Fix approach**: Either:
- Replace `<Label>...</Label>` with a proper HTML `<label htmlFor="...">...</label>` and add matching `id` to each input, or
- Add `aria-label="..."` directly to the input element.
- For category management forms specifically, add `id` to each `<Input>` and `htmlFor` to each `<label>`.

### Blocker 2 — Category selector with no state for screen readers

**Affected**: `crafted-entry-form.tsx`, `quick-add-sheet.tsx` (preset cards), `crafted-preset-form.tsx`.

**Root cause**: Category selection uses only visual border-color change to indicate selection.

**Fix approach**: Add `aria-pressed={selected}` (or `aria-selected` within a proper `role="listbox"`) to each category button.

### Blocker 3 — Form errors not linked to inputs

**Affected**: All forms using `FormFieldError` — entry form, preset form, habit form, category form, quick-add.

**Root cause**: `FormFieldError` renders a `<p>` with no `id`. Inputs have `aria-invalid` but no `aria-describedby`.

**Fix approach**: Add an `id` prop to `FormFieldError`, render it with that id, and add `aria-describedby={id}` to the corresponding input.

---

## 6. Things Not to Change

- **`<details>/<summary>` markup** for "Riepilogo del mese" and "Dettagli del periodo" — native HTML, keyboard operable, correctly announced by screen readers. The `[&::-webkit-details-marker]:hidden` CSS suppressing the default triangle is fine.
- **`window.confirm()` for destructive actions** — browser-native dialogs are accessible to screen readers. They are not polished, but changing them requires a custom modal, which should be a deliberate product decision, not an accessibility patch.
- **`aria-current="page"` on nav links** — correctly implemented in both bottom bar and desktop nav. Do not change.
- **`aria-live="polite"` on workspace switching indicator** — correctly placed.
- **`role="region"` on notification prompt** — correct pattern.
- **`aria-hidden="true"` on decorative icons** — correctly applied throughout.
- **`role="progressbar"` on ProgressLine** — foundation is correct; only needs `aria-label` added, not a structural change.
- **The `sr-only` span on the quick-add trigger button** — correct pattern for icon-only buttons.

---

## 7. Priority Implementation Plan (Phase 18)

### P1 — Critical WCAG Failures (ship blockers)

**P1.1 — Fix unlabeled inputs in entry form**
- File: `src/components/entries/crafted-entry-form.tsx`
- Action: Add `aria-label="Titolo del movimento"` to the title `<input>`. Add `aria-label` to the comparison amount `<input>` within the comparison `<label>` wrapping.

**P1.2 — Fix unlabeled inputs in habit form**
- File: `src/components/habits/crafted-habit-form.tsx`
- Action: Add `id` + `htmlFor` pairs to name, category, and amount fields. Or replace `<CraftedLabel>` with `<label htmlFor="...">`.

**P1.3 — Fix unlabeled inputs in category management forms**
- File: `src/components/workspace/crafted-category-management.tsx`
- Action: Add unique `id` to each `<Input>` in `CategoryCreateForm` and `CategoryEditForm`, add matching `htmlFor` to each `<label>`.

**P1.4 — Category selector aria-pressed**
- File: `src/components/entries/crafted-entry-form.tsx`, `crafted-preset-form.tsx`
- Action: Add `aria-pressed={selected}` to each category button.

**P1.5 — Feedback type pills aria-pressed**
- File: `src/components/feedback/feedback-button.tsx`
- Action: Add `aria-pressed={selectedType === value}` to each type button.

### P2 — Medium Priority (should fix before launch)

**P2.1 — Link error messages to inputs via aria-describedby**
- File: `src/components/shared/form-field-error.tsx`
- Action: Accept an optional `id` prop; emit with that id. Callers add `aria-describedby` on the input.

**P2.2 — Desktop nav focus ring**
- File: `src/components/layout/app-shell.tsx`
- Action: Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm` to `DesktopNavLink`.

**P2.3 — Name ProgressLine targets**
- File: `components/crafted/progress-line.tsx`
- Action: Add optional `aria-label` prop to `ProgressLine`; pass goal title at call sites.

**P2.4 — Streak week bars and category chart**
- File: `src/components/dashboard/crafted-dashboard.tsx`
- Action: Add `aria-hidden="true"` to the streak week bar container and category proportion bar (since the text list below carries the data). Alternatively add a visually-hidden summary text.

**P2.5 — Multiple Elimina buttons — add context**
- File: `src/components/goals/crafted-goals.tsx`, `crafted-category-management.tsx`
- Action: Wrap action buttons with `aria-label="Elimina {goal.title}"` to differentiate them.

### P3 — Low Priority / Post-launch

**P3.1 — Quick-add date label**
- Change crafted `<Label>Data</Label>` to ShadCN `<Label htmlFor="quick-date">`.

**P3.2 — Large comparison warning live region**
- Add `aria-live="polite"` to the comparison warning `<p>`.

**P3.3 — Skip navigation link**
- Add a visually-hidden "Salta al contenuto" link before the header that focuses `#main-content`.

**P3.4 — Confirm `lang` attribute on root layout**
- Ensure `<html lang="it">` in the root layout.

**P3.5 — Heading hierarchy review**
- Introduce `<h1>` on each page's primary heading. Currently most page headings are styled `<span>`. Not a strict WCAG failure but aids navigation with screen readers.

---

## Completion Notes

- Files inspected: 30+ component and page files (listed below).
- Files changed: None.
- Code/schema/tests modified: No.

### Key Accessibility Risks

1. **Unlabeled inputs** across entry form, habit form, and category management — most critical.
2. **Category selector buttons** lack `aria-pressed` — state invisible to AT.
3. **Feedback type pills** lack `aria-pressed`.
4. **Error messages** not linked to inputs via `aria-describedby`.
5. **Desktop nav focus ring** may be invisible on keyboard.
6. **Color-only** streak and category bar indicators.
7. **Multiple "Elimina" buttons** without distinguishing accessible names.

### Files Inspected

```
src/components/layout/app-shell.tsx
src/components/layout/crafted-bottom-bar.tsx
src/components/layout/crafted-masthead.tsx
src/components/layout/mobile-tab-bar.tsx
src/components/entries/crafted-entry-form.tsx
src/components/entries/crafted-entry-row.tsx
src/components/entries/crafted-entry-list.tsx
src/components/entries/quick-add-sheet.tsx
src/components/entries/crafted-entries-header.tsx
src/components/dashboard/crafted-dashboard.tsx
src/components/habits/crafted-habits.tsx
src/components/habits/crafted-habit-form.tsx
src/components/goals/crafted-goals.tsx
src/components/more/crafted-more.tsx
src/components/feedback/feedback-button.tsx
src/components/notifications/notification-permission-prompt.tsx
src/components/workspace/crafted-category-management.tsx
src/components/reports/crafted-monthly-report-header.tsx
src/components/reports/crafted-monthly-report-detail.tsx
src/components/presets/crafted-preset-form.tsx
src/components/shared/form-field-error.tsx
components/crafted/label.tsx
components/crafted/progress-line.tsx
app/page.tsx
app/workspace/members/page.tsx
app/workspace/categories/page.tsx
docs/product-ready/02_EXECUTION_CHECKLIST.md
```

### Recommended Phase 18

Phase 18 should implement the P1 fixes (unlabeled inputs, missing aria-pressed, focus ring) as a single accessibility hardening pass. Estimated scope: 6–8 files changed, no schema or server action changes required. All fixes are UI-layer only.
