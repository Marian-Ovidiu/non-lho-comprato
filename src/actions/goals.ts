"use server";

import { round2, toMoneyNumber as toNumber } from "@/src/lib/money-number";
import { cacheLife, cacheTag, revalidatePath, updateTag } from "next/cache";

import { Prisma } from "@/src/lib/generated/prisma/client";
import { logAndRethrowDataLoadError } from "@/src/lib/data-load-error";
import { prisma } from "@/src/lib/prisma";
import {
  computeGoalsWithProgress,
  validateGoalForm,
  type GoalsWithProgress,
} from "@/src/features/goals/domain";
import {
  getCurrentWorkspaceId,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceTimezone,
} from "@/src/lib/workspace-context";
import { getDateKey, getMonthKey } from "@/src/lib/workspace-dates";

type GoalActionResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

export type RecentSavingFeedItem = {
  id: string;
  from: string;
  amount: number;
  date: string;
};

type GoalDelegateLike = {
  create: (args: {
    data: Record<string, unknown>;
  }) => Promise<{ id: string }>;
  findUnique: (args: {
    where: { id: string; workspaceId: string };
    select: Record<string, unknown>;
  }) => Promise<{ id: string; isActive?: boolean } | null>;
  update: (args: {
    where: { id: string; workspaceId: string };
    data: Record<string, unknown>;
  }) => Promise<{ id: string }>;
  delete: (args: {
    where: { id: string; workspaceId: string };
  }) => Promise<{ id: string }>;
};

type GoalActionDeps = {
  prisma: { goal: GoalDelegateLike };
  getCurrentWorkspaceId: () => Promise<string>;
  revalidatePath: (path: string) => void;
  updateTag: (tag: string) => unknown;
};

function makeDefaultDeps(): GoalActionDeps {
  return {
    prisma: prisma as unknown as GoalActionDeps["prisma"],
    getCurrentWorkspaceId,
    revalidatePath,
    updateTag,
  };
}

function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function toDecimalString(value: number): string {
  return value.toFixed(2);
}

function revalidateGoalPaths(deps: GoalActionDeps) {
  for (const path of ["/goals", "/", "/stats"]) {
    try {
      deps.revalidatePath(path);
    } catch (error) {
      console.warn(`Failed to revalidate ${path}:`, error);
    }
  }
}

async function createGoalRecord(
  deps: GoalActionDeps,
  formData: FormData,
): Promise<GoalActionResult> {
  const validation = validateGoalForm({
    title: getText(formData, "title"),
    emoji: getText(formData, "emoji"),
    targetAmountRaw: getText(formData, "targetAmount"),
  });

  if (Object.keys(validation.errors).length > 0) {
    return {
      success: false,
      message: "Controlla i campi evidenziati",
      errors: validation.errors,
    };
  }

  try {
    const workspaceId = await deps.getCurrentWorkspaceId();

    await deps.prisma.goal.create({
      data: {
        workspaceId,
        title: validation.title,
        targetAmount: toDecimalString(validation.targetAmount),
        emoji: validation.emoji || null,
        isActive: true,
      },
    });

    revalidateGoalPaths(deps);
    deps.updateTag(`goals:${workspaceId}`);

    return {
      success: true,
      message: "Obiettivo salvato con successo",
    };
  } catch (error) {
    console.error("Failed to create goal:", error);
    return {
      success: false,
      message:
        "Non riesco a salvare l'obiettivo adesso. Controlla il database e riprova tra poco.",
    };
  }
}

async function deleteGoalRecord(
  deps: GoalActionDeps,
  goalId: string,
): Promise<GoalActionResult> {
  const id = goalId.trim();

  if (!id) {
    return {
      success: false,
      message: "ID obiettivo non valido",
    };
  }

  try {
    const workspaceId = await deps.getCurrentWorkspaceId();
    const goal = await deps.prisma.goal.findUnique({
      where: { id, workspaceId },
      select: {
        id: true,
      },
    });

    if (!goal) {
      return {
        success: false,
        message: "Obiettivo non trovato",
      };
    }

    await deps.prisma.goal.delete({
      where: { id, workspaceId },
    });

    revalidateGoalPaths(deps);
    deps.updateTag(`goals:${workspaceId}`);

    return {
      success: true,
      message: "Obiettivo eliminato",
    };
  } catch (error) {
    console.error("Failed to delete goal:", error);
    return {
      success: false,
      message: "Si è verificato un errore durante l'eliminazione",
    };
  }
}

async function toggleGoalRecord(
  deps: GoalActionDeps,
  goalId: string,
): Promise<GoalActionResult> {
  const id = goalId.trim();

  if (!id) {
    return {
      success: false,
      message: "ID obiettivo non valido",
    };
  }

  try {
    const workspaceId = await deps.getCurrentWorkspaceId();
    const goal = await deps.prisma.goal.findUnique({
      where: { id, workspaceId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!goal) {
      return {
        success: false,
        message: "Obiettivo non trovato",
      };
    }

    await deps.prisma.goal.update({
      where: { id, workspaceId },
      data: {
        isActive: !goal.isActive,
      },
    });

    revalidateGoalPaths(deps);
    deps.updateTag(`goals:${workspaceId}`);

    return {
      success: true,
      message: goal.isActive ? "Obiettivo archiviato" : "Obiettivo riattivato",
    };
  } catch (error) {
    console.error("Failed to toggle goal:", error);
    return {
      success: false,
      message: "Si è verificato un errore durante l'aggiornamento",
    };
  }
}

export async function createGoalActions(
  deps: GoalActionDeps = makeDefaultDeps(),
) {
  return {
    createGoal: async (formData: FormData): Promise<GoalActionResult> =>
      createGoalRecord(deps, formData),
    deleteGoal: async (goalId: string): Promise<GoalActionResult> =>
      deleteGoalRecord(deps, goalId),
    toggleGoalActive: async (goalId: string): Promise<GoalActionResult> =>
      toggleGoalRecord(deps, goalId),
  };
}

const defaultGoalActionsPromise = createGoalActions();

export async function createGoal(
  formData: FormData,
): Promise<GoalActionResult> {
  return (await defaultGoalActionsPromise).createGoal(formData);
}

export async function deleteGoal(goalId: string): Promise<GoalActionResult> {
  return (await defaultGoalActionsPromise).deleteGoal(goalId);
}

export async function toggleGoalActive(
  goalId: string,
): Promise<GoalActionResult> {
  return (await defaultGoalActionsPromise).toggleGoalActive(goalId);
}

export async function getGoalsWithProgress(): Promise<GoalsWithProgress> {
  const [workspaceId, timeZone, members] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceTimezone(),
    getCurrentWorkspaceMembers(),
  ]);
  const contributors =
    members.length > 0
      ? members.map((member) => member.label.toLowerCase())
      : ["io"];
  const currentMonthKey = getMonthKey(new Date(), timeZone);

  return _cachedGoalsWithProgress(
    workspaceId,
    timeZone,
    contributors,
    currentMonthKey,
  );
}

async function _cachedGoalsWithProgress(
  workspaceId: string,
  timeZone: string,
  contributors: string[],
  currentMonthKey: string,
): Promise<GoalsWithProgress> {
  "use cache";
  cacheTag(`goals:${workspaceId}`, `entries:${workspaceId}`);
  cacheLife("hours");

  try {
    const [goals, totalRows, userRows, monthlyRows] = await Promise.all([
      prisma.goal.findMany({
        where: { workspaceId },
        select: {
          id: true,
          title: true,
          targetAmount: true,
          emoji: true,
          targetUserId: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: [
          { isActive: "desc" },
          { createdAt: "desc" },
        ],
      }),
      prisma.$queryRaw<Array<{ totalAll: unknown }>>(Prisma.sql`
        SELECT COALESCE(SUM(e."alternativeCost"), 0)::text AS "totalAll"
        FROM "Entry" e
        WHERE e."workspaceId" = ${workspaceId}
          AND e."mode"::text = 'avoided'
      `),
      prisma.$queryRaw<Array<{ userId: string; total: unknown }>>(Prisma.sql`
        SELECT
          eb."userId",
          COALESCE(SUM(e."alternativeCost"), 0)::text AS "total"
        FROM "Entry" e
        INNER JOIN "EntryBeneficiary" eb ON eb."entryId" = e."id"
        WHERE e."workspaceId" = ${workspaceId}
          AND e."mode"::text = 'avoided'
          AND NOT EXISTS (
            SELECT 1
            FROM "EntryBeneficiary" other
            WHERE other."entryId" = e."id"
              AND other."userId" <> eb."userId"
          )
        GROUP BY eb."userId"
      `),
      prisma.$queryRaw<Array<{ month: string; total: unknown }>>(Prisma.sql`
        SELECT
          to_char((e."date" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}, 'YYYY-MM') AS "month",
          COALESCE(SUM(e."alternativeCost"), 0)::text AS "total"
        FROM "Entry" e
        WHERE e."workspaceId" = ${workspaceId}
          AND e."mode"::text = 'avoided'
        GROUP BY "month"
        ORDER BY "month" ASC
      `),
    ]);

    return computeGoalsWithProgress({
      goals,
      totalAllRaw: totalRows[0]?.totalAll,
      userTotals: userRows,
      monthlyTotals: monthlyRows,
      currentMonthKey,
      contributors,
    });
  } catch (error) {
    logAndRethrowDataLoadError("Failed to load goals", error);
  }
}

export async function getRecentSavingsFeed(): Promise<RecentSavingFeedItem[]> {
  const [workspaceId, timeZone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceTimezone(),
  ]);

  return _cachedRecentSavingsFeed(workspaceId, timeZone);
}

async function _cachedRecentSavingsFeed(
  workspaceId: string,
  timeZone: string,
): Promise<RecentSavingFeedItem[]> {
  "use cache";
  cacheTag(`entries:${workspaceId}`);
  cacheLife("hours");

  try {
    const entries = await prisma.entry.findMany({
      where: {
        workspaceId,
        mode: "avoided",
      },
      select: {
        id: true,
        title: true,
        alternativeCost: true,
        date: true,
      },
      orderBy: {
        date: "desc",
      },
      take: 5,
    });

    return entries.map((entry) => ({
      id: entry.id,
      from: entry.title,
      amount: round2(toNumber(entry.alternativeCost)),
      date: getDateKey(entry.date, timeZone),
    }));
  } catch (error) {
    logAndRethrowDataLoadError("Failed to load recent savings feed", error);
  }
}
