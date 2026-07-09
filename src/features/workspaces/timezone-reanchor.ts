import { Prisma } from "@/src/lib/generated/prisma/client";

/**
 * SQL mirror of reanchorDateToTimezone (src/lib/workspace-dates): reads the
 * calendar day the naive stored value represents under `fromTimeZone`, then
 * rewrites it to the canonical midnight of that same day under `toTimeZone`.
 *
 * Steps, inside-out, on a `timestamp` column holding UTC wall-clock:
 *  1. (col AT TIME ZONE 'UTC') AT TIME ZONE from  → local wall-clock under from
 *  2. ::date::timestamp                           → midnight of that day (naive)
 *  3. AT TIME ZONE to                             → the instant of to-midnight
 *  4. AT TIME ZONE 'UTC'                          → naive UTC wall-clock to store
 */
function reanchorExpr(
  column: Prisma.Sql,
  fromTimeZone: string,
  toTimeZone: string,
): Prisma.Sql {
  return Prisma.sql`(
    (
      (((${column} AT TIME ZONE 'UTC') AT TIME ZONE ${fromTimeZone})::date::timestamp)
      AT TIME ZONE ${toTimeZone}
    ) AT TIME ZONE 'UTC'
  )`;
}

/** Re-anchors every Entry.date in the workspace from one timezone to another. */
export function reanchorEntryDatesSql(
  workspaceId: string,
  fromTimeZone: string,
  toTimeZone: string,
): Prisma.Sql {
  return Prisma.sql`
    UPDATE "Entry"
    SET "date" = ${reanchorExpr(Prisma.sql`"date"`, fromTimeZone, toTimeZone)}
    WHERE "workspaceId" = ${workspaceId}
  `;
}

/**
 * Re-anchors every HabitOccurrence.date in the workspace. HabitOccurrence has no
 * workspaceId column, so it is scoped through its habit.
 */
export function reanchorHabitOccurrenceDatesSql(
  workspaceId: string,
  fromTimeZone: string,
  toTimeZone: string,
): Prisma.Sql {
  return Prisma.sql`
    UPDATE "HabitOccurrence"
    SET "date" = ${reanchorExpr(Prisma.sql`"date"`, fromTimeZone, toTimeZone)}
    WHERE "habitId" IN (
      SELECT "id" FROM "Habit" WHERE "workspaceId" = ${workspaceId}
    )
  `;
}
