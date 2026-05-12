"use server";

import type { Prisma } from "@/src/lib/generated/prisma/client";
import { buildPersonWhere, type PersonFilterValue } from "@/src/lib/person-filter";
import { prisma } from "@/src/lib/prisma";
import { getCurrentWorkspaceScopedWhere } from "@/src/lib/workspace-context";

type StreakResult = {
  currentStreak: number;
  bestStreak: number;
  streakDates: string[];
};

type TodaySavingStatus = {
  hasSavedToday: boolean;
  totalSavedToday: number;
};

type DecimalLike = {
  toString?: () => string;
};

type StreakScope = {
  person?: PersonFilterValue;
  categoryId?: string;
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

async function buildEntryWhere(scope: StreakScope = {}): Promise<Prisma.EntryWhereInput> {
  const where: Prisma.EntryWhereInput = {};
  const workspaceWhere = await getCurrentWorkspaceScopedWhere();

  Object.assign(where, buildPersonWhere(scope.person));
  Object.assign(where, workspaceWhere);

  if (scope.categoryId) {
    where.categoryId = scope.categoryId;
  }

  return where;
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

  return {
    year,
    month,
    day,
  };
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

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return "";
  }

  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() + deltaDays);

  return `${String(shifted.getUTCFullYear()).padStart(4, "0")}-${String(
    shifted.getUTCMonth() + 1,
  ).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

function isNextCalendarDay(previousDateKey: string, nextDateKey: string): boolean {
  return shiftDateKey(previousDateKey, 1) === nextDateKey;
}

function buildStreakResult(dayTotals: Map<string, number>): StreakResult {
  const streakDates = Array.from(dayTotals.entries())
    .filter(([, totalSaved]) => totalSaved > 0)
    .map(([dateKey]) => dateKey)
    .sort((left, right) => left.localeCompare(right));

  if (streakDates.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      streakDates: [],
    };
  }

  const segments: string[][] = [];
  let currentSegment = [streakDates[0]];

  for (let index = 1; index < streakDates.length; index += 1) {
    const currentDate = streakDates[index];
    const previousDate = currentSegment[currentSegment.length - 1];

    if (isNextCalendarDay(previousDate, currentDate)) {
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
  };
}

async function loadStreakData(scope: StreakScope = {}): Promise<{
  streak: StreakResult;
  today: TodaySavingStatus;
}> {
  try {
    const entries = await prisma.entry.findMany({
      where: await buildEntryWhere(scope),
      select: {
        date: true,
        savedAmount: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    const dayTotals = new Map<string, number>();

    for (const entry of entries) {
      const dateKey = getRomeDateKey(entry.date);
      if (!dateKey) {
        continue;
      }

      const currentTotal = dayTotals.get(dateKey) ?? 0;
      dayTotals.set(dateKey, round2(currentTotal + toNumber(entry.savedAmount)));
    }

    const streak = buildStreakResult(dayTotals);
    const todayKey = getRomeDateKey(new Date());
    const totalSavedToday = round2(dayTotals.get(todayKey) ?? 0);

    return {
      streak,
      today: {
        hasSavedToday: totalSavedToday > 0,
        totalSavedToday,
      },
    };
  } catch (error) {
    console.error("Failed to load streak data:", error);
    return {
      streak: {
        currentStreak: 0,
        bestStreak: 0,
        streakDates: [],
      },
      today: {
        hasSavedToday: false,
        totalSavedToday: 0,
      },
    };
  }
}

export async function getGlobalStreak(): Promise<StreakResult> {
  const { streak } = await loadStreakData();
  return streak;
}

export async function getPersonStreak(
  person: PersonFilterValue,
): Promise<StreakResult> {
  const { streak } = await loadStreakData({ person });
  return streak;
}

export async function getTodaySavingStatus(): Promise<TodaySavingStatus> {
  const { today } = await loadStreakData();
  return today;
}
