# Non l'ho Comprato UI Reference

## Design Goals

- Mobile-first.
- Fast to scan.
- Clean and personal.
- Slightly playful, never childish.
- All visible text in Italian.

## Required Screens

### Dashboard

Path:

- `src/app/page.tsx`

Must show:

- total spent this month
- total alternative cost this month
- total saved this month
- number of entries
- CTA to add a new entry

### New Entry

Suggested path:

- `src/app/entries/new/page.tsx`

or a component inside the dashboard if that fits the app better.

Must show:

- title
- category select
- realCost
- alternativeCost
- date
- note

### Entries List

Must show:

- title
- category
- real cost
- alternative cost
- saved amount
- date
- note if present

### Empty State

If there are no entries, show:

- a friendly message
- a clear CTA

## Required Components

- `src/components/dashboard/summary-cards.tsx`
- `src/components/entries/entry-form.tsx`
- `src/components/entries/entry-list.tsx`
- `src/components/entries/entry-card.tsx`
- `src/components/layout/app-shell.tsx` if useful

## Component Rules

- Use Server Components for data fetching and page composition.
- Use a Client Component for the form if it needs `useActionState`, pending state, or reset behavior.
- Keep shadcn/ui usage straightforward.
- Use cards for dashboard content.
- Avoid unnecessary modals.
- Use responsive spacing and typography.
- Ensure inputs use correct types: `number`, `date`, `text`.
- Submit buttons must show a pending state.

## Backend Assumptions

Use the existing server actions and getters already defined by the backend skill.
Do not invent new backend abstractions in the UI layer.

## Manual Test Checklist

1. Open the dashboard on mobile and confirm the cards stack cleanly.
2. Submit a new entry and verify the form shows pending state.
3. Confirm the dashboard updates with real data.
4. Confirm the entries list shows title, category, money, date, and note.
5. Confirm the empty state appears when there are no entries.
