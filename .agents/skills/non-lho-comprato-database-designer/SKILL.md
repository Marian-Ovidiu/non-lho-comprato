---
name: non-lho-comprato-database-designer
description: Use when the user asks for a Prisma/PostgreSQL schema or data model for Non l'ho comprato, especially entries, categories, recurring habits, habit occurrences, and goals.
---

# Non l'ho Comprato Database Designer

Use this skill when the task is about Prisma schema design, table modeling, or PostgreSQL structure.

## Core Goal

Create a simple Prisma schema that supports:

- manual entries now
- categories now
- recurring habits soon
- daily habit occurrences soon
- goals later

## Rules

- Keep the schema small and explicit.
- Use `Decimal` for money, never `Float`.
- Include `createdAt` and `updatedAt` on persisted models.
- Avoid premature normalization.
- Use enums only where they add clarity.
- Assume single-user for now unless `userId` is clearly useful for future Supabase Auth compatibility.
- Do not add unnecessary tables.

## When answering

Return practical database guidance that a junior developer can implement directly:

1. Full `prisma/schema.prisma` code
2. Explanation of every model
3. Explanation of every enum
4. Notes about money fields
5. Notes about future Supabase Auth compatibility
6. Suggested seed data for default categories

## Canonical Reference

See [`references/schema.md`](references/schema.md) for the preferred baseline schema and modeling notes.
