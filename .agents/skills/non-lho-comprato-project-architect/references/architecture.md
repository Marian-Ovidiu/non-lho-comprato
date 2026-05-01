# Non l'ho Comprato Architecture Reference

## Recommended Folder Structure

```txt
app/
  layout.tsx
  page.tsx
  globals.css

  (dashboard)/
    page.tsx

    entries/
      page.tsx
      [id]/
        page.tsx
      _components/
        entry-form.tsx
        entry-list.tsx
        entry-card.tsx
        entry-empty-state.tsx
      _actions/
        entry-actions.ts
      _lib/
        entry-queries.ts
        entry-schema.ts

    habits/
      page.tsx
      [id]/
        page.tsx
      _components/
        habit-form.tsx
        habit-card.tsx
        habit-schedule-chip.tsx
      _actions/
        habit-actions.ts
      _lib/
        habit-queries.ts
        habit-schema.ts

    stats/
      page.tsx
      _components/
        savings-chart.tsx
        summary-cards.tsx

    goals/
      page.tsx
      _components/
        goal-form.tsx
        goal-card.tsx

    presets/
      page.tsx
      _components/
        preset-form.tsx
        preset-card.tsx

components/
  ui/
  shared/
    page-header.tsx
    empty-state.tsx
    money.tsx
    confirm-dialog.tsx

lib/
  db/
    prisma.ts
    entries.ts
    habits.ts
    goals.ts
    presets.ts
  constants/
    categories.ts
    habits.ts
    routes.ts
  schemas/
    money.ts
    common.ts
  types/
    entry.ts
    habit.ts
    stats.ts
  utils.ts
  dates.ts

prisma/
  schema.prisma
  migrations/
```

## Boundaries

- `app/`: routes, layouts, route-level UI.
- `app/(dashboard)/`: main app area without changing the URL.
- `*_components/`: feature-local UI only.
- `*_actions/`: server actions for that feature only.
- `*_lib/`: feature-local queries and validation.
- `components/ui/`: shadcn/ui base components.
- `components/shared/`: reusable app-specific UI.
- `lib/db/`: all Prisma access in one place.
- `lib/constants/`: stable app-wide lists and settings.
- `lib/schemas/`: shared validation schemas and parsing helpers.
- `lib/types/`: shared app types that are not Prisma-generated.

## Server vs Client

- Server Components:
  - `app/layout.tsx`
  - route `page.tsx` files by default
  - data-fetching views
  - summary pages and read-only displays
- Client Components:
  - forms using `useActionState`
  - dialogs and modals
  - filters, tabs, sort controls
  - local UI state
  - chart wrappers

## Naming

- Use `kebab-case` for folders and files.
- Use `camelCase` for functions and server actions.
- Use `PascalCase` for React component names.
- Keep Prisma model names singular.

## Implementation Order

1. Finalize core database models.
2. Move Prisma access into `lib/db/prisma.ts` and model files.
3. Split actions by feature.
4. Turn entries into a feature module.
5. Add entries list and empty state.
6. Add recurring habits.
7. Add stats.
8. Add goals and presets.
9. Add charts, filtering, and polish.
