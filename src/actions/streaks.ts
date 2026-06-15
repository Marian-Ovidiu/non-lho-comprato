"use server";

import type { Prisma } from "@/src/lib/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { buildRomeStreakResult, getRomeDateKey } from "@/src/lib/rome-dates";
import { getCurrentWorkspaceScopedWhere } from "@/src/lib/workspace-context";
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

function buildStreakResult(dayTotals: Map<string, number>): StreakResult {
  return buildRomeStreakResult(dayTotals.keys());
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
        realCost: true,
        alternativeCost: true,
        savedAmount: true,
        mode: true,
        savingContext: true,
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

      dayTotals.set(dateKey, round2((dayTotals.get(dateKey) ?? 0) + calculateEntryMetrics(entry).netImpact));
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

export async function getTodaySavingStatus(): Promise<TodaySavingStatus> {
  const { today } = await loadStreakData();
  return today;
}
