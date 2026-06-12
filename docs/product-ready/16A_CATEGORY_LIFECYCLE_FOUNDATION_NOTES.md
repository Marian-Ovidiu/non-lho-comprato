# Phase 16A — Category Lifecycle Foundation Notes

Date: 2026-06-12

Goal: Add `isDefault` flag and `archivedAt` soft-delete to the Category model, fix the upsert overwrite bug, and update category resolution logic to respect archived defaults.

No UI changes. No new server actions. No management page.

---

## What Changed

### 1. Prisma schema (`prisma/schema.prisma`)

Two new fields added to `Category`:

- `isDefault Boolean @default(false)` — marks categories that were provisioned from `DEFAULT_CATEGORIES`. Set to `true` on create by `upsertDefaultCategoryForWorkspace`. The migration backfills existing rows whose `slug` matches one of the 17 built-in slugs.
- `archivedAt DateTime?` — soft-delete timestamp. `null` = active. Non-null = archived. Future UI sets this via a server action. Phase 16A does not expose the archive action.

New composite index:

```prisma
@@index([workspaceId, archivedAt])
```

Supports the common pattern of filtering active (`archivedAt IS NULL`) categories per workspace.

### 2. Migration (`prisma/migrations/20260612120000_category_lifecycle/migration.sql`)

```sql
ALTER TABLE "Category" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE INDEX "Category_workspaceId_archivedAt_idx" ON "Category"("workspaceId", "archivedAt");
UPDATE "Category" SET "isDefault" = true WHERE slug IN (...17 slugs...);
```

The `UPDATE` backfill covers all currently provisioned default categories, regardless of workspace, so the flag is accurate from day one of the migration.

### 3. Upsert bug fix (`src/features/categories/repository.ts`)

**Before (broken):**
```ts
update: { name: category.name, icon: category.icon, color: category.color }
```
This overwrote user customizations (name, icon, color) every time a default category was lazily re-upserted — for example, when adding a habit or quick preset that references a slug the user had already renamed.

**After (fixed):**
```ts
update: {}
create: { ..., isDefault: true }
```

- `update: {}` means "create if absent, never overwrite if present." User customizations are now safe from this codepath.
- `isDefault: true` in `create` means newly provisioned defaults are correctly flagged without a separate update pass.

### 4. `mergeCategoryOptions` (`src/lib/categories.ts`)

Signature change:

```ts
export function mergeCategoryOptions(
  dbCategories: Array<CategoryOption & { ...; archivedAt?: Date | null }>,
  archivedDefaultSlugs: ReadonlySet<string> = new Set(),
): CategoryOption[]
```

- Added `archivedAt?: Date | null` to the `dbCategories` element type so callers can pass full DB rows without a TypeScript error. The field is ignored inside the function (stripped by `toCategoryOption`).
- Added `archivedDefaultSlugs` parameter (default empty Set). In the static-fallback loop, any slug in this Set is skipped — the static entry for that default is not added to `bySlug`. This prevents a provisioned-then-archived default from reappearing as a static fallback.
- DB rows always win over the static fallback regardless of `archivedDefaultSlugs` — if a row is in both, the DB row appears (this case is impossible in normal operation since callers filter archived rows before the call, but the function is predictable).

### 5. `getCategories` (`src/actions/entries.ts`)

Updated to fetch `isDefault` and `archivedAt` alongside the existing fields:

```ts
const allCategories = await prisma.category.findMany({
  where: ...,
  select: { id, name, slug, color, icon, isDefault, archivedAt },
});

const archivedDefaultSlugs = new Set<string>();
const activeCategories = [];

for (const cat of allCategories) {
  if (cat.archivedAt !== null) {
    if (cat.isDefault) archivedDefaultSlugs.add(cat.slug);
    // archived non-default: skip entirely (no static fallback exists)
  } else {
    activeCategories.push(cat);
  }
}

return mergeCategoryOptions(activeCategories, archivedDefaultSlugs);
```

**Archiving semantics:**
- Archived **default** categories are added to `archivedDefaultSlugs` so the static fallback is also suppressed (the category disappears entirely from the picker).
- Archived **custom** categories are simply excluded from `activeCategories` — there is no static fallback to suppress.
- Active categories (both default and custom) pass through normally, with the DB row taking precedence over any matching static entry.

### 6. Tests (`src/lib/categories.test.ts`)

New file with 9 tests covering `mergeCategoryOptions`:

| Test | Assertion |
|------|-----------|
| Empty db list returns all defaults | 17 categories, each with `id = slug` |
| Unprovisioned default uses slug as id | `id === "cibo"` |
| Provisioned default uses real cuid | `id === "clxxx001"` |
| Custom non-default category is included | slug `"palestra"` present |
| Single archived default slug is skipped | `"cibo"` absent, length = 16 |
| Multiple archived default slugs are skipped | 3 absent, length = 14 |
| Active DB row appears even if slug in archivedDefaultSlugs | DB row wins |
| Results sorted by Italian locale | `names deepEqual sorted` |
| Extra fields stripped from returned objects | no `workspaceId`, `archivedAt`, etc. |

---

## What Is NOT Changed

- No UI added (no `/workspace/categories` page — Phase 16B).
- No archive server action added — `archivedAt` column exists but nothing sets it yet. Phase 16B will add `archiveCategory` / `restoreCategory` actions.
- No rename server action added. Phase 16B scope.
- `src/features/entries/repository.ts`, `src/actions/habits.ts`, `src/actions/presets.ts` — the `resolveCategory` functions in these files all call `upsertDefaultCategoryForWorkspace` which now correctly sets `isDefault: true`. No changes needed in those files.
- The `orderBy: { name: "asc" }` clause removed from `getCategories` — sorting now happens in `mergeCategoryOptions` by Italian locale, which was already the case. The DB `orderBy` was redundant and is now gone.

---

## Validation

```
npx prisma validate   ✓ (schema valid)
npm run lint          ✓ (clean)
npm run typecheck     ✓ (clean)
npm run test          ✓ 161 pass, 0 fail (9 new mergeCategoryOptions tests)
npm run build         ✓ all pages compiled
```
