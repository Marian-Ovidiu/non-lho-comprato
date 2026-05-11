"use server";

import type { Prisma } from "@/src/lib/generated/prisma/client";
import type { PersonFilterValue } from "@/src/lib/person-filter";
import { formatMoney } from "@/src/lib/formatters";
import { prisma } from "@/src/lib/prisma";

type DecimalLike = {
  toString?: () => string;
};

export type MonthlyReportMonthOption = {
  value: string;
  label: string;
};

export type MonthlyReportOverview = {
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
  averageSavedPerEntry: number;
  savingRatePercent: number;
};

export type MonthlyReportPersonSplitItem = {
  key: "MARIAN" | "MARTINA" | "TUTTI" | "TOTAL";
  label: string;
  totalSaved: number;
  entriesCount: number;
  sharePercent: number;
};

export type MonthlyReportBestCategory = {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  totalSaved: number;
  entriesCount: number;
} | null;

export type MonthlyReportBiggestSaving = {
  id: string;
  title: string;
  categoryName: string;
  date: Date;
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  person: PersonFilterValue;
  note: string | null;
} | null;

export type MonthlyReportHabitSummary = {
  totalHabits: number;
  totalOccurrences: number;
  spentCount: number;
  avoidedCount: number;
  skippedCount: number;
  pendingCount: number;
  totalSaved: number;
  disciplineRatePercent: number;
};

export type MonthlyReportStreakSummary = {
  currentStreak: number;
  bestStreak: number;
  streakDates: string[];
  savedDaysCount: number;
};

export type MonthlyReportData = {
  monthKey: string;
  monthLabel: string;
  hasData: boolean;
  overview: MonthlyReportOverview;
  personSplit: MonthlyReportPersonSplitItem[];
  bestCategory: MonthlyReportBestCategory;
  biggestSaving: MonthlyReportBiggestSaving;
  habitSummary: MonthlyReportHabitSummary;
  streakSummary: MonthlyReportStreakSummary;
  recap: string;
};

export type MonthlyReportPageData = {
  selectedMonth: string;
  selectedMonthLabel: string;
  monthOptions: MonthlyReportMonthOption[];
  report: MonthlyReportData;
};

const ROME_TIME_ZONE = "Europe/Rome";

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === "object") {
    const decimal = value as DecimalLike;
    if (typeof decimal.toString === "function") {
      const parsed = Number(decimal.toString().replace(",", "."));
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  return 0;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getRomeDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

function getRomeMonthKey(date: Date): string {
  const parts = getRomeDateParts(date);

  if (!Number.isFinite(parts.year) || !Number.isFinite(parts.month)) {
    return "";
  }

  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(
    2,
    "0",
  )}`;
}

function getRomeDateKey(date: Date): string {
  const parts = getRomeDateParts(date);

  if (
    !Number.isFinite(parts.year) ||
    !Number.isFinite(parts.month) ||
    !Number.isFinite(parts.day)
  ) {
    return "";
  }

  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(
    2,
    "0",
  )}-${String(parts.day).padStart(2, "0")}`;
}

function normalizeMonthKey(input?: string): string {
  if (input && /^\d{4}-\d{2}$/.test(input)) {
    const [yearPart, monthPart] = input.split("-");
    const year = Number(yearPart);
    const month = Number(monthPart);

    if (Number.isFinite(year) && month >= 1 && month <= 12) {
      return input;
    }
  }

  return getRomeMonthKey(new Date());
}

function getMonthRangeUtc(monthKey: string): { start: Date; end: Date } {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));

  return { start, end };
}

function formatMonthLabel(monthKey: string): string {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return monthKey;
  }

  const raw = new Intl.DateTimeFormat("it-IT", {
    timeZone: ROME_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, monthIndex, 1)));

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function buildMonthOptions(dates: Date[]): MonthlyReportMonthOption[] {
  const monthKeys = new Set<string>();

  for (const date of dates) {
    const key = getRomeMonthKey(date);
    if (key) {
      monthKeys.add(key);
    }
  }

  const currentMonth = normalizeMonthKey();
  monthKeys.add(currentMonth);

  return Array.from(monthKeys)
    .sort((left, right) => right.localeCompare(left))
    .map((value) => ({
      value,
      label: formatMonthLabel(value),
    }));
}

function buildEntryWhere(monthKey: string): Prisma.EntryWhereInput {
  const { start, end } = getMonthRangeUtc(monthKey);

  return {
    date: {
      gte: start,
      lt: end,
    },
  };
}

function buildHabitOccurrenceWhere(monthKey: string): Prisma.HabitOccurrenceWhereInput {
  const { start, end } = getMonthRangeUtc(monthKey);

  return {
    date: {
      gte: start,
      lt: end,
    },
  };
}

function buildStreakSummary(dayTotals: Map<string, number>): MonthlyReportStreakSummary {
  const savedDates = Array.from(dayTotals.entries())
    .filter(([, totalSaved]) => totalSaved > 0)
    .map(([dateKey]) => dateKey)
    .sort((left, right) => left.localeCompare(right));

  if (savedDates.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      streakDates: [],
      savedDaysCount: 0,
    };
  }

  const segments: string[][] = [];
  let currentSegment = [savedDates[0]];

  for (let index = 1; index < savedDates.length; index += 1) {
    const currentDate = savedDates[index];
    const previousDate = currentSegment[currentSegment.length - 1];
    const previousAsDate = new Date(`${previousDate}T00:00:00.000Z`);
    previousAsDate.setUTCDate(previousAsDate.getUTCDate() + 1);
    const nextDate = getRomeDateKey(previousAsDate);

    if (nextDate === currentDate) {
      currentSegment.push(currentDate);
      continue;
    }

    segments.push(currentSegment);
    currentSegment = [currentDate];
  }

  segments.push(currentSegment);

  const bestSegment = segments.reduce((longest, segment) =>
    segment.length > longest.length ? segment : longest,
  );
  const latestSegment = segments[segments.length - 1];

  return {
    currentStreak: latestSegment.length,
    bestStreak: bestSegment.length,
    streakDates: latestSegment,
    savedDaysCount: savedDates.length,
  };
}

function emptyReport(monthKey: string): MonthlyReportData {
  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    hasData: false,
    overview: {
      totalRealSpent: 0,
      totalAlternativeCost: 0,
      totalSaved: 0,
      entriesCount: 0,
      averageSavedPerEntry: 0,
      savingRatePercent: 0,
    },
    personSplit: [
      { key: "MARIAN", label: "Marian", totalSaved: 0, entriesCount: 0, sharePercent: 0 },
      { key: "MARTINA", label: "Martina", totalSaved: 0, entriesCount: 0, sharePercent: 0 },
        { key: "TUTTI", label: "Condivise", totalSaved: 0, entriesCount: 0, sharePercent: 0 },
      { key: "TOTAL", label: "Totale", totalSaved: 0, entriesCount: 0, sharePercent: 100 },
    ],
    bestCategory: null,
    biggestSaving: null,
    habitSummary: {
      totalHabits: 0,
      totalOccurrences: 0,
      spentCount: 0,
      avoidedCount: 0,
      skippedCount: 0,
      pendingCount: 0,
      totalSaved: 0,
      disciplineRatePercent: 0,
    },
    streakSummary: {
      currentStreak: 0,
      bestStreak: 0,
      streakDates: [],
      savedDaysCount: 0,
    },
    recap: `Nessun dato disponibile per ${formatMonthLabel(monthKey).toLowerCase()}.`,
  };
}

export async function getMonthlyReport(
  requestedMonth?: string,
): Promise<MonthlyReportPageData> {
  const selectedMonth = normalizeMonthKey(requestedMonth);

  try {
    const [
      monthEntries,
      monthOccurrences,
      allEntryDates,
      allOccurrenceDates,
    ] = await Promise.all([
      prisma.entry.findMany({
        where: buildEntryWhere(selectedMonth),
        select: {
          id: true,
          title: true,
          date: true,
          realCost: true,
          alternativeCost: true,
          savedAmount: true,
          note: true,
          person: true,
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      }),
      prisma.habitOccurrence.findMany({
        where: buildHabitOccurrenceWhere(selectedMonth),
        select: {
          status: true,
          habitId: true,
          habit: {
            select: {
              id: true,
              name: true,
              amount: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.entry.findMany({
        select: {
          date: true,
        },
        orderBy: {
          date: "asc",
        },
      }),
      prisma.habitOccurrence.findMany({
        select: {
          date: true,
        },
        orderBy: {
          date: "asc",
        },
      }),
    ]);

    const monthOptions = buildMonthOptions([
      ...allEntryDates.map((item) => item.date),
      ...allOccurrenceDates.map((item) => item.date),
    ]);

    if (monthEntries.length === 0 && monthOccurrences.length === 0) {
      return {
        selectedMonth,
        selectedMonthLabel: formatMonthLabel(selectedMonth),
        monthOptions,
        report: emptyReport(selectedMonth),
      };
    }

    const totalRealSpent = round2(
      monthEntries.reduce((total, entry) => total + toNumber(entry.realCost), 0),
    );
    const totalAlternativeCost = round2(
      monthEntries.reduce(
        (total, entry) => total + toNumber(entry.alternativeCost),
        0,
      ),
    );
    const totalSaved = round2(
      monthEntries.reduce((total, entry) => total + toNumber(entry.savedAmount), 0),
    );
    const entriesCount = monthEntries.length;
    const averageSavedPerEntry =
      entriesCount === 0 ? 0 : round2(totalSaved / entriesCount);
    const savingRatePercent =
      totalAlternativeCost === 0
        ? 0
        : round2((totalSaved / totalAlternativeCost) * 100);

    const personTotals = {
      MARIAN: {
        totalSaved: 0,
        entriesCount: 0,
      },
      MARTINA: {
        totalSaved: 0,
        entriesCount: 0,
      },
      TUTTI: {
        totalSaved: 0,
        entriesCount: 0,
      },
    };

    for (const entry of monthEntries) {
      const current = personTotals[entry.person];
      current.totalSaved = round2(current.totalSaved + toNumber(entry.savedAmount));
      current.entriesCount += 1;
    }

    const personSplit: MonthlyReportPersonSplitItem[] = [
      {
        key: "MARIAN",
        label: "Marian",
        totalSaved: personTotals.MARIAN.totalSaved,
        entriesCount: personTotals.MARIAN.entriesCount,
        sharePercent:
          totalSaved === 0
            ? 0
            : round2((personTotals.MARIAN.totalSaved / totalSaved) * 100),
      },
      {
        key: "MARTINA",
        label: "Martina",
        totalSaved: personTotals.MARTINA.totalSaved,
        entriesCount: personTotals.MARTINA.entriesCount,
        sharePercent:
          totalSaved === 0
            ? 0
            : round2((personTotals.MARTINA.totalSaved / totalSaved) * 100),
      },
      {
        key: "TUTTI",
        label: "Condivise",
        totalSaved: personTotals.TUTTI.totalSaved,
        entriesCount: personTotals.TUTTI.entriesCount,
        sharePercent:
          totalSaved === 0
            ? 0
            : round2((personTotals.TUTTI.totalSaved / totalSaved) * 100),
      },
      {
        key: "TOTAL",
        label: "Totale",
        totalSaved,
        entriesCount,
        sharePercent: 100,
      },
    ];

    const categoryMap = new Map<
      string,
      {
        categoryName: string;
        categorySlug: string;
        totalSaved: number;
        entriesCount: number;
      }
    >();

    let biggestSaving: MonthlyReportBiggestSaving = null;

    for (const entry of monthEntries) {
      const current = categoryMap.get(entry.category.slug) ?? {
        categoryName: entry.category.name,
        categorySlug: entry.category.slug,
        totalSaved: 0,
        entriesCount: 0,
      };

      current.totalSaved = round2(current.totalSaved + toNumber(entry.savedAmount));
      current.entriesCount += 1;
      categoryMap.set(entry.category.slug, current);

      if (
        !biggestSaving ||
        toNumber(entry.savedAmount) > biggestSaving.savedAmount
      ) {
        biggestSaving = {
          id: entry.id,
          title: entry.title,
          categoryName: entry.category.name,
          date: entry.date,
          realCost: toNumber(entry.realCost),
          alternativeCost: toNumber(entry.alternativeCost),
          savedAmount: toNumber(entry.savedAmount),
          person: entry.person,
          note: entry.note,
        };
      }
    }

    const bestCategory =
      categoryMap.size === 0
        ? null
        : Array.from(categoryMap.entries())
            .map(([categoryId, totals]) => ({
              categoryId,
              categoryName: totals.categoryName,
              categorySlug: totals.categorySlug,
              totalSaved: totals.totalSaved,
              entriesCount: totals.entriesCount,
            }))
            .sort((left, right) => {
              if (right.totalSaved !== left.totalSaved) {
                return right.totalSaved - left.totalSaved;
              }

              return right.entriesCount - left.entriesCount;
            })[0] ?? null;

    const habitSummary: MonthlyReportHabitSummary = monthOccurrences.reduce(
      (summary, occurrence) => {
        summary.totalOccurrences += 1;

        switch (occurrence.status) {
          case "spent":
            summary.spentCount += 1;
            break;
          case "avoided":
            summary.avoidedCount += 1;
            summary.totalSaved = round2(
              summary.totalSaved + toNumber(occurrence.habit.amount),
            );
            break;
          case "skipped":
            summary.skippedCount += 1;
            break;
          default:
            summary.pendingCount += 1;
            break;
        }

        return summary;
      },
      {
        totalHabits: 0,
        totalOccurrences: 0,
        spentCount: 0,
        avoidedCount: 0,
        skippedCount: 0,
        pendingCount: 0,
        totalSaved: 0,
        disciplineRatePercent: 0,
      },
    );

    habitSummary.totalHabits = new Set(
      monthOccurrences.map((item) => item.habitId),
    ).size;
    habitSummary.disciplineRatePercent =
      habitSummary.avoidedCount + habitSummary.spentCount === 0
        ? 0
        : round2(
            (habitSummary.avoidedCount /
              (habitSummary.avoidedCount + habitSummary.spentCount)) *
              100,
          );

    const dayTotals = new Map<string, number>();
    for (const entry of monthEntries) {
      const dateKey = getRomeDateKey(entry.date);
      if (!dateKey) {
        continue;
      }

      const currentTotal = dayTotals.get(dateKey) ?? 0;
      dayTotals.set(dateKey, round2(currentTotal + toNumber(entry.savedAmount)));
    }

    const streakSummary = buildStreakSummary(dayTotals);
    const monthLabel = formatMonthLabel(selectedMonth);
    const monthLower = monthLabel.toLowerCase();

    const recapParts = [
      `A ${monthLower} avete risparmiato ${formatMoney(totalSaved)}.`,
      `Marian ha risparmiato ${formatMoney(personTotals.MARIAN.totalSaved)}, Martina ${formatMoney(personTotals.MARTINA.totalSaved)}, Condivise ${formatMoney(personTotals.TUTTI.totalSaved)}.`,
      bestCategory
        ? `La categoria migliore e stata ${bestCategory.categoryName}.`
        : "Nessuna categoria si e distinta questo mese.",
      biggestSaving
        ? `La schivata del mese: ${biggestSaving.title} (+${formatMoney(
            biggestSaving.savedAmount,
          )}).`
        : "Nessuna schivata rilevante da segnalare.",
    ];

    return {
      selectedMonth,
      selectedMonthLabel: monthLabel,
      monthOptions,
      report: {
        monthKey: selectedMonth,
        monthLabel,
        hasData: true,
        overview: {
          totalRealSpent,
          totalAlternativeCost,
          totalSaved,
          entriesCount,
          averageSavedPerEntry,
          savingRatePercent,
        },
        personSplit,
        bestCategory,
        biggestSaving,
        habitSummary,
        streakSummary,
        recap: recapParts.join(" "),
      },
    };
  } catch (error) {
    console.error("Failed to load monthly report:", error);
    const monthOptions = buildMonthOptions([]);

    return {
      selectedMonth,
      selectedMonthLabel: formatMonthLabel(selectedMonth),
      monthOptions,
      report: emptyReport(selectedMonth),
    };
  }
}
