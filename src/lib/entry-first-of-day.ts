import type { Prisma } from "@/src/lib/generated/prisma/client";
import {
  getRomeDayRangeForDate as getRomeDayRangeForDateInRomeDates,
} from "@/src/lib/rome-dates";

type EntryDayCountClient = {
  entry: {
    count: (args: Prisma.EntryCountArgs) => Promise<number>;
    findUnique: (
      args: Prisma.EntryFindUniqueArgs,
    ) => Promise<{ id: string } | null>;
  };
};

export function getRomeDayRangeForDate(date: Date): { start: Date; end: Date } {
  return getRomeDayRangeForDateInRomeDates(date);
}

export function buildEntryDateDayWhere(
  date: Date,
  baseWhere: Prisma.EntryWhereInput = {},
): Prisma.EntryWhereInput {
  const { start, end } = getRomeDayRangeForDate(date);

  return {
    ...baseWhere,
    date: {
      gte: start,
      lt: end,
    },
  };
}

export async function countEntriesOnRomeDay(
  date: Date,
  baseWhere: Prisma.EntryWhereInput,
  client: EntryDayCountClient,
  options?: { excludeEntryId?: string },
): Promise<number> {
  const where = buildEntryDateDayWhere(date, baseWhere);

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
  baseWhere: Prisma.EntryWhereInput,
  client: EntryDayCountClient,
  options?: { excludeEntryId?: string },
): Promise<boolean> {
  const count = await countEntriesOnRomeDay(date, baseWhere, client, options);
  return count === 0;
}

export async function resolveIsFirstEntryOfDayForHabitOccurrence(
  date: Date,
  baseWhere: Prisma.EntryWhereInput,
  client: EntryDayCountClient,
  habitOccurrenceId: string,
): Promise<boolean> {
  const existingEntry = await client.entry.findUnique({
    where: { habitOccurrenceId },
    select: { id: true },
  });

  return resolveIsFirstEntryOfDay(date, baseWhere, client, {
    excludeEntryId: existingEntry?.id,
  });
}
