"use server";

import { cacheLife, cacheTag, revalidatePath, updateTag } from "next/cache";

import { Prisma } from "@/src/lib/generated/prisma/client";
import {
  entryNetImpactSql,
  toMetricNumber,
} from "@/src/lib/entry-metrics-query";
import { logAndRethrowDataLoadError } from "@/src/lib/data-load-error";
import { prisma } from "@/src/lib/prisma";
import { getCurrentWorkspaceId } from "@/src/lib/workspace-context";

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
};

type DecimalLike = {
  toString?: () => string;
};

function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
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

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

export async function getGoalsWithProgress(): Promise<GoalWithProgress[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return _cachedGoalsWithProgress(workspaceId);
}

async function _cachedGoalsWithProgress(workspaceId: string): Promise<GoalWithProgress[]> {
  "use cache";
  cacheTag(`goals:${workspaceId}`, `entries:${workspaceId}`);
  cacheLife("hours");

  try {
    const [goals, totalRows, userRows] = await Promise.all([
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
        SELECT COALESCE(SUM(GREATEST(${entryNetImpactSql}, 0::numeric)), 0)::text AS "totalAll"
        FROM "Entry" e
        WHERE e."workspaceId" = ${workspaceId}
      `),
      prisma.$queryRaw<Array<{ userId: string; total: unknown }>>(Prisma.sql`
        SELECT
          eb."userId",
          COALESCE(SUM(GREATEST(${entryNetImpactSql}, 0::numeric)), 0)::text AS "total"
        FROM "Entry" e
        INNER JOIN "EntryBeneficiary" eb ON eb."entryId" = e."id"
        WHERE e."workspaceId" = ${workspaceId}
          AND NOT EXISTS (
            SELECT 1
            FROM "EntryBeneficiary" other
            WHERE other."entryId" = e."id"
              AND other."userId" <> eb."userId"
          )
        GROUP BY eb."userId"
      `),
    ]);

    const totalByUserId = new Map<string, number>();
    const totalAll = round2(toMetricNumber(totalRows[0]?.totalAll));

    for (const row of userRows) {
      totalByUserId.set(row.userId, round2(toMetricNumber(row.total)));
    }

    return goals.map((goal) => {
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
      };
    });
  } catch (error) {
    logAndRethrowDataLoadError("Failed to load goals", error);
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
