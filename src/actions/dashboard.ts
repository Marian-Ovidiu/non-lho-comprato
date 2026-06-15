"use server";

import { getDashboardSummary } from "@/src/actions/entries";
import { getGoalsWithProgress } from "@/src/actions/goals";
import { getTodayHabitOccurrences } from "@/src/actions/habits";
import { getCategoryStats, getMonthlyStats } from "@/src/actions/stats";
import { getGlobalStreak } from "@/src/actions/streaks";
import type { Prisma } from "@/src/lib/generated/prisma/client";
import { unstable_rethrow } from "next/navigation";
import { refreshSupabaseSessionForAction } from "@/src/lib/auth/action-session";
import { withDatabaseRetry } from "@/src/lib/db-retry";
import { prisma } from "@/src/lib/prisma";
import { computeCoupleWorkspaceBalance, type WorkspaceBalanceCardState } from "@/src/lib/workspace-balance";
import {
  getCurrentUser,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceScopedWhere,
  getCurrentWorkspaceTimezone,
} from "@/src/lib/workspace-context";
import { getDayRangeForDate } from "@/src/lib/workspace-dates";
import { aggregateEntryMetrics } from "@/src/lib/entry-metrics";

type TodayDashboardSummary = {
  totalSavedToday: number;
  totalRealSpentToday: number;
  entriesTodayCount: number;
  avoidedAmountToday: number;
  comparisonSavedToday: number;
  netImpactToday: number;
};

async function buildEntryWhere(): Promise<Prisma.EntryWhereInput> {
  const timeZone = await getCurrentWorkspaceTimezone();
  const { start, end } = getDayRangeForDate(new Date(), timeZone);

  return getCurrentWorkspaceScopedWhere({
    date: {
      gte: start,
      lt: end,
    },
  });
}

export async function getTodayDashboardSummary(): Promise<TodayDashboardSummary> {
  await refreshSupabaseSessionForAction();

  try {
    const entries = await prisma.entry.findMany({
      where: await buildEntryWhere(),
      select: {
        realCost: true,
        alternativeCost: true,
        savedAmount: true,
        mode: true,
        savingContext: true,
      },
    });

    const agg = aggregateEntryMetrics(entries);

    return {
      totalRealSpentToday: agg.totalSpentReal,
      totalSavedToday: agg.totalNetImpact,
      entriesTodayCount: agg.entriesCount,
      avoidedAmountToday: agg.totalAvoidedAmount,
      comparisonSavedToday: agg.totalComparisonSaved,
      netImpactToday: agg.totalNetImpact,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load today dashboard summary:", error);
    return {
      totalRealSpentToday: 0,
      totalSavedToday: 0,
      entriesTodayCount: 0,
      avoidedAmountToday: 0,
      comparisonSavedToday: 0,
      netImpactToday: 0,
    };
  }
}

export async function getHomeDashboardMetrics() {
  return withDatabaseRetry(async () => {
  const [
    loadedSummary,
    loadedTodaySummary,
    loadedWorkspaceBalance,
    loadedGoals,
    loadedTodayHabits,
    globalStreak,
    loadedMonthlyStats,
    loadedCategoryStats,
  ] = await Promise.all([
    getDashboardSummary(),
    getTodayDashboardSummary(),
    getWorkspaceBalance(),
    getGoalsWithProgress(),
    getTodayHabitOccurrences(),
    getGlobalStreak(),
    getMonthlyStats(),
    getCategoryStats(),
  ]);

  return {
    summary: loadedSummary,
    todaySummary: loadedTodaySummary,
    workspaceBalance: loadedWorkspaceBalance,
    goals: loadedGoals.filter((goal) => goal.isActive),
    todayHabits: loadedTodayHabits,
    pendingHabitsCount: loadedTodayHabits.filter(
      (occurrence) => occurrence.status === "pending",
    ).length,
    currentStreak: globalStreak.currentStreak,
    streakDates: globalStreak.streakDates,
    monthlyStats: loadedMonthlyStats,
    categoryStats: loadedCategoryStats,
  };
  }, { label: "home-dashboard-metrics" });
}

export async function getWorkspaceBalance(): Promise<WorkspaceBalanceCardState> {
  try {
    const workspaceWhere = await getCurrentWorkspaceScopedWhere();
    const [currentUser, members, entries] = await Promise.all([
      getCurrentUser(),
      getCurrentWorkspaceMembers(),
      prisma.entry.findMany({
        where: workspaceWhere,
        select: {
          realCost: true,
          paidByUserId: true,
          paymentMode: true,
          beneficiaries: {
            select: {
              userId: true,
            },
          },
        },
      }),
    ]);

    return computeCoupleWorkspaceBalance(
      members,
      currentUser.id,
      entries.map((entry) => ({
        realCost: Number(entry.realCost),
        paidByUserId: entry.paidByUserId,
        paymentMode: entry.paymentMode,
        beneficiaryUserIds: entry.beneficiaries.map(
          (beneficiary) => beneficiary.userId,
        ),
      })),
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load workspace balance:", error);
    return {
      supported: false,
      status: "unsupported",
      amount: 0,
      counterpartUserId: null,
      counterpartLabel: null,
    };
  }
}
