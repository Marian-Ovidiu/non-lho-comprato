---
name: non-lho-comprato-stats-builder
description: Use when the user asks for analytics dashboards, statistics pages, chart components, Recharts, or money/category/time summaries for Non l'ho comprato.
---

# Non l'ho Comprato Stats Builder

Use this skill when the task is about building the statistics page and analytics charts.

## Core Goal

Build a stats page that helps the user understand:

- how much they actually spent
- how much they would have spent
- how much they saved
- which categories save the most money
- which habits are expensive
- which days or months are best or worst

## Rules

- Fetch data on the server.
- Prepare plain arrays for chart components.
- Keep chart props simple.
- Use client components only for charts and other interactive visualizations.
- Do not fetch inside client components.
- Do not use fake data.
- Keep charts readable on mobile.
- Avoid too many chart types.
- Keep all visible text in Italian.

## Recommended Output

Return practical implementation code for:

1. data query functions
2. `src/app/stats/page.tsx`
3. chart components
4. empty state
5. manual test checklist

## Canonical Reference

See [`references/stats.md`](references/stats.md) for the preferred query shape, chart choices, and UI expectations.
