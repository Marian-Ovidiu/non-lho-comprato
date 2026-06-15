"use server";

import type { Prisma } from "@/src/lib/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { buildStreakResult as buildStreakResultFromDates, getDateKey } from "@/src/lib/workspace-dates";
import { cacheLife, cacheTag } from "next/cache";
import { getCurrentWorkspaceId, getCurrentWorkspaceScopedWhere, getCurrentWorkspaceTimezone } from "@/src/lib/workspace-context";
import { calculateEntryMetrics } from "@/src/lib/entry-metrics";

type StreakResult = {
  currentStreak: number;
  bestStreak: number;
  streakDates: string[];
};

type TodaySavingStatus = {
  hasSavedToday: boolean;
  totalSavedToday: number;
};

type StreakScope = {
  categoryId?: string;
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function buildEntryWhere(scope: StreakScope = {}): Promise<Prisma.EntryWhereInput> {
  const where: Prisma.EntryWhereInput = {};
  const workspaceWhere = await getCurrentWorkspaceScopedWhere();

  Object.assign(where, workspaceWhere);

  if (scope.categoryId) {
    where.categoryId = scope.categoryId;
  }

  return where;
}

async function loadStreakData(scope: StreakScope = {}): Promise<{
  streak: StreakResult;
  today: TodaySavingStatus;
}> {
  try {
    const [entries, timeZone] = await Promise.all([
      prisma.entry.findMany({
        where: await buildEntryWhere(scope),
        select: {
          date: true,
          realCost: true,
          alternativeCost: true,
          savedAmount: true,
          mode: true,
          savingContext: true,
        },
        orderBy: {
          date: "asc",
        },
      }),
      getCurrentWorkspaceTimezone(),
    ]);

    const dayTotals = new Map<string, number>();

    for (const entry of entries) {
      const dateKey = getDateKey(entry.date, timeZone);
      if (!dateKey) {
        continue;
      }

      dayTotals.set(dateKey, round2((dayTotals.get(dateKey) ?? 0) + calculateEntryMetrics(entry).netImpact));
    }

    const streak = buildStreakResultFromDates(dayTotals.keys());
    const todayKey = getDateKey(new Date(), timeZone);
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
  const [workspaceId, timeZone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceTimezone(),
  ]);
  return _cachedGlobalStreak(workspaceId, timeZone);
}

async function _cachedGlobalStreak(workspaceId: string, timeZone: string): Promise<StreakResult> {
  "use cache";
  cacheTag(`entries:${workspaceId}`);
  cacheLife("hours");

  try {
    const entries = await prisma.entry.findMany({
      where: { workspaceId },
      select: {
        date: true,
        realCost: true,
        alternativeCost: true,
        savedAmount: true,
        mode: true,
        savingContext: true,
      },
      orderBy: { date: "asc" },
    });

    const dayTotals = new Map<string, number>();
    for (const entry of entries) {
      const dateKey = getDateKey(entry.date, timeZone);
      if (!dateKey) continue;
      dayTotals.set(dateKey, round2((dayTotals.get(dateKey) ?? 0) + calculateEntryMetrics(entry).netImpact));
    }

    return buildStreakResultFromDates(dayTotals.keys());
  } catch (error) {
    console.error("Failed to load global streak:", error);
    return { currentStreak: 0, bestStreak: 0, streakDates: [] };
  }
}

export async function getTodaySavingStatus(): Promise<TodaySavingStatus> {
  const { today } = await loadStreakData();
  return today;
}
