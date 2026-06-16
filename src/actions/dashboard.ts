"use server";

import { getDashboardSummary } from "@/src/actions/entries";
import { getGoalsWithProgress } from "@/src/actions/goals";
import { getTodayHabitOccurrences } from "@/src/actions/habits";
import { getCategoryStats, getMonthlyStats } from "@/src/actions/stats";
import { getGlobalStreak } from "@/src/actions/streaks";
import { Prisma } from "@/src/lib/generated/prisma/client";
import { unstable_rethrow } from "next/navigation";
import { refreshSupabaseSessionForAction } from "@/src/lib/auth/action-session";
import { withDatabaseRetry } from "@/src/lib/db-retry";
import { prisma } from "@/src/lib/prisma";
import type { WorkspaceBalanceCardState } from "@/src/lib/workspace-balance";
import {
  getCurrentUser,
  getCurrentWorkspaceId,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceTimezone,
} from "@/src/lib/workspace-context";
import { getDayRangeForDate } from "@/src/lib/workspace-dates";
import {
  entryMetricAggregateSelectSql,
  normalizeEntryMetricAggregate,
  toMetricNumber,
  type EntryMetricAggregateRow,
} from "@/src/lib/entry-metrics-query";

type TodayDashboardSummary = {
  totalSavedToday: number;
  totalRealSpentToday: number;
  entriesTodayCount: number;
  avoidedAmountToday: number;
  comparisonSavedToday: number;
  netImpactToday: number;
};

export async function getTodayDashboardSummary(): Promise<TodayDashboardSummary> {
  await refreshSupabaseSessionForAction();

  try {
    const [workspaceId, timeZone] = await Promise.all([
      getCurrentWorkspaceId(),
      getCurrentWorkspaceTimezone(),
    ]);
    const { start, end } = getDayRangeForDate(new Date(), timeZone);
    const rows = await prisma.$queryRaw<EntryMetricAggregateRow[]>(Prisma.sql`
      SELECT ${entryMetricAggregateSelectSql}
      FROM "Entry" e
      WHERE e."workspaceId" = ${workspaceId}
        AND e."date" >= ${start}
        AND e."date" < ${end}
    `);
    const agg = normalizeEntryMetricAggregate(rows[0]);

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
    const [workspaceId, currentUser, members] = await Promise.all([
      getCurrentWorkspaceId(),
      getCurrentUser(),
      getCurrentWorkspaceMembers(),
    ]);

    if (members.length !== 2 || !members.some((member) => member.userId === currentUser.id)) {
      return {
        supported: false,
        status: "unsupported",
        amount: 0,
        counterpartUserId: null,
        counterpartLabel: null,
      };
    }

    const counterpartMember = members.find(
      (member) => member.userId !== currentUser.id,
    );
    if (!counterpartMember) {
      return {
        supported: false,
        status: "unsupported",
        amount: 0,
        counterpartUserId: null,
        counterpartLabel: null,
      };
    }

    const memberIds = members.map((member) => member.userId);
    const rows = await prisma.$queryRaw<Array<{ paid: unknown; owed: unknown }>>(Prisma.sql`
      WITH entry_shares AS (
        SELECT
          e."id",
          e."realCost",
          e."paidByUserId",
          e."paymentMode",
          COUNT(DISTINCT eb."userId") FILTER (
            WHERE eb."userId" IN (${Prisma.join(memberIds)})
          )::int AS "beneficiaryCount",
          BOOL_OR(eb."userId" = ${currentUser.id}) AS "currentIsBeneficiary"
        FROM "Entry" e
        INNER JOIN "EntryBeneficiary" eb ON eb."entryId" = e."id"
        WHERE e."workspaceId" = ${workspaceId}
        GROUP BY e."id", e."realCost", e."paidByUserId", e."paymentMode"
      )
      SELECT
        COALESCE(SUM(
          CASE
            WHEN "beneficiaryCount" <= 1 THEN 0::numeric
            WHEN "paymentMode"::text = 'joint_account' AND "currentIsBeneficiary"
              THEN "realCost" / "beneficiaryCount"
            WHEN "paidByUserId" = ${currentUser.id}
              THEN "realCost"
            ELSE 0::numeric
          END
        ), 0)::text AS "paid",
        COALESCE(SUM(
          CASE
            WHEN "beneficiaryCount" > 1 AND "currentIsBeneficiary"
              THEN "realCost" / "beneficiaryCount"
            ELSE 0::numeric
          END
        ), 0)::text AS "owed"
      FROM entry_shares
    `);

    const currentNet = Math.round(
      (toMetricNumber(rows[0]?.paid) - toMetricNumber(rows[0]?.owed) + Number.EPSILON) *
        100,
    ) / 100;

    if (Math.abs(currentNet) < 0.005) {
      return {
        supported: true,
        status: "balanced",
        amount: 0,
        counterpartUserId: counterpartMember.userId,
        counterpartLabel: counterpartMember.label,
      };
    }

    return {
      supported: true,
      status: currentNet > 0 ? "they-owe" : "you-owe",
      amount: Math.round((Math.abs(currentNet) + Number.EPSILON) * 100) / 100,
      counterpartUserId: counterpartMember.userId,
      counterpartLabel: counterpartMember.label,
    };
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
