import type { Prisma } from "@/src/lib/generated/prisma/client";
import { getDayRangeForDate } from "@/src/lib/workspace-dates";

type EntryDayCountClient = {
  entry: {
    count: (args: Prisma.EntryCountArgs) => Promise<number>;
    findUnique: (
      args: Prisma.EntryFindUniqueArgs,
    ) => Promise<{ id: string } | null>;
  };
};

export function buildEntryDateDayWhere(
  date: Date,
  timeZone: string,
  baseWhere: Prisma.EntryWhereInput = {},
): Prisma.EntryWhereInput {
  const { start, end } = getDayRangeForDate(date, timeZone);

  return {
    ...baseWhere,
    date: {
      gte: start,
      lt: end,
    },
  };
}

export async function countEntriesOnDay(
  date: Date,
  timeZone: string,
  baseWhere: Prisma.EntryWhereInput,
  client: EntryDayCountClient,
  options?: { excludeEntryId?: string },
): Promise<number> {
  const where = buildEntryDateDayWhere(date, timeZone, baseWhere);

  if (options?.excludeEntryId) {
    return client.entry.count({
      where: {
        ...where,
        id: { not: options.excludeEntryId },
      },
    });
  }

  return client.entry.count({ where });
}

export async function resolveIsFirstEntryOfDay(
  date: Date,
  timeZone: string,
  baseWhere: Prisma.EntryWhereInput,
  client: EntryDayCountClient,
  options?: { excludeEntryId?: string },
): Promise<boolean> {
  const count = await countEntriesOnDay(date, timeZone, baseWhere, client, options);
  return count === 0;
}

export async function resolveIsFirstEntryOfDayForHabitOccurrence(
  date: Date,
  timeZone: string,
  baseWhere: Prisma.EntryWhereInput,
  client: EntryDayCountClient,
  habitOccurrenceId: string,
): Promise<boolean> {
  const existingEntry = await client.entry.findUnique({
    where: { habitOccurrenceId },
    select: { id: true },
  });

  return resolveIsFirstEntryOfDay(date, timeZone, baseWhere, client, {
    excludeEntryId: existingEntry?.id,
  });
}
