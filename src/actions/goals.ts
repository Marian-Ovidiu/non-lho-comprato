"use server";

import { round2, toMoneyNumber as toNumber } from "@/src/lib/money-number";
import { cacheLife, cacheTag, revalidatePath, updateTag } from "next/cache";

import { Prisma } from "@/src/lib/generated/prisma/client";
import { toMetricNumber } from "@/src/lib/entry-metrics-query";
import { logAndRethrowDataLoadError } from "@/src/lib/data-load-error";
import { prisma } from "@/src/lib/prisma";
import {
  getCurrentWorkspaceId,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceTimezone,
} from "@/src/lib/workspace-context";
import { getDateKey } from "@/src/lib/workspace-dates";

type GoalActionResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

type GoalWithProgress = {
  id: string;
  title: string;
  targetAmount: number;
  emoji: string | null;
  targetUserId: string | null;
  isActive: boolean;
  createdAt: string;
  progressAmount: number;
  progressPercent: number;
  remainingAmount: number;
  isCompleted: boolean;
  monthlyPace: number;
  contributors: string[];
};

export type GoalsWithProgress = {
  goals: GoalWithProgress[];
  /// Pool "evitato" del workspace: ogni goal senza targetUserId misura questo
  /// stesso totale, quindi i riepiloghi devono contarlo una sola volta da qui.
  savedPool: number;
  monthlyPace: number;
};

export type GoalAllocationFeedItem = {
  id: string;
  from: string;
  amount: number;
  goalId: string | null;
  goalTitle: string | null;
  goalIconTitle: string | null;
  date: string;
};

function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function toDecimalString(value: number): string {
  return value.toFixed(2);
}

function getTargetAmount(formData: FormData): {
  value: number;
  error?: string;
} {
  const raw = getText(formData, "targetAmount");

  if (!raw) {
    return { value: Number.NaN, error: "Questo campo è obbligatorio" };
  }

  const value = Number(raw.replace(",", "."));

  if (!Number.isFinite(value)) {
    return { value: Number.NaN, error: "Inserisci un numero valido" };
  }

  if (value <= 0) {
    return { value, error: "Il valore deve essere maggiore di 0" };
  }

  return { value };
}

function tryRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    console.warn(`Failed to revalidate ${path}:`, error);
  }
}

function revalidateGoalPaths() {
  tryRevalidatePath("/goals");
  tryRevalidatePath("/");
  tryRevalidatePath("/stats");
}

function getProgressPercent(progressAmount: number, targetAmount: number): number {
  if (targetAmount <= 0) {
    return 0;
  }

  return round2(Math.min((progressAmount / targetAmount) * 100, 100));
}

function getProgressAmount(
  targetUserId: string | null,
  totalByUserId: Map<string, number>,
  totalAll: number,
): number {
  if (targetUserId) {
    return totalByUserId.get(targetUserId) ?? 0;
  }
  return totalAll;
}

export async function createGoal(
  formData: FormData,
): Promise<GoalActionResult> {
  const errors: Record<string, string> = {};

  const title = getText(formData, "title");
  const emoji = getText(formData, "emoji");
  const targetAmount = getTargetAmount(formData);

  if (!title) {
    errors.title = "Il titolo è obbligatorio";
  } else if (title.length < 2) {
    errors.title = "Il titolo deve avere almeno 2 caratteri";
  }

  if (targetAmount.error) {
    errors.targetAmount = targetAmount.error;
  }

  if (emoji && Array.from(emoji).length > 4) {
    errors.emoji = "Usa al massimo 4 caratteri";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Controlla i campi evidenziati",
      errors,
    };
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();

    await prisma.goal.create({
      data: {
        workspaceId,
        title,
        targetAmount: toDecimalString(targetAmount.value),
        emoji: emoji || null,
        isActive: true,
      },
    });

    revalidateGoalPaths();
    updateTag(`goals:${workspaceId}`);

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

  return _cachedGoalsWithProgress(workspaceId, timeZone, contributors);
}

async function _cachedGoalsWithProgress(
  workspaceId: string,
  timeZone: string,
  contributors: string[],
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

    const totalByUserId = new Map<string, number>();
    const totalAll = round2(toMetricNumber(totalRows[0]?.totalAll));
    const totalMonthlyAvoided = monthlyRows.reduce(
      (sum, row) => sum + toMetricNumber(row.total),
      0,
    );
    const observedMonths = Math.max(monthlyRows.length, 1);
    const monthlyPace = round2(totalMonthlyAvoided / observedMonths);

    for (const row of userRows) {
      totalByUserId.set(row.userId, round2(toMetricNumber(row.total)));
    }

    const goalsWithProgress = goals.map((goal) => {
      const targetAmount = round2(toNumber(goal.targetAmount));
      const progressAmount = getProgressAmount(goal.targetUserId, totalByUserId, totalAll);
      const progressPercent = getProgressPercent(progressAmount, targetAmount);
      const remainingAmount = round2(Math.max(targetAmount - progressAmount, 0));

      return {
        id: goal.id,
        title: goal.title,
        targetAmount,
        emoji: goal.emoji,
        targetUserId: goal.targetUserId,
        isActive: goal.isActive,
        createdAt: goal.createdAt.toISOString(),
        progressAmount,
        progressPercent,
        remainingAmount,
        isCompleted: targetAmount > 0 && progressAmount >= targetAmount,
        monthlyPace,
        contributors,
      };
    });

    return {
      goals: goalsWithProgress,
      savedPool: totalAll,
      monthlyPace,
    };
  } catch (error) {
    logAndRethrowDataLoadError("Failed to load goals", error);
  }
}

export async function getGoalAllocationFeed(): Promise<GoalAllocationFeedItem[]> {
  const [workspaceId, timeZone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceTimezone(),
  ]);

  return _cachedGoalAllocationFeed(workspaceId, timeZone);
}

async function _cachedGoalAllocationFeed(
  workspaceId: string,
  timeZone: string,
): Promise<GoalAllocationFeedItem[]> {
  "use cache";
  cacheTag(`goals:${workspaceId}`, `entries:${workspaceId}`);
  cacheLife("hours");

  try {
    const [goals, entries] = await Promise.all([
      prisma.goal.findMany({
        where: { workspaceId },
        select: {
          id: true,
          title: true,
          isActive: true,
          targetAmount: true,
          createdAt: true,
        },
        orderBy: [
          { isActive: "desc" },
          { createdAt: "desc" },
        ],
      }),
      prisma.entry.findMany({
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
      }),
    ]);
    const targetGoal = goals.find((goal) => goal.isActive) ?? goals[0] ?? null;

    return entries.map((entry) => ({
      id: entry.id,
      from: entry.title,
      amount: round2(toNumber(entry.alternativeCost)),
      goalId: targetGoal?.id ?? null,
      goalTitle: targetGoal?.title ?? null,
      goalIconTitle: targetGoal?.title ?? null,
      date: getDateKey(entry.date, timeZone),
    }));
  } catch (error) {
    logAndRethrowDataLoadError("Failed to load goal allocation feed", error);
  }
}

export async function deleteGoal(goalId: string): Promise<GoalActionResult> {
  const id = goalId.trim();

  if (!id) {
    return {
      success: false,
      message: "ID obiettivo non valido",
    };
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();
    const goal = await prisma.goal.findUnique({
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

    await prisma.goal.delete({
      where: { id, workspaceId },
    });

    revalidateGoalPaths();
    updateTag(`goals:${workspaceId}`);

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

export async function toggleGoalActive(
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
    const workspaceId = await getCurrentWorkspaceId();
    const goal = await prisma.goal.findUnique({
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

    await prisma.goal.update({
      where: { id, workspaceId },
      data: {
        isActive: !goal.isActive,
      },
    });

    revalidateGoalPaths();
    updateTag(`goals:${workspaceId}`);

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
