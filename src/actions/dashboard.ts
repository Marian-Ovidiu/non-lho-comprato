"use server";

import type { Prisma } from "@/src/lib/generated/prisma/client";
import type { PersonFilterValue } from "@/src/lib/person-filter";
import { buildPersonWhere } from "@/src/lib/person-filter";
import { prisma } from "@/src/lib/prisma";
import { computeCoupleWorkspaceBalance, type WorkspaceBalanceCardState } from "@/src/lib/workspace-balance";
import {
  getCurrentUser,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceScopedWhere,
} from "@/src/lib/workspace-context";
import { getRomeDayRangeForDate } from "@/src/lib/rome-dates";

type TodayDashboardSummary = {
  totalSavedToday: number;
  totalRealSpentToday: number;
  entriesTodayCount: number;
};

type DecimalLike = {
  toString?: () => string;
};

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

async function buildEntryWhere(
  person?: PersonFilterValue,
): Promise<Prisma.EntryWhereInput> {
  const { start, end } = getRomeDayRangeForDate(new Date());

  return getCurrentWorkspaceScopedWhere({
    ...buildPersonWhere(person),
    date: {
      gte: start,
      lt: end,
    },
  });
}

export async function getTodayDashboardSummary(
  person?: PersonFilterValue,
): Promise<TodayDashboardSummary> {
  try {
    const entries = await prisma.entry.findMany({
      where: await buildEntryWhere(person),
      select: {
        realCost: true,
        savedAmount: true,
      },
    });

    let totalRealSpentToday = 0;
    let totalSavedToday = 0;

    for (const entry of entries) {
      totalRealSpentToday += toNumber(entry.realCost);
      totalSavedToday += toNumber(entry.savedAmount);
    }

    return {
      totalRealSpentToday: round2(totalRealSpentToday),
      totalSavedToday: round2(totalSavedToday),
      entriesTodayCount: entries.length,
    };
  } catch (error) {
    console.error("Failed to load today dashboard summary:", error);
    return {
      totalRealSpentToday: 0,
      totalSavedToday: 0,
      entriesTodayCount: 0,
    };
  }
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
        beneficiaryUserIds: entry.beneficiaries.map(
          (beneficiary) => beneficiary.userId,
        ),
      })),
    );
  } catch (error) {
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
