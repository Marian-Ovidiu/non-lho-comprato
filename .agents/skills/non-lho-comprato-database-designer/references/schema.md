# Non l'ho Comprato Schema Reference

## Models

### Category

Stores the category chosen by the user for entries and habits.

- `id`
- `name`
- `slug`
- timestamps

### Entry

Stores manual saving entries.

- `title`
- `categoryId`
- `realCost`
- `alternativeCost`
- `savedAmount`
- `date`
- `note`
- timestamps

### Habit

Stores recurring expected expenses.

- `title`
- `categoryId`
- `cost`
- `daysOfWeek`
- `isActive`
- timestamps

### HabitOccurrence

Stores the daily generated or expected instance of a habit.

- `habitId`
- `date`
- `status`
- `realCost`
- `alternativeCost`
- `savedAmount`
- `note`
- timestamps

### Goal

Stores savings goals for later tracking.

- `title`
- `targetAmount`
- `currentAmount`
- `targetDate`
- `note`
- timestamps

## Enum

### HabitOccurrenceStatus

Use one enum for the habit occurrence lifecycle:

- `pending`
- `spent`
- `avoided`
- `skipped`

## Money Notes

- Use `Decimal @db.Numeric(12, 2)` for all money fields.
- Keep `savedAmount` stored explicitly when it is part of the UX.
- For simple derived displays, it is still fine to recompute in the app layer when needed.
- Keep all money values non-negative unless a later business rule explicitly needs refunds or adjustments.

## Supabase Auth Notes

- Do not add a `User` table yet if the app is single-user.
- If Supabase Auth is added later, the cleanest migration path is to add nullable `userId` fields to the core user-owned models.
- Keep category names and defaults global for now unless multi-user customization becomes necessary.

## Suggested Seed Categories

- Food
- Coffee
- Groceries
- Transport
- Home
- Health
- Travel
- Shopping
- Entertainment
- Work
