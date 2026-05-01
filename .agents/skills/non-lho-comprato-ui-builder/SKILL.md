---
name: non-lho-comprato-ui-builder
description: Use when the user asks for Next.js App Router UI, Tailwind, shadcn/ui pages, components, layout, empty states, or responsive frontend code for Non l'ho comprato.
---

# Non l'ho Comprato UI Builder

Use this skill when the task is about building the visible app interface for the MVP.

## Core Goal

Build a mobile-first, clean, slightly playful UI for:

- dashboard totals
- new entry form
- entries list
- empty states
- loading and pending states

## Rules

- Use shadcn/ui components.
- Keep visible UI text in Italian.
- Prefer Server Components for data fetching and page composition.
- Use a Client Component only where interaction is needed, especially the form.
- Do not put Prisma in Client Components.
- Do not invent temporary fake data unless clearly marked and isolated.
- Use euros everywhere money is shown.
- Keep forms short, obvious, and easy on mobile.
- Use accessible labels and semantic structure.

## When answering

Return practical UI code for the requested files:

1. `src/app/page.tsx`
2. `src/app/entries/new/page.tsx` if needed
3. `src/components/dashboard/summary-cards.tsx`
4. `src/components/entries/entry-form.tsx`
5. `src/components/entries/entry-list.tsx`
6. `src/components/entries/entry-card.tsx`
7. `src/components/layout/app-shell.tsx` if useful

## Canonical Reference

See [`references/ui.md`](references/ui.md) for the preferred layout, component split, and manual test checklist.
