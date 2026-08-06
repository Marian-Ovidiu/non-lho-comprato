"use server";

import { getDaysInMonth, parseDateKey } from "@/src/lib/workspace-dates";
import { round2 } from "@/src/lib/money-number";
import { cacheLife, cacheTag, revalidatePath, updateTag } from "next/cache";

import { getDashboardSummary, getFixedExpenseTitles } from "@/src/actions/entries";
import { getWorkspaceBudgetsAction } from "@/src/actions/budgets";
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
  countDayOfMonthOccurrences,
  getDateKey,
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

export type SettlementActionResult = {
  success: boolean;
  message: string;
};

function getPreviousMonthSameDayKey(todayKey: string) {
  const parts = parseDateKey(todayKey);
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
    todayHabits: loadedTodayHabits,
    currentStreak: globalStreak.currentStreak,
    monthlyStats: loadedMonthlyStats,
    categoryStats: loadedCategoryStats,
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

const DAILY_PACE_WINDOW_MONTHS = 12;

export async function getDailyPaceComparison(): Promise<DashboardDailyPaceComparison> {
  const [workspaceId, timeZone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceTimezone(),
  ]);
  const todayKey = getTodayDateKey(timeZone);
  const fixedTitles = await getFixedExpenseTitles();
  return _cachedDailyPaceComparison(workspaceId, timeZone, todayKey, fixedTitles);
}

function getDailyPaceWindowStartKey(todayParts: {
  year: number;
  month: number;
}): string {
  const start = new Date(
    Date.UTC(todayParts.year, todayParts.month - 1 - DAILY_PACE_WINDOW_MONTHS, 1),
  );

  return `${String(start.getUTCFullYear()).padStart(4, "0")}-${String(
    start.getUTCMonth() + 1,
  ).padStart(2, "0")}-01`;
}

async function _cachedDailyPaceComparison(
  workspaceId: string,
  timeZone: string,
  todayKey: string,
  fixedTitles: string[],
): Promise<DashboardDailyPaceComparison> {
  "use cache";
  cacheTag(`entries:${workspaceId}`);
  cacheLife("hours");

  // Il confronto guarda la spesa corrente: le ricorrenti fisse restano fuori,
  // altrimenti il giorno in cui capita l'affitto domina il paragone.
  const excludeFixed =
    fixedTitles.length > 0
      ? Prisma.sql`AND lower(btrim(e."title")) NOT IN (${Prisma.join(fixedTitles)})`
      : Prisma.empty;

  const todayParts = parseDateKey(todayKey);

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

  const todayRange = getDayRangeForDateKey(todayKey, timeZone);
  const todayRows = await prisma.$queryRaw<Array<{ spent: unknown }>>(Prisma.sql`
    SELECT COALESCE(SUM(e."realCost"), 0)::text AS "spent"
    FROM "Entry" e
    WHERE e."workspaceId" = ${workspaceId}
      AND e."date" >= ${todayRange.start}
      AND e."date" < ${todayRange.end}
      ${excludeFixed}
  `);
  const todaySpent = round2(toMetricNumber(todayRows[0]?.spent));

  // The average counts every past occurrence of this day-of-month in the
  // window, including days with no spending: skipping the zero days would
  // inflate the reference the user compares today against. The window is
  // capped at 12 months (keeps the scan range-bound on the workspaceId+date
  // index) and clamped to the first recorded entry so early adopters are not
  // diluted by months before they used the app.
  const firstEntry = await prisma.entry.findFirst({
    where: { workspaceId },
    orderBy: { date: "asc" },
    select: { date: true },
  });

  let averageSameDay: number | null = null;
  let averageSampleSize = 0;

  if (firstEntry) {
    const windowStartKey = getDailyPaceWindowStartKey(todayParts);
    const firstEntryKey = getDateKey(firstEntry.date, timeZone);
    const effectiveStartKey =
      firstEntryKey > windowStartKey ? firstEntryKey : windowStartKey;
    const effectiveStart = getDayRangeForDateKey(effectiveStartKey, timeZone).start;

    averageSampleSize = countDayOfMonthOccurrences(
      effectiveStartKey,
      todayKey,
      todayParts.day,
    );

    if (averageSampleSize > 0) {
      const totalRows = await prisma.$queryRaw<Array<{ total: unknown }>>(Prisma.sql`
        SELECT COALESCE(SUM(e."realCost"), 0)::text AS "total"
        FROM "Entry" e
        WHERE e."workspaceId" = ${workspaceId}
          AND e."date" >= ${effectiveStart}
          AND e."date" < ${todayRange.start}
          AND EXTRACT(DAY FROM ${entryLocalTimestampSql(timeZone)}) = ${todayParts.day}
          ${excludeFixed}
      `);

      averageSameDay = round2(
        toMetricNumber(totalRows[0]?.total) / averageSampleSize,
      );
    }
  }

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
        ${excludeFixed}
    `);
    previousMonthSpent = round2(toMetricNumber(previousRows[0]?.spent));
  }

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
    const rows = await prisma.$queryRaw<
      Array<{ paid: unknown; owed: unknown; settlementNet: unknown }>
    >(Prisma.sql`
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
      ),
      settlement_adjustments AS (
        SELECT
          COALESCE(SUM(
            CASE
              WHEN s."fromUserId" = ${currentUser.id} THEN s."amount"
              WHEN s."toUserId" = ${currentUser.id} THEN -s."amount"
              ELSE 0::numeric
            END
          ), 0)::text AS "settlementNet"
        FROM "WorkspaceSettlement" s
        WHERE s."workspaceId" = ${workspaceId}
          AND s."fromUserId" IN (${Prisma.join(memberIds)})
          AND s."toUserId" IN (${Prisma.join(memberIds)})
          AND s."fromUserId" <> s."toUserId"
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
        ), 0)::text AS "owed",
        (SELECT "settlementNet" FROM settlement_adjustments) AS "settlementNet"
      FROM entry_shares
    `);

    const currentNet = Math.round(
      (
        toMetricNumber(rows[0]?.paid) -
        toMetricNumber(rows[0]?.owed) +
        toMetricNumber(rows[0]?.settlementNet) +
        Number.EPSILON
      ) *
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

export async function createWorkspaceSettlementAction(): Promise<SettlementActionResult> {
  try {
    const currentUser = await getCurrentUser();
    const balance = await getWorkspaceBalance();

    if (!balance.supported || !balance.counterpartUserId) {
      return {
        success: false,
        message: "I regolamenti sono disponibili solo negli spazi condivisi con due persone.",
      };
    }

    if (balance.status === "balanced" || balance.amount <= 0) {
      return {
        success: false,
        message: "Il bilancio è già in pari.",
      };
    }

    const workspaceId = await getCurrentWorkspaceId();
    const fromUserId =
      balance.status === "you-owe" ? currentUser.id : balance.counterpartUserId;
    const toUserId =
      balance.status === "you-owe" ? balance.counterpartUserId : currentUser.id;

    if (fromUserId === toUserId) {
      return {
        success: false,
        message: "Il regolamento deve avvenire tra due persone diverse.",
      };
    }

    await prisma.workspaceSettlement.create({
      data: {
        workspaceId,
        fromUserId,
        toUserId,
        amount: balance.amount.toFixed(2),
        date: new Date(),
        createdByUserId: currentUser.id,
      },
    });

    revalidatePath("/");
    updateTag(`entries:${workspaceId}`);

    return {
      success: true,
      message: "Regolamento registrato. Il bilancio è stato aggiornato.",
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to create workspace settlement:", error);
    return {
      success: false,
      message: "Non sono riuscito a registrare il regolamento.",
    };
  }
}
