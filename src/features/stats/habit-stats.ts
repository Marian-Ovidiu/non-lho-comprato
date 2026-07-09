import { Prisma } from "@/src/lib/generated/prisma/client";
import { entryMetricMemberFilterSql } from "@/src/lib/entry-metrics-query";
import { round2, toMoneyNumber } from "@/src/lib/money-number";

export type HabitStatsItem = {
  habitId: string;
  habitName: string;
  categoryName: string;
  amount: number;
  totalOccurrences: number;
  spentCount: number;
  avoidedCount: number;
  skippedCount: number;
  pendingCount: number;
  totalSaved: number;
  disciplineRatePercent: number;
};

/** Raw row returned by {@link buildHabitStatsQuery}, one per habit with occurrences. */
export type HabitStatsRow = {
  habitId: string;
  habitName: string;
  categoryName: string;
  amount: unknown;
  totalOccurrences: number;
  spentCount: number;
  avoidedCount: number;
  skippedCount: number;
  pendingCount: number;
};

/**
 * Aggregates habit occurrences by habit in SQL instead of loading every row
 * into memory. When `memberUserId` is set, only occurrences whose linked entry
 * matches that member are counted (same predicate as the entry stats), which
 * also drops pending/skipped occurrences that have no entry — matching the
 * previous Prisma `entry: { is: ... }` behavior. Habits without occurrences are
 * naturally absent (the INNER JOIN starts from HabitOccurrence).
 */
export function buildHabitStatsQuery(
  workspaceId: string,
  memberUserId: string | undefined,
): Prisma.Sql {
  const memberFilter = memberUserId
    ? Prisma.sql`
        AND EXISTS (
          SELECT 1
          FROM "Entry" e
          WHERE e."habitOccurrenceId" = o."id"
            AND e."workspaceId" = ${workspaceId}
            ${entryMetricMemberFilterSql(memberUserId)}
        )
      `
    : Prisma.empty;

  return Prisma.sql`
    SELECT
      h."id" AS "habitId",
      h."name" AS "habitName",
      c."name" AS "categoryName",
      h."amount"::text AS "amount",
      COUNT(*)::int AS "totalOccurrences",
      COUNT(*) FILTER (WHERE o."status"::text = 'spent')::int AS "spentCount",
      COUNT(*) FILTER (WHERE o."status"::text = 'avoided')::int AS "avoidedCount",
      COUNT(*) FILTER (WHERE o."status"::text = 'skipped')::int AS "skippedCount",
      COUNT(*) FILTER (WHERE o."status"::text = 'pending')::int AS "pendingCount"
    FROM "HabitOccurrence" o
    INNER JOIN "Habit" h ON h."id" = o."habitId"
    INNER JOIN "Category" c ON c."id" = h."categoryId"
    WHERE h."workspaceId" = ${workspaceId}
      ${memberFilter}
    GROUP BY h."id", h."name", c."name", h."amount"
  `;
}

/** Turns the grouped SQL rows into the sorted, rounded HabitStatsItem list. */
export function buildHabitStatsFromRows(
  rows: readonly HabitStatsRow[],
): HabitStatsItem[] {
  return rows
    .map((row) => {
      const amount = toMoneyNumber(row.amount);
      const considered = row.avoidedCount + row.spentCount;

      return {
        habitId: row.habitId,
        habitName: row.habitName,
        categoryName: row.categoryName,
        amount,
        totalOccurrences: row.totalOccurrences,
        spentCount: row.spentCount,
        avoidedCount: row.avoidedCount,
        skippedCount: row.skippedCount,
        pendingCount: row.pendingCount,
        totalSaved: round2(row.avoidedCount * amount),
        disciplineRatePercent:
          considered === 0
            ? 0
            : round2((row.avoidedCount / considered) * 100),
      };
    })
    .sort((left, right) => right.totalSaved - left.totalSaved);
}
