"use server";

import { revalidatePath } from "next/cache";

import { Person } from "@/src/lib/generated/prisma/enums";
import { buildPersonWhere } from "@/src/lib/person-filter";
import { prisma } from "@/src/lib/prisma";
import {
  getCurrentWorkspaceId,
  getWorkspaceScopedWhere,
  requireWorkspaceAccessForRecord,
} from "@/src/lib/workspace-context";

type GoalActionResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

type GoalPerson = "MARIAN" | "MARTINA" | "TUTTI";

type GoalWithProgress = {
  id: string;
  title: string;
  targetAmount: number;
  emoji: string | null;
  person: GoalPerson | null;
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

function getGoalPerson(formData: FormData): {
  value: GoalPerson | null;
  error?: string;
} {
  const raw = getText(formData, "person");

  if (!raw) {
    return { value: null };
  }

  if (raw === Person.MARIAN || raw === Person.MARTINA) {
    return { value: raw };
  }

  if (raw === Person.TUTTI) {
    return { value: null };
  }

  return {
    value: null,
    error: "Seleziona una persona valida",
  };
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
  person: GoalPerson | null,
  totals: Record<"all" | "MARIAN" | "MARTINA", number>,
): number {
  if (person === "MARIAN" || person === "MARTINA") {
    return totals[person];
  }

  return totals.all;
}

export async function createGoal(
  formData: FormData,
): Promise<GoalActionResult> {
  const errors: Record<string, string> = {};

  const title = getText(formData, "title");
  const emoji = getText(formData, "emoji");
  const targetAmount = getTargetAmount(formData);
  const person = getGoalPerson(formData);

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

  if (person.error) {
    errors.person = person.error;
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
        person: person.value,
      },
    });

    revalidateGoalPaths();

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
  try {
    const [goals, allSaved, marianSaved, martinaSaved] = await Promise.all([
      prisma.goal.findMany({
        where: getWorkspaceScopedWhere(),
        orderBy: [
          {
            isActive: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      }),
      prisma.entry.aggregate({
        where: getWorkspaceScopedWhere(),
        _sum: {
          savedAmount: true,
        },
      }),
      prisma.entry.aggregate({
        where: getWorkspaceScopedWhere(buildPersonWhere("MARIAN")),
        _sum: {
          savedAmount: true,
        },
      }),
      prisma.entry.aggregate({
        where: getWorkspaceScopedWhere(buildPersonWhere("MARTINA")),
        _sum: {
          savedAmount: true,
        },
      }),
    ]);

    const totals = {
      all: round2(toNumber(allSaved._sum.savedAmount)),
      MARIAN: round2(toNumber(marianSaved._sum.savedAmount)),
      MARTINA: round2(toNumber(martinaSaved._sum.savedAmount)),
    };

    return goals.map((goal) => {
      const targetAmount = round2(toNumber(goal.targetAmount));
      const progressAmount = getProgressAmount(goal.person, totals);
      const progressPercent = getProgressPercent(progressAmount, targetAmount);
      const remainingAmount = round2(Math.max(targetAmount - progressAmount, 0));

      return {
        id: goal.id,
        title: goal.title,
        targetAmount,
        emoji: goal.emoji,
        person: goal.person,
        isActive: goal.isActive,
        createdAt: goal.createdAt.toISOString(),
        progressAmount,
        progressPercent,
        remainingAmount,
        isCompleted: targetAmount > 0 && progressAmount >= targetAmount,
      };
    });
  } catch (error) {
    console.error("Failed to load goals:", error);
    return [];
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
    const goal = await prisma.goal.findUnique({
      where: { id },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (!goal) {
      return {
        success: false,
        message: "Obiettivo non trovato",
      };
    }

    await requireWorkspaceAccessForRecord(goal, "Obiettivo");

    await prisma.goal.delete({
      where: { id },
    });

    revalidateGoalPaths();

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
    const goal = await prisma.goal.findUnique({
      where: { id },
      select: {
        id: true,
        isActive: true,
        workspaceId: true,
      },
    });

    if (!goal) {
      return {
        success: false,
        message: "Obiettivo non trovato",
      };
    }

    await requireWorkspaceAccessForRecord(goal, "Obiettivo");

    await prisma.goal.update({
      where: { id },
      data: {
        isActive: !goal.isActive,
      },
    });

    revalidateGoalPaths();

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
