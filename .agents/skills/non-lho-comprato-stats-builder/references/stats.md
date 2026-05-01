# Non l'ho Comprato Stats Reference

## Required Stats

First version should include:

1. total saved by category
2. real spent by category
3. saved amount over time by month
4. top 10 biggest savings
5. entry count by category
6. average saving per entry

## Data Rules

- Use server-side data fetching.
- Prepare plain arrays before passing to chart components.
- Keep chart component props small and explicit.
- Use euro formatting everywhere money is shown.
- Handle empty states cleanly.

## Recommended Chart Choices

- Bar chart for saved by category
- Bar chart for real spent by category
- Line chart for saved over time
- Simple list or table for top 10 savings
- Compact summary cards for the average and totals

## Query Shape

Prefer a small set of clear query functions rather than one giant stats service.

Suggested functions:

- `getStatsSummary`
- `getSavedByCategory`
- `getRealSpentByCategory`
- `getSavedOverTimeByMonth`
- `getTopSavings`
- `getEntryCountsByCategory`

If habits are included later, keep habit stats separate from entry stats unless the page explicitly combines them.

## UI Notes

- Use cards for summary numbers.
- Keep axes and labels readable on small screens.
- Avoid cluttering the page with too many colors.
- Use simple legends or no legend if the chart already reads clearly.
- Show an empty state when there is no data.

## Manual Test Checklist

1. Open the stats page with no entries and confirm the empty state appears.
2. Add several entries in different categories and confirm the charts update.
3. Confirm euro formatting is correct.
4. Check the page on mobile and confirm labels do not overlap badly.
5. Confirm the top 10 list shows the biggest savings first.
