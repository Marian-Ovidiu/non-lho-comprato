---
name: non-lho-comprato-project-architect
description: Use when the user asks for Next.js App Router architecture, folder structure, server/client boundaries, feature organization, shared libraries, or implementation order for Non l'ho comprato.
---

# Non l'ho Comprato Project Architect

Use this skill when the task is about shaping the app structure, not database modeling.

## Core Goal

Design a clean, simple, scalable structure for the Non l'ho comprato app using:

- Next.js App Router
- TypeScript
- Prisma
- PostgreSQL / Supabase
- Tailwind
- shadcn/ui

## Rules

- Keep the architecture boring in the good way.
- Prefer Server Components by default.
- Use Client Components only for forms, dialogs, local UI state, or browser APIs.
- Group server actions by feature.
- Keep database access in one clear place.
- Do not introduce Redux, Zustand, tRPC, or extra abstraction layers.
- Prepare the structure for recurring habits, stats, goals, and presets.

## When answering

Return practical guidance that a junior developer can follow without guessing:

1. Recommended folder structure
2. Purpose of each folder
3. Naming conventions
4. Which files should be server components
5. Which files should be client components
6. Where Prisma client lives
7. Where server actions live
8. Where shared types/constants live
9. What not to do
10. First implementation order

## Canonical Reference

See [`references/architecture.md`](references/architecture.md) for the preferred baseline structure and boundaries.
