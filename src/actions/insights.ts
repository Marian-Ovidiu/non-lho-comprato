"use server";

import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/src/lib/prisma";
import {
  detectFixedExpenses,
  isFixedExpense,
} from "@/src/features/entries/fixed-expenses";
import {
  buildObservations,
  type Observation,
} from "@/src/features/insights/observations";
import { toMoneyNumber } from "@/src/lib/money-number";
import {
  getCurrentWorkspaceId,
  getCurrentWorkspaceTimezone,
} from "@/src/lib/workspace-context";
import {
  getDateKey,
  getDaysInMonth,
  getMonthKey,
  normalizeMonthKey,
  parseDateKey,
} from "@/src/lib/workspace-dates";

/** Mesi di storico letti: servono a fare da riferimento, non a essere mostrati. */
const HISTORY_MONTHS = 6;

export type InsightsMonthTotals = {
  monthKey: string;
  currentSpent: number;
  fixedSpent: number;
};

export type InsightsData = {
  monthKey: string;
  dayOfMonth: number;
  daysInMonth: number;
  observations: Observation[];
  /** Andamento della sola spesa corrente, per dare contesto alle osservazioni. */
  months: InsightsMonthTotals[];
  /** Quanto storico c'è: sotto i due mesi la pagina non può dire granché. */
  historyMonths: number;
};

export async function getInsightsPageData(): Promise<InsightsData> {
  const [workspaceId, timeZone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceTimezone(),
  ]);

  return _cachedInsightsPageData(
    workspaceId,
    timeZone,
    normalizeMonthKey(timeZone, undefined),
    getDateKey(new Date(), timeZone),
  );
}

async function _cachedInsightsPageData(
  workspaceId: string,
  timeZone: string,
  monthKey: string,
  todayKey: string,
): Promise<InsightsData> {
  "use cache";
  cacheTag(`entries:${workspaceId}`);
  cacheLife("hours");

  const [year, month] = monthKey.split("-").map(Number);
  const historyStart = new Date(Date.UTC(year!, month! - 1 - HISTORY_MONTHS, 1));

  // Solo i soldi realmente usciti: le spese evitate non sono spesa, e la
  // vecchia versione di questa pagina guardava *soltanto* quelle.
  const rows = await prisma.entry.findMany({
    where: {
      workspaceId,
      mode: { not: "avoided" },
      date: { gte: historyStart },
    },
    select: {
      id: true,
      title: true,
      realCost: true,
      date: true,
      categoryId: true,
      paidByUserId: true,
      paymentMode: true,
      category: { select: { name: true, slug: true } },
      paidByUser: { select: { name: true, email: true } },
      beneficiaries: { select: { userId: true } },
    },
  });

  const samples = rows.map((row) => ({
    title: row.title,
    amount: toMoneyNumber(row.realCost),
    monthKey: getMonthKey(row.date, timeZone),
    categoryId: row.categoryId,
    payerId: row.paidByUserId,
  }));
  const detection = detectFixedExpenses(samples, { currentMonthKey: monthKey });

  const entries = rows.map((row, index) => {
    const sample = samples[index]!;
    return {
      id: row.id,
      title: row.title,
      amount: sample.amount,
      dateKey: getDateKey(row.date, timeZone),
      monthKey: sample.monthKey,
      categoryId: row.categoryId,
      categoryName: row.category.name,
      categorySlug: row.category.slug,
      isFixed: isFixedExpense(sample, detection),
      payerId: row.paidByUserId,
      payerLabel:
        row.paidByUser?.name?.trim() ||
        row.paidByUser?.email?.split("@")[0] ||
        null,
      isShared: row.paymentMode === "joint_account" || row.beneficiaries.length > 1,
    };
  });

  const dayOfMonth = parseDateKey(todayKey)?.day ?? 1;
  const daysInMonth = getDaysInMonth(year!, month!);

  const monthTotals = new Map<string, InsightsMonthTotals>();
  for (const entry of entries) {
    const totals =
      monthTotals.get(entry.monthKey) ??
      { monthKey: entry.monthKey, currentSpent: 0, fixedSpent: 0 };

    if (entry.isFixed) {
      totals.fixedSpent += entry.amount;
    } else {
      totals.currentSpent += entry.amount;
    }
    monthTotals.set(entry.monthKey, totals);
  }

  const months = [...monthTotals.values()].sort((left, right) =>
    left.monthKey.localeCompare(right.monthKey),
  );

  return {
    monthKey,
    dayOfMonth,
    daysInMonth,
    observations: buildObservations({
      entries,
      monthKey,
      dayOfMonth,
      daysInMonth,
      // L'importo lo formatta la pagina: qui serve solo dentro le frasi, e
      // deve restare leggibile anche quando la valuta non è l'euro.
      formatAmount: (value) => `€${Math.round(value)}`,
    }),
    months: months.slice(-HISTORY_MONTHS),
    historyMonths: months.filter((item) => item.monthKey < monthKey).length,
  };
}
