"use server";

import type { Prisma } from "@/src/lib/generated/prisma/client";
import { buildWorkspaceMemberEntryWhere } from "@/src/lib/workspace-member-filter";
import {
  aggregateMemberSpendingStats,
  type MemberSpendingEntry,
} from "@/src/lib/member-spending-stats";
import { prisma } from "@/src/lib/prisma";
import {
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceScopedWhere,
} from "@/src/lib/workspace-context";

type StatsOverview = {
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
  averageSavedPerEntry: number;
  savingRatePercent: number;
};

type MonthlyStatsItem = {
  month: string;
  label: string;
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
};

type CategoryStatsItem = {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
  averageSaved: number;
};

type TopSavingsItem = {
  id: string;
  title: string;
  categoryName: string;
  date: Date;
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  source: "manual" | "habit";
};

type HabitStatsItem = {
  habitId: string;
  habitName: string;
  categoryName: string;
  amount: number;
  totalOccurrences: number;
  spentCount: number;
  avoidedCount: number;
  skippedCount: number;
  pendingCount: number;
  totalSaved: number;
  disciplineRatePercent: number;
};

export type WorkspaceMemberSpendingStatsItem = {
  userId: string;
  label: string;
  totalPaidByUser: number;
  personalSpending: number;
  sharedSpending: number;
};

type DecimalLike = {
  toString?: () => string;
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

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

function sum(values: Array<unknown>): number {
  return round2(
    values.reduce<number>((total, value) => total + toNumber(value), 0),
  );
}

async function buildEntryWhere(
  memberUserId: string | undefined,
  where: Prisma.EntryWhereInput = {},
): Promise<Prisma.EntryWhereInput> {
  const members = await getCurrentWorkspaceMembers();

  return {
    ...where,
    ...buildWorkspaceMemberEntryWhere(memberUserId, members),
    ...(await getCurrentWorkspaceScopedWhere()),
  };
}

async function buildHabitOccurrenceWhere(
  memberUserId: string | undefined,
): Promise<Prisma.HabitOccurrenceWhereInput> {
  const workspaceWhere = await getCurrentWorkspaceScopedWhere();

  if (!memberUserId) {
    return {
      habit: {
        is: workspaceWhere,
      },
    };
  }

  const members = await getCurrentWorkspaceMembers();

  return {
    habit: {
      is: workspaceWhere,
    },
    entry: {
      is: await getCurrentWorkspaceScopedWhere(
        buildWorkspaceMemberEntryWhere(memberUserId, members),
      ),
    },
  };
}

function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(year: number, monthIndex: number): string {
  const raw = new Intl.DateTimeFormat("it-IT", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));

  const normalized = raw.replace(/\./g, "").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getMonthLabelFromKey(monthKey: string): string {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return monthKey;
  }

  return formatMonthLabel(year, monthIndex);
}

function emptyOverview(): StatsOverview {
  return {
    totalRealSpent: 0,
    totalAlternativeCost: 0,
    totalSaved: 0,
    entriesCount: 0,
    averageSavedPerEntry: 0,
    savingRatePercent: 0,
  };
}

export async function getStatsOverview(
  memberUserId?: string,
): Promise<StatsOverview> {
  try {
    const entries = await prisma.entry.findMany({
      where: await buildEntryWhere(memberUserId),
      select: {
        realCost: true,
        alternativeCost: true,
        savedAmount: true,
      },
    });

    if (entries.length === 0) {
      return emptyOverview();
    }

    const totalRealSpent = sum(entries.map((entry) => entry.realCost));
    const totalAlternativeCost = sum(
      entries.map((entry) => entry.alternativeCost),
    );
    const totalSaved = sum(entries.map((entry) => entry.savedAmount));
    const entriesCount = entries.length;

    return {
      totalRealSpent,
      totalAlternativeCost,
      totalSaved,
      entriesCount,
      averageSavedPerEntry: round2(totalSaved / entriesCount),
      savingRatePercent:
        totalAlternativeCost === 0
          ? 0
          : round2((totalSaved / totalAlternativeCost) * 100),
    };
  } catch (error) {
    console.error("Failed to load stats overview:", error);
    return emptyOverview();
  }
}

export async function getMonthlyStats(
  memberUserId?: string,
): Promise<MonthlyStatsItem[]> {
  try {
    const entries = await prisma.entry.findMany({
      where: await buildEntryWhere(memberUserId),
      select: {
        date: true,
        realCost: true,
        alternativeCost: true,
        savedAmount: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    if (entries.length === 0) {
      return [];
    }

    const grouped = new Map<
      string,
      {
        totalRealSpent: number;
        totalAlternativeCost: number;
        totalSaved: number;
        entriesCount: number;
      }
    >();

    for (const entry of entries) {
      const monthKey = getMonthKey(entry.date);
      const current = grouped.get(monthKey) ?? {
        totalRealSpent: 0,
        totalAlternativeCost: 0,
        totalSaved: 0,
        entriesCount: 0,
      };

      current.totalRealSpent = round2(
        current.totalRealSpent + toNumber(entry.realCost),
      );
      current.totalAlternativeCost = round2(
        current.totalAlternativeCost + toNumber(entry.alternativeCost),
      );
      current.totalSaved = round2(current.totalSaved + toNumber(entry.savedAmount));
      current.entriesCount += 1;

      grouped.set(monthKey, current);
    }

    return Array.from(grouped.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, totals]) => ({
        month,
        label: getMonthLabelFromKey(month),
        totalRealSpent: totals.totalRealSpent,
        totalAlternativeCost: totals.totalAlternativeCost,
        totalSaved: totals.totalSaved,
        entriesCount: totals.entriesCount,
      }));
  } catch (error) {
    console.error("Failed to load monthly stats:", error);
    return [];
  }
}

export async function getCategoryStats(
  memberUserId?: string,
): Promise<CategoryStatsItem[]> {
  try {
    const entries = await prisma.entry.findMany({
      where: await buildEntryWhere(memberUserId),
      select: {
        categoryId: true,
        realCost: true,
        alternativeCost: true,
        savedAmount: true,
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (entries.length === 0) {
      return [];
    }

    const grouped = new Map<
      string,
      {
        categoryName: string;
        categorySlug: string;
        totalRealSpent: number;
        totalAlternativeCost: number;
        totalSaved: number;
        entriesCount: number;
      }
    >();

    for (const entry of entries) {
      const current = grouped.get(entry.categoryId) ?? {
        categoryName: entry.category.name,
        categorySlug: entry.category.slug,
        totalRealSpent: 0,
        totalAlternativeCost: 0,
        totalSaved: 0,
        entriesCount: 0,
      };

      current.totalRealSpent = round2(
        current.totalRealSpent + toNumber(entry.realCost),
      );
      current.totalAlternativeCost = round2(
        current.totalAlternativeCost + toNumber(entry.alternativeCost),
      );
      current.totalSaved = round2(current.totalSaved + toNumber(entry.savedAmount));
      current.entriesCount += 1;

      grouped.set(entry.categoryId, current);
    }

    return Array.from(grouped.entries())
      .map(([categoryId, totals]) => ({
        categoryId,
        categoryName: totals.categoryName,
        categorySlug: totals.categorySlug,
        totalRealSpent: totals.totalRealSpent,
        totalAlternativeCost: totals.totalAlternativeCost,
        totalSaved: totals.totalSaved,
        entriesCount: totals.entriesCount,
        averageSaved: totals.entriesCount === 0 ? 0 : round2(totals.totalSaved / totals.entriesCount),
      }))
      .sort((left, right) => right.totalSaved - left.totalSaved);
  } catch (error) {
    console.error("Failed to load category stats:", error);
    return [];
  }
}

export async function getTopSavings(
  memberUserId?: string,
  limit?: number,
): Promise<TopSavingsItem[]>;
export async function getTopSavings(limit?: number): Promise<TopSavingsItem[]>;
export async function getTopSavings(
  memberUserIdOrLimit?: string | number,
  limit = 10,
): Promise<TopSavingsItem[]> {
  const memberUserId =
    typeof memberUserIdOrLimit === "string" ? memberUserIdOrLimit : undefined;
  const requestedLimit =
    typeof memberUserIdOrLimit === "number" ? memberUserIdOrLimit : limit;
  const safeLimit = Number.isFinite(requestedLimit)
    ? Math.max(0, Math.floor(requestedLimit))
    : 10;

  if (safeLimit === 0) {
    return [];
  }

  try {
    const entries = await prisma.entry.findMany({
      where: await buildEntryWhere(memberUserId, {
        savedAmount: {
          gt: 0,
        },
      }),
      orderBy: [
        {
          savedAmount: "desc",
        },
        {
          date: "desc",
        },
      ],
      take: safeLimit,
      select: {
        id: true,
        title: true,
        date: true,
        realCost: true,
        alternativeCost: true,
        savedAmount: true,
        source: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    return entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      categoryName: entry.category.name,
      date: entry.date,
      realCost: toNumber(entry.realCost),
      alternativeCost: toNumber(entry.alternativeCost),
      savedAmount: toNumber(entry.savedAmount),
      source: entry.source,
    }));
  } catch (error) {
    console.error("Failed to load top savings:", error);
    return [];
  }
}

export async function getHabitStats(
  memberUserId?: string,
): Promise<HabitStatsItem[]> {
  try {
    const occurrences = await prisma.habitOccurrence.findMany({
      where: await buildHabitOccurrenceWhere(memberUserId),
      select: {
        status: true,
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
    });

    if (occurrences.length === 0) {
      return [];
    }

    const grouped = new Map<
      string,
      {
        habitName: string;
        categoryName: string;
        amount: number;
        totalOccurrences: number;
        spentCount: number;
        avoidedCount: number;
        skippedCount: number;
        pendingCount: number;
        totalSaved: number;
      }
    >();

    for (const occurrence of occurrences) {
      const habitId = occurrence.habit.id;
      const current = grouped.get(habitId) ?? {
        habitName: occurrence.habit.name,
        categoryName: occurrence.habit.category.name,
        amount: toNumber(occurrence.habit.amount),
        totalOccurrences: 0,
        spentCount: 0,
        avoidedCount: 0,
        skippedCount: 0,
        pendingCount: 0,
        totalSaved: 0,
      };

      current.totalOccurrences += 1;

      switch (occurrence.status) {
        case "spent":
          current.spentCount += 1;
          break;
        case "avoided":
          current.avoidedCount += 1;
          break;
        case "skipped":
          current.skippedCount += 1;
          break;
        default:
          current.pendingCount += 1;
          break;
      }

      if (occurrence.status === "avoided") {
        current.totalSaved = round2(current.totalSaved + current.amount);
      }

      grouped.set(habitId, current);
    }

    return Array.from(grouped.entries())
      .map(([habitId, totals]) => {
        const considered = totals.avoidedCount + totals.spentCount;
        return {
          habitId,
          habitName: totals.habitName,
          categoryName: totals.categoryName,
          amount: totals.amount,
          totalOccurrences: totals.totalOccurrences,
          spentCount: totals.spentCount,
          avoidedCount: totals.avoidedCount,
          skippedCount: totals.skippedCount,
          pendingCount: totals.pendingCount,
          totalSaved: totals.totalSaved,
          disciplineRatePercent:
            considered === 0
              ? 0
              : round2((totals.avoidedCount / considered) * 100),
        };
      })
      .sort((left, right) => right.totalSaved - left.totalSaved);
  } catch (error) {
    console.error("Failed to load habit stats:", error);
    return [];
  }
}

function emptyWorkspaceMemberSpendingStats(
  members: Awaited<ReturnType<typeof getCurrentWorkspaceMembers>>,
): WorkspaceMemberSpendingStatsItem[] {
  return members.map((member) => ({
    userId: member.userId,
    label: member.label,
    totalPaidByUser: 0,
    personalSpending: 0,
    sharedSpending: 0,
  }));
}

function toMemberSpendingEntries(
  entries: Array<{
    realCost: unknown;
    paidByUserId: string | null;
    beneficiaries: Array<{ userId: string }>;
  }>,
): MemberSpendingEntry[] {
  return entries.map((entry) => ({
    realCost: toNumber(entry.realCost),
    paidByUserId: entry.paidByUserId,
    beneficiaryUserIds: entry.beneficiaries.map(
      (beneficiary) => beneficiary.userId,
    ),
  }));
}

export async function getWorkspaceMemberSpendingStats(
  memberUserId?: string,
): Promise<WorkspaceMemberSpendingStatsItem[]> {
  try {
    const [members, entries] = await Promise.all([
      getCurrentWorkspaceMembers(),
      prisma.entry.findMany({
        where: await buildEntryWhere(memberUserId),
        select: {
          realCost: true,
          paidByUserId: true,
          beneficiaries: {
            select: {
              userId: true,
            },
          },
        },
      }),
    ]);

    const totalsByUserId = aggregateMemberSpendingStats(
      members.map((member) => member.userId),
      toMemberSpendingEntries(entries),
    );

    return members.map((member) => {
      const totals = totalsByUserId.get(member.userId);

      return {
        userId: member.userId,
        label: member.label,
        totalPaidByUser: totals?.totalPaidByUser ?? 0,
        personalSpending: totals?.personalSpending ?? 0,
        sharedSpending: totals?.sharedSpending ?? 0,
      };
    });
  } catch (error) {
    console.error("Failed to load workspace member spending stats:", error);

    try {
      const members = await getCurrentWorkspaceMembers();
      return emptyWorkspaceMemberSpendingStats(members);
    } catch {
      return [];
    }
  }
}
