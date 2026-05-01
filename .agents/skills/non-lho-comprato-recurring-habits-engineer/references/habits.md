# Non l'ho Comprato Recurring Habits Reference

## Required Behavior

- A habit is the recurring rule.
- A habit occurrence is the concrete item for a specific date.
- Avoid duplicate occurrences for the same habit and date.
- If the user does nothing, the habit eventually counts as spent.

## Suggested Prisma Changes

If the schema does not already include them, use:

- `Habit`
- `HabitOccurrence`
- `HabitOccurrenceStatus` enum
- unique constraint on `(habitId, date)`

## Server Actions / Functions

### `createHabit`

- Validate title, amount, category, and active days.
- Persist the recurring rule.

### `getHabits`

- Read all habits for the dashboard or settings views.

### `ensureTodayHabitOccurrences`

- Compute today's local date.
- Create missing occurrences for habits active today.
- Do not duplicate existing rows.
- Finalize old pending occurrences if they should count as spent.

### `getTodayHabitOccurrences`

- Return today's occurrences with their habit metadata.

### `markHabitOccurrenceSpent`

- Set status to `spent`.
- Set monetary fields so the occurrence counts as spent.

### `markHabitOccurrenceAvoided`

- Set status to `avoided`.
- Set monetary fields so the occurrence counts as avoided.

### `markHabitOccurrenceSkipped`

- Set status to `skipped`.
- Set monetary fields to zero.

### `finalizeOldPendingOccurrences`

- Find pending occurrences from previous days.
- Finalize them as spent when the habit default behavior is spent.
- Keep the rule explicit and deterministic.

## Money Logic

For a habit occurrence:

- `pending`: no final dashboard effect yet, or optionally count as expected; choose one approach and keep it consistent
- `spent`: `realCost = amount`, `alternativeCost = amount`, `savedAmount = 0`
- `avoided`: `realCost = 0`, `alternativeCost = amount`, `savedAmount = amount`
- `skipped`: `realCost = 0`, `alternativeCost = 0`, `savedAmount = 0`

Recommended MVP approach:

- treat `pending` as not yet final in the UI
- finalize old pending rows on load so totals stay simple

## UI Expectations

- Habit form
- Today habit list
- Occurrence action buttons

All visible text should be in Italian.

## Manual Test Checklist

1. Create a weekday coffee habit.
2. Open the today page and confirm today's occurrence appears.
3. Mark it as avoided.
4. Confirm saved amount increases.
5. Mark a similar occurrence as spent.
6. Confirm spent amount increases and saved amount becomes zero.
7. Refresh and confirm duplicate occurrences are not created.
