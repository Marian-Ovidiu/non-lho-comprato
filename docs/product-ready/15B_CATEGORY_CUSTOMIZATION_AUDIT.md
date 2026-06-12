# Phase 15B — Category Customization Audit

Date: 2026-06-12

No application code, tests, or schema were modified.

---

## 1. Current Category Model

### Prisma schema (relevant excerpt)

```prisma
model Category {
  id           String        @id @default(cuid())
  workspaceId  String                              // ← already workspace-scoped
  workspace    Workspace     @relation(...)
  name         String
  slug         String
  color        String?
  icon         String?
  entries      Entry[]
  habits       Habit[]
  quickPresets QuickPreset[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@unique([workspaceId, slug])
  @@unique([workspaceId, name])
  @@index([workspaceId])
}
```

**Key constraint:** `Entry`, `Habit`, and `QuickPreset` all reference `Category` with
`onDelete: Restrict`. A category row that has any entry, habit, or preset cannot be hard-deleted
at the DB level — the operation throws a foreign key violation.

**Missing lifecycle fields:** No `isDefault`, `archivedAt`, `isHidden`, `sortOrder`, or similar.

### Static defaults

`src/lib/categories.ts` exports:

```ts
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Cibo",                  slug: "cibo",               icon: "utensils",       color: "#f97316" },
  { name: "Caffè",                 slug: "caffe",              icon: "coffee",         color: "#a16207" },
  { name: "Delivery",              slug: "delivery",           icon: "truck",          color: "#ea580c" },
  { name: "Spesa",                 slug: "spesa",              icon: "shopping-cart",  color: "#16a34a" },
  { name: "Trasporti",             slug: "trasporti",          icon: "bus",            color: "#2563eb" },
  { name: "Auto",                  slug: "auto",               icon: "car-front",      color: "#0f766e" },
  { name: "Shopping",              slug: "shopping",           icon: "shopping-bag",   color: "#db2777" },
  { name: "Casa",                  slug: "casa",               icon: "home",           color: "#7c3aed" },
  { name: "Svago",                 slug: "svago",              icon: "party-popper",   color: "#8b5cf6" },
  { name: "Viaggi",                slug: "viaggi",             icon: "plane",          color: "#0284c7" },
  { name: "Abbonamenti",           slug: "abbonamenti",        icon: "receipt-text",   color: "#475569" },
  { name: "Salute",                slug: "salute",             icon: "heart-pulse",    color: "#dc2626" },
  { name: "Regali",                slug: "regali",             icon: "gift",           color: "#ec4899" },
  { name: "Tech",                  slug: "tech",               icon: "laptop",         color: "#14b8a6" },
  { name: "Beauty",                slug: "beauty",             icon: "sparkles",       color: "#d946ef" },
  { name: "Sigarette / Accessori", slug: "sigarette-accessori",icon: "cigarette",      color: "#78716c" },
  { name: "Altro",                 slug: "altro",              icon: "more-horizontal", color: "#6b7280" },
];
```

17 categories. These are a TypeScript constant — no DB query, no schema.

---

## 2. Files and Functions Involved

| File | Role |
|---|---|
| `src/lib/categories.ts` | `DEFAULT_CATEGORIES` static list; `mergeCategoryOptions(dbRows)` merge function |
| `src/features/categories/category-scope.ts` | `getWorkspaceCategorySlugWhere(workspaceId, slug)` — Prisma where builder |
| `src/features/categories/repository.ts` | `upsertDefaultCategoryForWorkspace(db, workspaceId, category)` |
| `src/features/entries/repository.ts` | `resolveEntryCategory(categoryId, workspaceId)` — slug-to-id resolution with lazy upsert |
| `src/actions/entries.ts` | `getCategories()` — workspace-scoped query merged with defaults |
| `src/actions/entries.ts` | `createEntry`, `updateEntry` — call `resolveEntryCategory` |
| `src/actions/habits.ts` | `resolveCategory(categoryId, workspaceId)` — duplicate of entry resolution; same lazy upsert |
| `src/actions/presets.ts` | `resolveCategory(categoryId, workspaceId)` — same pattern |
| `src/actions/stats.ts` | Groups by `categoryId`; resolves `category.name` / `category.slug` from DB |
| `src/actions/reports.ts` | Groups by `entry.category.slug` at the entry JOIN level |
| `src/lib/ai-export.ts` | Exports `entry.category.name` and `category.slug` as columns |
| `src/lib/category-identity.ts` | Hardcoded slug → CSS class map for 17 defaults |
| `src/lib/category-crafted-icon.ts` | Hardcoded slug → icon name map for 17 defaults |
| `src/components/entries/crafted-entry-form.tsx` | Category picker in entry create/edit forms |
| `src/components/entries/quick-add-sheet.tsx` | Category picker in quick-add; slug-based fallback |
| `src/components/habits/crafted-habit-form.tsx` | Category picker in habit form |
| `src/components/presets/crafted-preset-form.tsx` | Category picker in preset form |
| `app/entries/new/page.tsx` | Calls `getCategories()` |
| `app/entries/[id]/edit/page.tsx` | Calls `getCategories()` |
| `app/habits/page.tsx` | Calls `getCategories()` |
| `app/presets/page.tsx` | Calls `getCategories()` |
| `app/reports/monthly/page.tsx` | Calls `getCategories()` |

There is **no** `/workspace/categories` management page.

---

## 3. Current Default Category Flow

### At read time (category picker in forms)

```
getCategories()
  → prisma.category.findMany({ where: workspaceScoped })
  → mergeCategoryOptions(dbRows)
      1. Seed map: slug → { id: slug, name, slug, color, icon }  ← all 17 defaults
      2. Overwrite with DB rows by slug  ← DB wins on conflict
      3. Return sorted by Italian locale name
```

**Critical detail:** For any default category not yet provisioned in the workspace DB, the
`id` in the returned list is the slug string (e.g., `"cibo"`), not a real cuid.

### At write time (entry/habit/preset creation)

When a user submits a form with `categoryId = "cibo"` (slug as id for unprovisioned default):

```
resolveEntryCategory(categoryId="cibo", workspaceId)
  → prisma.category.findFirst({ where: { id: "cibo", workspaceId } })  ← fails
  → prisma.category.findFirst({ where: { slug: "cibo", workspaceId } })  ← fails
  → DEFAULT_CATEGORIES.find(item => item.slug === "cibo")  ← found
  → upsertDefaultCategoryForWorkspace(db, workspaceId, ciboDef)
      prisma.category.upsert({
        where:  { workspaceId_slug: { workspaceId, slug: "cibo" } },
        update: { name: "Cibo", icon: "utensils", color: "#f97316" },  ← ⚠ overwrites
        create: { workspaceId, name: "Cibo", slug: "cibo", icon: ..., color: ... }
      })
  → returns real Category row { id: "clm...", name: "Cibo", slug: "cibo", ... }
```

The entry is then created with `categoryId = "clm..."` (the real cuid). The FK is always a cuid — never a slug — in the stored Entry row.

### Lazy provisioning — no bulk seeding

There is no seeding at workspace creation time. Categories exist in the DB only after a user
creates their first entry/habit/preset for that category. Until then, the static list fills
the gap in the UI picker.

---

## 4. Current Workspace Scoping Behavior

**DB scoping:** Categories are fully workspace-scoped at the schema level:
- `Category.workspaceId` is NOT NULL (hard FK to Workspace)
- `@@unique([workspaceId, slug])` — slug uniqueness is per workspace, not global
- `@@unique([workspaceId, name])` — name uniqueness is per workspace
- All queries use `getCurrentWorkspaceScopedWhere()` — no cross-workspace leakage

**Static list scoping:** `DEFAULT_CATEGORIES` is a global TypeScript constant shared by all
workspaces. The static list is not per-workspace and has no workspace concept. This is where
customization isolation currently breaks down: if workspace A has not yet provisioned "Cibo",
it appears as a static default in workspace A's picker — and this static entry has no
workspace context.

**Effective scoping today:**

| Scenario | Behaviour |
|---|---|
| Workspace A provisions "Cibo" | Only workspace A's DB row; workspace B is unaffected |
| Workspace A has not provisioned "Cibo" | Static fallback appears in picker; looks the same for all workspaces |
| Workspace A renames "Cibo" to "Pasti" | Works at DB level, but see the rename bug below |
| Workspace A deletes a category | Blocked by `Restrict` if any entry/habit/preset exists |

---

## 5. Current Entry/Category Relationship

```
Entry {
  categoryId: String   ← FK to Category.id (cuid)
  category:   { id, name, slug, color, icon }  ← joined at query time
}
```

**What is stored:** Only `categoryId` (a cuid FK). Name, slug, color, icon are never
denormalized into Entry rows. All label resolution happens via JOIN.

**Consequence for rename:** Renaming a category immediately changes how all historical entries
display their category name (since the JOIN resolves the live DB value). There is no snapshot
of the name at time of entry creation.

**Consequence for delete:** Deleting the category row that entries point to is blocked by
`onDelete: Restrict`. This is safe but makes hard-delete operationally impossible without
first re-assigning all entries.

---

## 6. Rename and Delete Risks

### Rename risk: `upsertDefaultCategoryForWorkspace` overwrite bug

The current `update` clause in `repository.ts`:

```ts
update: {
  name: category.name,    // ← overwrites the user's custom name
  icon: category.icon,    // ← overwrites the user's custom icon
  color: category.color,  // ← overwrites the user's custom color
},
```

**Trigger condition:** Any code path that calls `resolveEntryCategory` / `resolveCategory`
with a default slug after the user has already customized that category. This happens when:
- A quick-add entry uses a default-slug category ID
- A habit is created with a default-slug category
- A preset action triggers category resolution with a slug

**Impact:** User's rename is silently reverted to the default name. No error, no warning.

This is a **blocking bug** that must be fixed before any rename UX is exposed.

**Fix:** Change the `update` clause to an empty object `{}` so the upsert becomes a
create-if-not-exists:

```ts
update: {},  // do not overwrite existing customizations
create: { workspaceId, name, slug, icon, color },
```

### Delete risk: hard delete is impossible with live references

All three FK references use `onDelete: Restrict`:
- `Entry.categoryId`
- `Habit.categoryId`
- `QuickPreset.categoryId`

A delete attempt on any category with at least one entry, habit, or preset throws a DB
foreign key violation. There is no soft-delete or archive path today.

### Category identity coupling

`category-identity.ts` and `category-crafted-icon.ts` both use hardcoded slug → CSS/icon maps
for the 17 defaults. Custom categories fall back to `DEFAULT_IDENTITY` / `"receipt"` icon.
If a workspace renames a default category (changing the slug), the identity map would no longer
match and the category would lose its color theme.

**Note:** slug renaming would also break the `@@unique([workspaceId, slug])` invariant if the
old slug is referenced by entries (since entries store categoryId, not slug, this is actually safe
at the data level — but the category-identity system would lose its color). However, allowing
slug changes is unnecessary; color/name/icon changes are sufficient for UX.

### Stats/reports resolution

Stats groups by `categoryId` (DB id) — safe for rename and archived categories.
Reports groups by `entry.category.slug` — if two entries in the same workspace were created
under the same category but with different slugs (impossible given uniqueness), this could split
them. Currently safe.

---

## 7. Recommended Data Model

```prisma
model Category {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(...)
  name        String
  slug        String
  color       String?
  icon        String?
  isDefault   Boolean   @default(false)  // true if seeded from DEFAULT_CATEGORIES
  archivedAt  DateTime?                  // null = active; non-null = hidden from pickers
  entries     Entry[]
  habits      Habit[]
  quickPresets QuickPreset[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([workspaceId, slug])
  @@unique([workspaceId, name])
  @@index([workspaceId])
  @@index([workspaceId, archivedAt])
}
```

**Why `isDefault`:**
- Distinguishes workspace-seeded defaults from user-created custom categories
- Enables "Reset to defaults" (restore missing isDefault categories to original state)
- Enables "Reset this category" (restore a customized default to its original name/icon/color)
- Enables UI to show a "Default" badge on built-in categories

**Why `archivedAt` over a boolean `isHidden`:**
- Records when the category was hidden (useful for audit, ordering)
- Null = active; non-null = archived (idiomatic Prisma pattern, same as Phase 11 data)
- Archived categories are preserved in the DB for historical entry display
- Archived categories do not appear in create/edit form pickers

**No slug change:** Slugs are the stable identity key used by `category-identity.ts`,
`category-crafted-icon.ts`, and the lazy upsert logic. Allowing slug changes would invalidate
the identity system. Renaming should change only `name` (and optionally `icon`, `color`).

**No `sortOrder` in this phase:** Deferred; can be added as an integer field later without
schema churn.

---

## 8. Recommended UX Model

### Category picker (entry/habit/preset forms)

- Show only active (not archived) workspace categories
- Default categories that have never been provisioned still appear via `mergeCategoryOptions`
  (with slug as id), exactly as today
- Archived categories do NOT appear in pickers
- Archived categories still display their name/icon in historical entries/stats/reports (via JOIN)

### Category management page (`/workspace/categories`)

A new page accessible to workspace owners, listing all categories in three sections:
1. **Active default categories** (isDefault = true, archivedAt = null)
2. **Active custom categories** (isDefault = false, archivedAt = null)
3. **Archived categories** (archivedAt non-null) — collapsed by default

Actions per category:
- **Rename** (change name, icon, color — not slug)
- **Archive / hide** — sets archivedAt; if entries exist, the category is preserved but hidden from future picks
- **Restore** — clears archivedAt
- **Reset to default** (only for isDefault = true) — restores original name/icon/color from DEFAULT_CATEGORIES
- **Delete** — only if no entries, habits, or presets reference it; blocked otherwise with a message ("X movimenti usano questa categoria — archiviala invece di eliminarla")

New category creation:
- Name, icon (optional), color (optional)
- Slug is auto-generated from name (lowercased, dashes for spaces, normalized)
- Slug uniqueness enforced per workspace

### Reset defaults

- Creates or re-activates (clears archivedAt) all DEFAULT_CATEGORIES that are currently absent
  or archived in the workspace
- Does NOT overwrite user customizations on existing active defaults
- Available to workspace owners only

---

## 9. Migration and Backfill Plan

### Migration SQL (two steps, single migration file)

**Step 1:** Add new columns with defaults:
```sql
ALTER TABLE "Category" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE INDEX "Category_workspaceId_archivedAt_idx" ON "Category"("workspaceId", "archivedAt");
```

**Step 2:** Backfill `isDefault` for existing categories whose slug matches a known default:
```sql
UPDATE "Category"
SET "isDefault" = true
WHERE slug IN (
  'cibo', 'caffe', 'delivery', 'spesa', 'trasporti', 'auto', 'shopping',
  'casa', 'svago', 'viaggi', 'abbonamenti', 'salute', 'regali', 'tech',
  'beauty', 'sigarette-accessori', 'altro'
);
```

All existing entries are unaffected — `categoryId` FK values are unchanged.

### Code changes in same phase (no separate migration needed)

**Fix `upsertDefaultCategoryForWorkspace` in `src/features/categories/repository.ts`:**
```ts
return db.category.upsert({
  where: getWorkspaceCategorySlugWhere(workspaceId, category.slug),
  update: {},  // never overwrite user customizations
  create: {
    workspaceId,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    color: category.color,
    isDefault: true,
  },
});
```

**Update `getCategories` in `src/actions/entries.ts`:**
Filter out archived categories:
```ts
const categories = await prisma.category.findMany({
  where: {
    ...await getCurrentWorkspaceScopedWhere(),
    archivedAt: null,  // only active categories in pickers
  },
  orderBy: { name: "asc" },
  select: { id: true, name: true, slug: true, color: true, icon: true },
});
```

**Update `mergeCategoryOptions` in `src/lib/categories.ts`:**
Accept an optional `archivedSlugs: Set<string>` parameter and skip those slugs from the static
defaults when building the fallback map:
```ts
function mergeCategoryOptions(
  dbCategories: CategoryOption[],
  archivedDefaultSlugs: Set<string> = new Set(),
): CategoryOption[]
```

---

## 10. Implementation Phases

### Phase A — Schema and backfill (blocking for everything else)

1. Add `isDefault Boolean @default(false)` and `archivedAt DateTime?` to `Category`
2. Add DB index on `(workspaceId, archivedAt)`
3. Run backfill migration for `isDefault`
4. Fix `upsertDefaultCategoryForWorkspace` update clause (`update: {}`)
5. Update `getCategories` to exclude `archivedAt != null`
6. Update `mergeCategoryOptions` to accept and respect `archivedDefaultSlugs`
7. Update `resolveEntryCategory` (and its duplicates in `habits.ts`, `presets.ts`) to set
   `isDefault: true` on create for default-seeded categories
8. Validation: `npm run prisma:validate`, lint, typecheck, test, build

### Phase B — Category management server actions

New `src/actions/categories.ts` with:
- `getWorkspaceCategories()` — full list with `isDefault` and `archivedAt` for the management UI
- `createCategory(formData)` — owner-only; validates name uniqueness; auto-generates slug
- `updateCategory(categoryId, formData)` — owner-only; name/icon/color only; no slug change
- `archiveCategory(categoryId)` — sets archivedAt; rejects if would make all entries unrenderable (not needed — entries always display via JOIN)
- `restoreCategory(categoryId)` — clears archivedAt
- `deleteCategory(categoryId)` — hard delete; blocked if any entry/habit/preset references it
- `resetDefaultCategories()` — upserts all DEFAULT_CATEGORIES with `update: {}` (create-if-absent)
- Tests for all actions

### Phase C — Category management UI

New page `app/workspace/categories/page.tsx`:
- Server page, owner-gated (same pattern as member removal in workspace.ts)
- Lists active defaults, active custom, archived (collapsed)
- CraftedCategoryManagement client component with edit/archive/restore/delete/create

Navigation: add "Gestisci categorie" link to `/workspace/members` page (currently the workspace
tools page) or to the More page's workspace section.

### Phase D — Category picker refinements

- Custom category icon picker (lucide icon selection or emoji fallback)
- Custom category color picker
- Category ordering (deferred to a later phase)
- `category-identity.ts` extension for custom categories (use category.color as CSS var)
- `category-crafted-icon.ts` extension for custom icon mapping

---

## 11. Acceptance Criteria

1. Workspace A can rename "Cibo" to "Pasti". Workspace B still sees "Cibo". Historical entries in workspace A still show "Pasti".
2. Workspace A can create a custom category "Palestra". Workspace B does not see "Palestra".
3. Workspace A can archive "Sigarette / Accessori". The category no longer appears in the form picker for workspace A. Historical entries that used it still display the name "Sigarette / Accessori" in stats/reports/entry list.
4. Archiving "Sigarette / Accessori" in workspace A has no effect on workspace B.
5. Workspace A can restore an archived category. It reappears in the form picker.
6. Workspace A cannot delete a category that has entries. A clear error message explains why ("X movimenti usano questa categoria. Archiviala per nasconderla dai selettori.").
7. After a rename, `upsertDefaultCategoryForWorkspace` never reverts it. (If a default slug is resolved again, the existing row is returned unchanged.)
8. Reset defaults restores any missing/archived defaults without overwriting customized active ones.
9. Stats and reports show the current category name (live from DB). If a category is renamed from "Cibo" to "Pasti", stats show "Pasti" going forward.
10. Export includes both `category.name` (current name) and `category.slug` (stable identifier).

---

## 12. Test Plan

### Unit tests

- `upsertDefaultCategoryForWorkspace`: verify update clause does not overwrite an existing
  custom name (mock `db.category.upsert` return)
- `mergeCategoryOptions`: verify archived slugs are excluded from static fallback
- `getCategories`: verify archived categories are not returned
- Slug auto-generation from name (normalization, dashes, uniqueness)

### Integration tests (if test DB available)

- Create entry with slug category → verifies lazy upsert; second create with same slug does not
  re-upsert name
- Rename category → create entry → verify name is preserved (upsert bug regression test)
- Archive category → verify it does not appear in `getCategories`
- Archive category → verify `resolveEntryCategory` for existing entries still returns the category row
- Delete category with entries → verify error is raised
- Delete category without entries → verify success

### Existing tests

All 152 existing tests must continue to pass unchanged. The schema migration must not break
`entry-metrics`, `workspace-balance`, `entry-domain`, `entry-list`, or other tests.

---

## 13. Risks and Things Not to Change

### Risks

**`@@unique([workspaceId, name])` conflict for workspace rename:**
If a workspace has already provisioned "Cibo" and the user tries to rename it to the same
name as another existing active category, the `@@unique` constraint will prevent it. The action
must catch `P2002` (unique constraint violation) and return a user-friendly error.

**Stats/reports show live category name:**
There is no snapshot of category name at the time of entry creation. If a workspace renames
"Cibo" to "Pasti", all historical entries appear under "Pasti" in stats — there is no way to
distinguish "pre-rename Cibo" from "post-rename Cibo" stats. This is the accepted trade-off
(live name, no denormalization).

**`category-identity.ts` and `category-crafted-icon.ts` slug coupling:**
These files hardcode slug → CSS / icon maps. Renaming a category changes its name but not its
slug (per recommendation). The identity system continues to work correctly for renamed defaults.
For custom categories, the fallback `DEFAULT_IDENTITY` and `"receipt"` icon are used. If custom
icon/color support is added in Phase D, these files must be updated.

**`quick-add-sheet.tsx` slug resolution:**
Quick-add resolves categories by slug in `resolveCategoryId`. If a default is archived, the
slug-based lookup would still find the archived DB row. The `getCategories` + `mergeCategoryOptions`
call in the quick-add sheet must also respect `archivedAt` (archived slugs should not appear).

**Duplicate `resolveCategory` in habits.ts and presets.ts:**
The same lazy-upsert logic exists in three places (`features/entries/repository.ts`,
`actions/habits.ts`, `actions/presets.ts`). All three must be updated to pass `isDefault: true`
on create, and their `update` clause must be changed to `{}`. Consider consolidating these into
a single `resolveCategory(categoryId, workspaceId, db?)` in a shared module.

### Things not to change

- `Entry.categoryId` — always a cuid FK; no slugs stored in entries; no migration needed
- `@@unique([workspaceId, slug])` — slug is the stable identity key; never allow slug changes
- `onDelete: Restrict` on Entry/Habit/QuickPreset → Category — correct; keep it
- Stats/reports category grouping — grouping by `categoryId` (stats) and `category.slug` (reports)
  is correct; only the display label may change on rename
- The 17 default category slugs in `DEFAULT_CATEGORIES` — these are the stable keys for the
  identity/icon system and the lazy-upsert matching logic; do not change slugs

---

## 14. Recommendation: Workspace-scoped vs User-scoped

**Recommendation: workspace-scoped only.**

**Why:**

The app's three workspace types are:
1. Marian's private workspace (Marian alone)
2. Martina's private workspace (Martina alone)
3. Marian/Martina shared workspace

In a single-user private workspace, workspace-scoped = user-scoped (trivially the same).

In a shared workspace, categories are a shared concern — both Marian and Martina record entries
under "Cibo", "Shopping", etc. The shared workspace is a joint financial ledger; it would be
confusing if Marian saw "Pasti" while Martina saw "Cibo" for the same category in the same
shared workspace.

User-scoped categories would require:
- A new `userId?` FK on Category (alongside `workspaceId`)
- Resolving "visible categories for user X in workspace Y" at every query
- Handling shared entries that reference a user-scoped category invisible to the other user
- Significant complexity with no clear product benefit for the current use case

User-scoped customization (e.g., personal color themes for categories) could be implemented
later as a `CategoryUserPreference` join table if needed, without touching the Category model.

**Decision needed before Phase 16:** Confirm workspace-scoped is the intended behavior for
the shared workspace scenario. Specifically: should Marian and Martina share the same category
set (including custom categories and archives) in their shared workspace, or should each member
see their own subset? The recommendation is shared — but this must be explicitly agreed.

---

## Answers to All 15 Audit Questions

| # | Question | Answer |
|---|---|---|
| 1 | Hardcoded, DB-backed, or mixed? | **Mixed.** 17 hardcoded defaults in `DEFAULT_CATEGORIES`; DB rows per workspace on lazy provisioning |
| 2 | Already workspace-scoped? | **Yes** — `workspaceId` FK, `@@unique([workspaceId, slug/name])`. But static list is global |
| 3 | Entry stores categoryId, slug, name, or both? | **Only `categoryId`** (cuid FK). Name/slug/color/icon resolved via JOIN |
| 4 | What happens if a category is renamed? | DB row is updated. All historical entries immediately show new name. BUT: the upsert bug may revert it on next lazy provisioning |
| 5 | What happens if a category is deleted? | Blocked by `onDelete: Restrict` if any entry/habit/preset exists. No soft-delete today |
| 6 | How are defaults merged into workspace categories? | Lazily on write (upsert via `upsertDefaultCategoryForWorkspace`). At read time via `mergeCategoryOptions` static fallback |
| 7 | Defaults copied per workspace or globally referenced? | Copied per workspace when first used. Static list is global in code only |
| 8 | Slugs unique globally or per workspace? | **Per workspace only** (`@@unique([workspaceId, slug])`) |
| 9 | What breaks if a workspace hides a default? | Nothing designed for this today. `mergeCategoryOptions` would still show it. Needs `archivedAt` + filter |
| 10 | Custom category with same name as a default? | Blocked by `@@unique([workspaceId, name])` if default is already provisioned. Would succeed if default not yet in DB (before provisioning) |
| 11 | How do stats/reports/export resolve category labels? | Live JOIN to `Category` row. No snapshot. Rename affects all historical display |
| 12 | How should archive/delete work with existing entries? | Archive: set `archivedAt`, hide from pickers, keep JOIN working. Hard delete: only if no references |
| 13 | Workspace-scoped enough, or user-scoped needed? | **Workspace-scoped is sufficient** for current product model |
| 14 | Schema changes required? | Add `isDefault Boolean @default(false)` and `archivedAt DateTime?` to `Category`. Add index |
| 15 | UI pages/components to add or change? | New `/workspace/categories` page. `getCategories` filter. `mergeCategoryOptions` archived-skip. Category pickers all updated |
