"use server";

import { getDashboardSummary } from "@/src/actions/entries";
import { getWorkspaceBudgetsAction } from "@/src/actions/budgets";
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
import {
  getDayRangeForDate,
  getDayRangeForDateKey,
  getTodayDateKey,
} from "@/src/lib/workspace-dates";
import {
  entryMetricAggregateSelectSql,
  entryLocalTimestampSql,
  normalizeEntryMetricAggregate,
  toMetricNumber,
  type EntryMetricAggregateRow,
} from "@/src/lib/entry-metrics-query";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import {
  formatHabitFrequency,
  getHabitNextDate,
  getHabitRelativeLabel,
  getHabitShortDate,
} from "@/src/lib/crafted-habits-build";

type TodayDashboardSummary = {
  totalSavedToday: number;
  totalRealSpentToday: number;
  entriesTodayCount: number;
  avoidedAmountToday: number;
  comparisonSavedToday: number;
  netImpactToday: number;
};

export type DashboardUpcomingHabitPayment = {
  id: string;
  name: string;
  amount: number;
  nextDate: string;
  relativeLabel: string;
  shortDate: string;
  frequencyLabel: string;
  icon: ReturnType<typeof getCategoryCraftedIcon>;
} | null;

export type DashboardDailyPaceComparison = {
  dayOfMonth: number;
  todaySpent: number;
  averageSameDay: number | null;
  averageSampleSize: number;
  previousMonthSpent: number | null;
  previousMonthDateKey: string | null;
};

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseDateKeyParts(dateKey: string) {
  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  return { year, month, day };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getPreviousMonthSameDayKey(todayKey: string) {
  const parts = parseDateKeyParts(todayKey);
  if (!parts) {
    return null;
  }

  const previousMonthDate = new Date(Date.UTC(parts.year, parts.month - 2, 1));
  const year = previousMonthDate.getUTCFullYear();
  const month = previousMonthDate.getUTCMonth() + 1;
  const day = Math.min(parts.day, getDaysInMonth(year, month));

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

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
    // Rethrow instead of returning zeros: a fake "€0 today" reads as real
    // data, while the caller already renders an explicit error state.
    console.error("Failed to load today dashboard summary:", error);
    throw error;
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
    loadedBudgetData,
    loadedNextHabitPayment,
    loadedDailyPaceComparison,
  ] = await Promise.all([
    getDashboardSummary(),
    getTodayDashboardSummary(),
    getWorkspaceBalance(),
    getGoalsWithProgress(),
    getTodayHabitOccurrences(),
    getGlobalStreak(),
    getMonthlyStats(),
    getCategoryStats(),
    getWorkspaceBudgetsAction(),
    getNextHabitPayment(),
    getDailyPaceComparison(),
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
    budgetAlertSelection: loadedBudgetData.alertSelection,
    budgetData: loadedBudgetData,
    nextHabitPayment: loadedNextHabitPayment,
    dailyPaceComparison: loadedDailyPaceComparison,
  };
  }, { label: "home-dashboard-metrics" });
}

export async function getNextHabitPayment(): Promise<DashboardUpcomingHabitPayment> {
  const [workspaceId, timeZone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceTimezone(),
  ]);
  const todayKey = getTodayDateKey(timeZone);
  const habits = await prisma.habit.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      amount: true,
      activeDays: true,
      isActive: true,
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  const next = habits
    .map((habit) => {
      const nextDate = getHabitNextDate(habit.activeDays, habit.isActive, todayKey);
      if (!nextDate) {
        return null;
      }

      return {
        id: habit.id,
        name: habit.name,
        amount: toMetricNumber(habit.amount),
        nextDate,
        relativeLabel: getHabitRelativeLabel(nextDate, todayKey),
        shortDate: getHabitShortDate(nextDate, "it"),
        frequencyLabel: formatHabitFrequency(habit.activeDays, "it"),
        icon: getCategoryCraftedIcon(habit.category),
      };
    })
    .filter((habit): habit is NonNullable<typeof habit> => habit !== null)
    .sort(
      (left, right) =>
        left.nextDate.localeCompare(right.nextDate) ||
        right.amount - left.amount ||
        left.name.localeCompare(right.name, "it"),
    )[0];

  return next ?? null;
}

export async function getDailyPaceComparison(): Promise<DashboardDailyPaceComparison> {
  const [workspaceId, timeZone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceTimezone(),
  ]);
  const todayKey = getTodayDateKey(timeZone);
  const todayParts = parseDateKeyParts(todayKey);

  if (!todayParts) {
    return {
      dayOfMonth: 0,
      todaySpent: 0,
      averageSameDay: null,
      averageSampleSize: 0,
      previousMonthSpent: null,
      previousMonthDateKey: null,
    };
  }

  const todayRange = getDayRangeForDate(new Date(), timeZone);
  const todayRows = await prisma.$queryRaw<Array<{ spent: unknown }>>(Prisma.sql`
    SELECT COALESCE(SUM(e."realCost"), 0)::text AS "spent"
    FROM "Entry" e
    WHERE e."workspaceId" = ${workspaceId}
      AND e."date" >= ${todayRange.start}
      AND e."date" < ${todayRange.end}
  `);
  const todaySpent = round2(toMetricNumber(todayRows[0]?.spent));

  const averageRows = await prisma.$queryRaw<Array<{ averageSpent: unknown; sampleSize: unknown }>>(Prisma.sql`
    WITH same_day_totals AS (
      SELECT
        to_char(${entryLocalTimestampSql(timeZone)}, 'YYYY-MM-DD') AS "dayKey",
        SUM(e."realCost") AS "daySpent"
      FROM "Entry" e
      WHERE e."workspaceId" = ${workspaceId}
        AND e."date" < ${todayRange.start}
        AND EXTRACT(DAY FROM ${entryLocalTimestampSql(timeZone)}) = ${todayParts.day}
      GROUP BY "dayKey"
    )
    SELECT
      AVG("daySpent")::text AS "averageSpent",
      COUNT(*)::int AS "sampleSize"
    FROM same_day_totals
  `);

  const previousMonthDateKey = getPreviousMonthSameDayKey(todayKey);
  let previousMonthSpent: number | null = null;
  if (previousMonthDateKey) {
    const previousRange = getDayRangeForDateKey(previousMonthDateKey, timeZone);
    const previousRows = await prisma.$queryRaw<Array<{ spent: unknown }>>(Prisma.sql`
      SELECT COALESCE(SUM(e."realCost"), 0)::text AS "spent"
      FROM "Entry" e
      WHERE e."workspaceId" = ${workspaceId}
        AND e."date" >= ${previousRange.start}
        AND e."date" < ${previousRange.end}
    `);
    previousMonthSpent = round2(toMetricNumber(previousRows[0]?.spent));
  }

  const averageSampleSize = Number(averageRows[0]?.sampleSize) || 0;
  const averageSameDay =
    averageSampleSize > 0 ? round2(toMetricNumber(averageRows[0]?.averageSpent)) : null;

  return {
    dayOfMonth: todayParts.day,
    todaySpent,
    averageSameDay,
    averageSampleSize,
    previousMonthSpent,
    previousMonthDateKey,
  };
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
            WHEN "beneficiaryCount" > 1
              AND "currentIsBeneficiary"
              AND (
                "paymentMode"::text = 'joint_account'
                OR "paidByUserId" IN (${Prisma.join(memberIds)})
              )
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
    // Rethrow instead of degrading to "unsupported": that state hides a
    // failed balance behind a silently missing card.
    console.error("Failed to load workspace balance:", error);
    throw error;
  }
}
