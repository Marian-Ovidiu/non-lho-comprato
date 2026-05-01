# Non l'ho Comprato Backend Reference

## Required Files

### `src/lib/prisma.ts`

- Export a singleton `prisma` client.
- Reuse the client during Next.js dev hot reload.
- Keep the file tiny and isolated.

### `src/lib/money.ts`

- `parseMoneyInput(value: unknown)`
- Normalize values to two decimals.
- Reject invalid values.
- Reject negative values unless a caller explicitly allows them.

### `src/lib/entry-calculations.ts`

- `calculateSavedAmount(realCost, alternativeCost)`
- Optional `calculateSavedPercentage(realCost, alternativeCost)`
- Preserve negative savings when `alternativeCost < realCost`.

### `src/actions/entries.ts`

- `createEntry(formData: FormData)`
- `getEntries()`
- `getDashboardSummary()`
- `getEntriesByCategory()`
- Use `revalidatePath` after mutations.
- Keep action files free of UI code.

### `src/types/entries.ts`

- Add only if UI sharing needs it.
- Keep it lightweight and aligned with the database shape.

## Validation Rules

For `createEntry`:

- `title` is required
- `categoryId` is required
- `realCost` is required and must be `>= 0`
- `alternativeCost` is required and must be `>= 0`
- `date` is required
- `note` is optional
- `savedAmount` must be calculated on the server
- allow negative `savedAmount` when `alternativeCost < realCost`
- trim strings before validation and persistence
- return clear, actionable errors

## Money Handling Notes

- Prefer `Decimal` in Prisma.
- Never trust client-calculated savings.
- Normalize money values consistently before writing to the database.
- Keep rounding rules explicit and boring.

## Dashboard Summary

The summary should return:

- `totalRealSpent`
- `totalAlternativeCost`
- `totalSaved`
- `entriesCount`

## Manual Test Checklist

1. Create a normal entry and confirm it appears in the database.
2. Create an entry where `alternativeCost > realCost` and confirm savings are positive.
3. Create an entry where `alternativeCost < realCost` and confirm savings are negative.
4. Submit missing or invalid values and confirm the error message is clear.
5. Load dashboard totals and verify they match the inserted entries.
