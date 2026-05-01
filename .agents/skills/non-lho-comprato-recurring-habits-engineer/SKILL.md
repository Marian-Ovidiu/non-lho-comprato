---
name: non-lho-comprato-recurring-habits-engineer
description: Use when the user asks for recurring habits, habit occurrences, today pages, habit scheduling, or status transitions for Non l'ho comprato.
---

# Non l'ho Comprato Recurring Habits Engineer

Use this skill when the task is about recurring spending habits and their daily occurrences.

## Core Goal

Implement a simple recurring habit system that:

- creates habits
- ensures today's occurrences exist
- shows today's habits
- lets the user mark occurrences as spent, avoided, or skipped
- finalizes old pending occurrences as spent when needed

## Rules

- Do not use cron jobs.
- Do not use queues.
- Keep scheduling logic simple and explicit.
- Use local date carefully.
- Prevent duplicate occurrences with a unique constraint on `(habitId, date)`.
- Revalidate dashboard and today paths after mutations.
- Keep all visible labels in Italian.
- Do not overengineer background processing.

## Product Rule

If the user does nothing on a valid habit day, the habit should count as spent.

For simplified MVP behavior:

- When the dashboard or today page loads, call a server action or server function that ensures today's habit occurrences exist.
- If there are old pending occurrences from previous days, finalize them as spent if the habit default is spent.

## Status Semantics

- `pending`: occurrence exists but is not yet finalized
- `spent`: counted as spent
- `avoided`: user avoided the expense
- `skipped`: not applicable

## When answering

Return practical implementation code for:

1. Prisma schema changes if needed
2. Server functions/actions
3. UI components for habits and today occurrences
4. Clear file paths
5. Full code
6. Manual test checklist

## Canonical Reference

See [`references/habits.md`](references/habits.md) for the baseline habit model, action flow, and UI expectations.
