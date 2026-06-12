# Phase 16B — Category Management Server Actions Notes

Date: 2026-06-12

Goal: Add safe, workspace-scoped server actions for managing categories. No UI page (Phase 16C scope). No schema changes (Phase 16A already added `isDefault` and `archivedAt`).

---

## Files Changed

| File | Change |
|---|---|
| `src/features/categories/slug.ts` | New: pure `generateSlugFromName` helper |
| `src/features/categories/slug.test.ts` | New: 12 tests for slug generation |
| `src/actions/categories.ts` | New: 7 server actions + types |
| `docs/product-ready/16B_CATEGORY_MANAGEMENT_ACTIONS_NOTES.md` | New: this file |
| `docs/product-ready/02_EXECUTION_CHECKLIST.md` | Updated: Phase 16B marked complete |

---

## Slug Helper (`src/features/categories/slug.ts`)

```ts
export function generateSlugFromName(name: string): string
```

Algorithm:
1. `normalize("NFD")` — decomposes accented characters into base + combining form
2. Strip combining diacritics (Unicode range `̀–ͯ`)
3. Lowercase
4. Replace all non-alphanumeric sequences with a single dash
5. Trim leading/trailing dashes
6. Fallback to `"categoria"` if result is empty

Examples: `"Caffè"` → `"caffe"`, `"Sigarette / Accessori"` → `"sigarette-accessori"`, `"Palestra (Fitness)"` → `"palestra-fitness"`.

Slug is immutable after creation — `updateCategory` changes only `name`, `icon`, `color`.

---

## Actions (`src/actions/categories.ts`)

### Ownership model

All mutation actions call `requireOwner()` which runs `requireWorkspaceRole(prisma, { workspaceId, userId, roles: ["owner"] })`. Non-owners receive `{ success: false, message: "Solo un owner può gestire le categorie." }`.

### 1. `getWorkspaceCategories()`

Returns all DB-backed categories for the current workspace:

```ts
export type CategoryManagementItem = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  archivedAt: Date | null;
  entriesCount: number;
  habitsCount: number;
  presetsCount: number;
};
```

- No owner check (read-only, safe for all workspace members and RSC pages)
- Ordered: active first (archivedAt nulls first), then defaults before custom, then alphabetical
- Counts via `_count: { select: { entries, habits, quickPresets } }` — single JOIN, no N+1
- Does NOT include unprovisioned defaults (no DB row = nothing to manage)
- Error: returns `[]` on failure (called from RSC pages; UI shows empty state)

### 2. `createCategory(formData)`

- **Owner-only**
- Reads: `name` (required), `icon` (optional), `color` (optional) from FormData
- Validates name: non-empty, ≤ 80 chars
- Generates slug via `generateSlugFromName(name)`, then finds the first non-conflicting variant (`slug`, `slug-2`, `slug-3`, …, `slug-99`, `slug-{timestamp}`)
- Creates row with `isDefault: false`, `archivedAt: null`
- Catches `P2002` (unique constraint on name): "Esiste già una categoria con questo nome."

### 3. `updateCategory(categoryId, formData)`

- **Owner-only**
- Can update: `name`, `icon`, `color`
- Cannot update: `slug` (immutable), `isDefault`, `archivedAt`, `workspaceId`
- Workspace boundary: looks up category with `getCurrentWorkspaceScopedWhere({ id })` before updating — no cross-workspace mutations possible
- Catches `P2002` on name: "Esiste già una categoria con questo nome."

### 4. `archiveCategory(categoryId)`

- **Owner-only**
- Sets `archivedAt = new Date()` on the row
- Idempotent: if `archivedAt` is already set, returns `{ success: true, message: "Categoria già archiviata." }` without touching the DB
- Does NOT count references before archiving — archiving is always safe (entries still JOIN to the row; only the picker hides it via Phase 16A logic)
- Workspace boundary enforced via `getCurrentWorkspaceScopedWhere`

### 5. `restoreCategory(categoryId)`

- **Owner-only**
- Sets `archivedAt = null`
- Before restoring, checks for a name conflict with another active category in the same workspace
  - If conflict: `"Esiste già una categoria attiva chiamata "X". Rinominala prima di ripristinarla."`
  - The conflict check uses the row's current name (which may differ from the original default if renamed before archiving)
- Workspace boundary enforced

### 6. `deleteCategory(categoryId)`

- **Owner-only**
- Checks `_count` for entries, habits, presets before attempting the delete
- If any references exist, returns a human-readable message listing what's in use:
  ```
  "Questa categoria è usata da 3 movimenti, 1 abitudine. Archiviala per nasconderla dai selettori."
```
- Uses singular/plural Italian for each reference type
- Hard-deletes only if all counts are zero (safe: Prisma `Restrict` FK would block anyway)
- Also catches `P2003` (FK violation) as a safety net for race conditions
- Workspace boundary enforced

### 7. `resetDefaultCategories()`

- **Owner-only**
- Three-pass algorithm:
  1. Fetches all rows where `isDefault = true` for the current workspace
  2. For each of the 17 `DEFAULT_CATEGORIES`:
     - **Already active** → skip (preserve any customizations)
     - **Archived** → restore (`archivedAt = null`) unless another active category has the same current name (conflict → skip silently)
     - **Missing from DB** → provision via `upsertDefaultCategoryForWorkspace` (always uses `update: {}` so existing rows are never overwritten)
- Returns `{ success: true }` even if some restores were skipped due to name conflicts (partial success is acceptable; the user can manually restore the conflicting ones)

---

## Revalidation

All mutation actions call `revalidatePath("/", "layout")` which cascades to all cached routes including `/entries/new`, `/entries/[id]/edit`, `/habits`, `/presets`, `/reports/monthly`, and the future `/workspace/categories` management page.

---

## Error handling summary

| Error | Action | Response |
|---|---|---|
| `WorkspaceRbacError` | All mutations | "Solo un owner può gestire le categorie." |
| Empty name | create, update | "Il nome è obbligatorio." |
| Name > 80 chars | create, update | "Il nome è troppo lungo (max 80 caratteri)." |
| `P2002` (duplicate name) | create, update | "Esiste già una categoria con questo nome." |
| Name conflict on restore | restore | "Esiste già una categoria attiva chiamata "X". Rinominala prima di ripristinarla." |
| References exist | delete | "Questa categoria è usata da X movimenti…" |
| `P2003` (FK violation) | delete | generic "usata da movimenti/abitudini/preset" |
| Category not in workspace | update, archive, restore, delete | "Categoria non trovata." |
| Unexpected error | all | generic "Riprova." |

---

## Tests (`src/features/categories/slug.test.ts`)

12 tests covering `generateSlugFromName`:

| Test | Input | Expected |
|---|---|---|
| lowercase ASCII | "Cibo" | "cibo" |
| Italian diacritics | "Caffè", "Già fatto" | "caffe", "gia-fatto" |
| spaces → dashes | "Hello World" | "hello-world" |
| multiple non-alnum → single dash | "Sigarette / Accessori" | "sigarette-accessori" |
| trim leading/trailing | "  Trim me  " | "trim-me" |
| preserve numbers | "Spesa 2" | "spesa-2" |
| parentheses and commas | "Palestra (Fitness)" | "palestra-fitness" |
| NFD: é ü ñ ç | "España", "Günstig", "Çay" | "espana", "gunstig", "cay" |
| empty string | "" | "categoria" |
| all non-alphanumeric | "!!!", "/ / /" | "categoria" |
| already slug-shaped | "spese-condominiali" | "spese-condominiali" |
| no trailing dash | "Test!" | "test" |

Server action logic (validation, ownership, archive/delete guards) is tested indirectly via typecheck and build. Direct DB-coupled tests require a test database (deferred).

---

## Risks and Follow-ups

**`generateUniqueSlug` race condition:** Two concurrent `createCategory` calls with the same name might both check for slug conflicts and both try to insert, with the second failing on `P2002`. The action catches `P2002` and returns a friendly error. This is acceptable; true atomic slug reservation would require a DB-level sequence or advisory lock, which is over-engineered for this use case.

**`resetDefaultCategories` partial restore:** Archived defaults with name conflicts are silently skipped. The user sees "Categorie predefinite ripristinate." even if some were skipped. This is intentional UX — the function does what it safely can. Phase 16C can show which defaults remain archived.

**`getWorkspaceCategories` does not include unprovisioned defaults:** The management UI (Phase 16C) should note that defaults appearing in pickers but absent from the management list are "auto-created on first use". A "Provisionamento" hint or a dedicated section can explain this.

**`category-identity.ts` and `category-crafted-icon.ts`:** Custom categories (non-default) fall back to `DEFAULT_IDENTITY` color class and `"receipt"` icon. Phase 16D (picker refinements) will extend these to support category.color as a CSS variable and map custom icon names.

**No `userId` field on categories:** Phase 16B operates on workspace-scoped categories only. User-scoped customization is explicitly out of scope per Phase 15B decision.

---

## Validation

```
npx prisma validate   ✓ (schema unchanged, valid)
npm run lint          ✓ (clean)
npm run typecheck     ✓ (clean)
npm run test          ✓ 173 pass, 0 fail (12 new slug tests)
npm run build         ✓ all pages compiled
```
