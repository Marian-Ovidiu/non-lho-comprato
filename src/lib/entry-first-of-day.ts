import type { Prisma } from "@/src/lib/generated/prisma/client";

const ROME_TIME_ZONE = "Europe/Rome";

type EntryDayCountClient = {
  entry: {
    count: (args: Prisma.EntryCountArgs) => Promise<number>;
    findUnique: (
      args: Prisma.EntryFindUniqueArgs,
    ) => Promise<{ id: string } | null>;
  };
};

export function getRomeDayRangeForDate(date: Date): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

  return { start, end };
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
