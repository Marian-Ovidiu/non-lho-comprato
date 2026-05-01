---
name: non-lho-comprato-backend-logic-builder
description: Use when the user asks for backend logic, Prisma access, money parsing, entry calculations, or server actions for Non l'ho comprato.
---

# Non l'ho Comprato Backend Logic Builder

Use this skill when the task is about implementing the MVP backend for entries and dashboard totals.

## Core Goal

Build readable server-side logic for:

- creating manual entries
- listing entries
- reading dashboard totals
- reading category totals
- validating and normalizing money safely

## Rules

- Prefer Server Actions.
- Keep calculations on the server.
- Validate input before writing to the database.
- Keep money handling explicit and safe.
- Do not rely on client-side saved amount calculations.
- Do not introduce extra libraries unless the user explicitly asks.
- Do not hide business rules behind clever abstractions.

## When answering

Return practical backend code for the requested files:

1. `src/lib/prisma.ts`
2. `src/lib/money.ts`
3. `src/lib/entry-calculations.ts`
4. `src/actions/entries.ts`
5. `src/types/entries.ts` if needed

## Canonical Reference

See [`references/backend.md`](references/backend.md) for the baseline implementation shape, validation rules, and manual test notes.
