# Phase 16C — Category Management UI Notes

Date: 2026-06-12

Goal: Add an owner-visible workspace category management page using the Phase 16B server actions. No schema changes. No new server actions.

---

## Files Changed

| File | Change |
|---|---|
| `app/workspace/categories/page.tsx` | New: server page |
| `src/components/workspace/crafted-category-management.tsx` | New: client component |
| `src/components/more/crafted-more.tsx` | Edited: added navigation row |
| `docs/product-ready/16C_CATEGORY_MANAGEMENT_UI_NOTES.md` | New: this file |
| `docs/product-ready/02_EXECUTION_CHECKLIST.md` | Updated: Phase 16C marked complete |

---

## Server Page (`app/workspace/categories/page.tsx`)

```
export const dynamic = "force-dynamic"
```

- Loads `getWorkspaceCategories()` in try/catch, with `formatEntryLoadError` for the error banner.
- `CraftedSubpageHeader` props: `backHref="/more"`, `eyebrow="Workspace"`, `title="Gestisci categorie"`, `context="Le categorie valgono solo per questo spazio. Nel workspace condiviso le modifiche sono visibili a tutti i membri."`
- On error: `DataLoadErrorBanner` title "Impossibile caricare le categorie".
- Passes `initialCategories` to `CraftedCategoryManagement` client component.

Note: `getWorkspaceCategories()` has no owner check (read-only). Non-owners who visit the page see the category list but mutation buttons call actions that return `{ success: false, message: "Solo un owner può gestire le categorie." }` — the error is shown inline on the relevant row.

---

## Client Component (`src/components/workspace/crafted-category-management.tsx`)

### Architecture

Single file, three sub-components (not exported) + main exported component.

**Pattern: `useTransition` + `router.refresh()`**

Every action follows:
1. User triggers (button click or form submit)
2. `startTransition(async () => { const result = await action(...); if (result.success) { router.refresh(); } else { setMessage(result.message); } })`
3. `router.refresh()` triggers a server re-render via Next.js app router, fetching fresh data from `getWorkspaceCategories()`

This means `initialCategories` prop is always up-to-date after any successful action — no local state merge needed.

### `CategoryRow`

- Owns its own `useTransition` (one per rendered row).
- Disabled state (`pointer-events-none opacity-60`) during pending.
- Shows: name, Default/Personalizzata badge, Archiviata badge (if archived), slug (mono), usage counts, color swatch, icon string.
- Actions:
  - **Modifica** (pencil icon): toggles `editingId` in parent → swaps row for `CategoryEditForm`
  - **Archivia** (archive icon): calls `archiveCategory(id)`. Archive copy: "Nasconde la categoria dai selettori, ma conserva lo storico." (action returns this in message on success, shown in debug — the action message itself is "Categoria archiviata.")
  - **Ripristina** (rotate-ccw icon): calls `restoreCategory(id)`. Shown only for archived rows.
  - **Elimina** (trash icon, destructive style): `window.confirm("Elimina definitivamente solo se non è usata. Continuare?")` then `deleteCategory(id)`. Returns friendly Italian error if referenced.
- Archivia and Ripristina are mutually exclusive (only one shown based on `archivedAt`).
- Error messages shown below the row in `text-destructive`.

### `CategoryEditForm`

- Inline replacement for a row when `isEditing`.
- Fields: Nome (required, max 80), Icona, Colore (both optional free-text — icon/color picker is Phase 16D scope).
- Submits to `updateCategory(id, FormData)`.
- Cancel: clears `editingId`, no refresh needed.
- Save: clears `editingId` + `router.refresh()` on success.

### `CategoryCreateForm`

- Shown when `showCreate = true` in parent.
- Fields: Nome (required, max 80), Icona (optional), Colore (optional).
- Submit: `createCategory(FormData)`. On success: `setShowCreate(false)` + `router.refresh()`.
- Cancel: `setShowCreate(false)`.

### Main component sections

1. **Create button / Create form** (top) — "Crea categoria" outline button toggles the create form.
2. **Categorie attive** — active categories (`archivedAt === null`), separated by `<Rule soft />`. Empty state text if none.
3. **Categorie archiviate** — collapsed by default; toggle with chevron. Only renders if `archivedCategories.length > 0`.
4. **Ripristina categorie predefinite** — `window.confirm` then `resetDefaultCategories()`. Message shown below the button (success or error).

---

## Navigation (`src/components/more/crafted-more.tsx`)

Added between "Partecipanti" and "Crea workspace":

```tsx
<CraftedMoreRow
  href="/workspace/categories"
  label="Gestisci categorie"
  detail="Crea, modifica e archivia le categorie"
  icon="receipt"
/>
```

Shown whenever `showWorkspaceTools` is true (i.e., a workspace exists). Non-owners who navigate here see the read-only category list; mutation actions return a friendly RBAC error inline.

---

## UX Decisions

**Archive vs. delete copy:**
- Archive: "Archivia" (no confirmation — always safe, history preserved)
- Delete: `window.confirm("Elimina definitivamente solo se non è usata. Continuare?")` — matches spec
- Reset: `window.confirm("Ripristina le categorie predefinite mancanti o archiviate senza sovrascrivere le tue modifiche. Continuare?")`

**Collapsed archived section:** Archived categories add visual noise for the common case. Default-collapsed with an explicit count in the label ("Categorie archiviate (N)") gives awareness without clutter.

**No inline success toast:** Success is implicit via UI update (categories list re-renders). Error messages are inline per-row. This is consistent with the existing members page pattern.

**`router.refresh()` not `revalidatePath`:** The client already calls `router.refresh()` after each successful action; the server action also calls `revalidatePath("/", "layout")`. Both are needed: `revalidatePath` invalidates the Next.js cache for other users/SSR; `router.refresh()` triggers a re-render for the current client session.

---

## Icon/Color Preview

Currently limited to:
- **Color:** small inline circle (`<span style={{ backgroundColor: category.color }} />`) if `category.color` is set.
- **Icon:** raw string text if `category.icon` is set.

Full icon-to-CraftedIcon mapping and color-to-CSS-variable support are Phase 16D scope.

---

## Risks and Follow-ups

**Non-owner UX:** Non-owners see the management page with all buttons rendered. Clicking a mutation button returns "Solo un owner può gestire le categorie." displayed inline. If this is confusing, Phase 16D can add a top-level banner for non-owners or hide action buttons based on a passed `isOwner` prop.

**Stale `initialCategories` on quick re-renders:** Because `router.refresh()` is async, rapid back-to-back clicks could briefly show stale data. The `pointer-events-none` disabled state during pending prevents this in practice.

**`resetDefaultCategories` partial restore:** Returns `{ success: true }` even if some archived defaults were skipped due to name conflicts. The reset message says "Categorie predefinite ripristinate." which may be slightly misleading. Acceptable for Phase 16C; Phase 16D could add a more detailed message.

---

## Validation

```
npx prisma validate   ✓ (schema unchanged)
npm run lint          ✓ (clean)
npm run typecheck     ✓ (clean)
npm run test          ✓ 173 pass, 0 fail (no new tests — UI is not unit-testable without jsdom)
npm run build         ✓ /workspace/categories appears in route table as ƒ (Dynamic)
```
