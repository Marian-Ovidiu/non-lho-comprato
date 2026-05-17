"use server";

import { revalidatePath } from "next/cache";

import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { EntryVisibility } from "@/src/lib/generated/prisma/enums";
import { prisma } from "@/src/lib/prisma";
import { DEFAULT_LEGACY_PERSON } from "@/src/lib/ui-person";
import {
  getCurrentUser,
  getCurrentWorkspaceId,
  getCurrentWorkspaceScopedWhere,
  requireWorkspaceAccessForRecord,
} from "@/src/lib/workspace-context";

type HabitActionResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

export type HabitDeleteMode = "habit_only" | "habit_and_entries";

type SyncResult = {
  createdCount?: number;
  finalizedCount?: number;
};

type HabitStatus = "pending" | "spent" | "avoided" | "skipped";

type HabitListItem = {
  id: string;
  name: string;
  categoryId: string;
  amount: unknown;
  activeDays: unknown;
  isActive: boolean;
  defaultBehavior: string;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
    icon: string | null;
  };
  _count: {
    occurrences: number;
  };
};

type TodayHabitOccurrence = {
  id: string;
  habitId: string;
  date: Date;
  status: HabitStatus;
  createdAt: Date;
  updatedAt: Date;
  habit: {
    id: string;
    name: string;
    categoryId: string;
    amount: unknown;
    activeDays: unknown;
    isActive: boolean;
    defaultBehavior: string;
    createdAt: Date;
    updatedAt: Date;
    category: {
      id: string;
      name: string;
      slug: string;
      color: string | null;
      icon: string | null;
    };
  };
  entry: {
    id: string;
    title: string;
    realCost: unknown;
    alternativeCost: unknown;
    savedAmount: unknown;
    source: string;
  } | null;
};

type OccurrenceWithHabit = {
  id: string;
  date: Date;
  habit: {
    name: string;
    categoryId: string;
    amount: unknown;
  };
};

function tryRevalidatePaths() {
  for (const path of ["/", "/entries", "/habits", "/stats"]) {
    try {
      revalidatePath(path);
    } catch (error) {
      console.warn(`Failed to revalidate ${path}:`, error);
    }
  }
}

function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getMoney(formData: FormData, name: string): {
  value: number;
  error?: string;
} {
  const raw = getText(formData, name);

  if (!raw) {
    return { value: Number.NaN, error: "Questo campo è obbligatorio" };
  }

  const normalized = raw.replace(",", ".");
  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    return { value: Number.NaN, error: "Inserisci un numero valido" };
  }

  if (value < 0) {
    return { value, error: "Il valore deve essere maggiore o uguale a 0" };
  }

  return { value };
}

function toDecimalString(value: number): string {
  return value.toFixed(2);
}

function toLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function getTodayStart(): Date {
  return toLocalMidnight(new Date());
}

function getTomorrowStart(): Date {
  const today = getTodayStart();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0, 0);
}

function getLocalIsoWeekday(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1;
}

function normalizeActiveDays(values: number[]): number[] {
  return Array.from(new Set(values))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7)
    .sort((a, b) => a - b);
}

function parseActiveDays(formData: FormData): {
  value: number[];
  error?: string;
} {
  const rawValues = formData.getAll("activeDays");
  const collected: number[] = [];

  for (const rawValue of rawValues) {
    if (typeof rawValue !== "string") {
      continue;
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          collected.push(
            ...parsed.map((item) => Number(item)).filter(Number.isFinite),
          );
          continue;
        }
      } catch {
        // Fall back to the generic split logic below.
      }
    }

    const tokens = trimmed.split(/[\s,]+/);
    for (const token of tokens) {
      if (!token) {
        continue;
      }

      const day = Number(token);
      if (!Number.isFinite(day)) {
        return {
          value: [],
          error: "I giorni attivi non sono validi",
        };
      }

      collected.push(day);
    }
  }

  const activeDays = normalizeActiveDays(collected);

  if (!activeDays.length) {
    return {
      value: [],
      error: "Seleziona almeno un giorno attivo",
    };
  }

  return { value: activeDays };
}

function parseBoolean(value: string): boolean {
  if (!value) {
    return true;
  }

  return value === "1" || value === "true" || value === "on";
}

async function resolveCategory(categoryId: string, workspaceId: string) {
  let category = await prisma.category.findFirst({
    where: await getCurrentWorkspaceScopedWhere({
      id: categoryId,
    }),
  });

  if (!category) {
    category = await prisma.category.findFirst({
      where: await getCurrentWorkspaceScopedWhere({
        slug: categoryId,
      }),
    });
  }

  if (!category) {
    const fallbackCategory = DEFAULT_CATEGORIES.find(
      (item) => item.slug === categoryId,
    );

    if (fallbackCategory) {
      category = await prisma.category.upsert({
        where: { slug: fallbackCategory.slug },
        update: {
          name: fallbackCategory.name,
          icon: fallbackCategory.icon,
          color: fallbackCategory.color,
          workspaceId,
        },
        create: {
          name: fallbackCategory.name,
          slug: fallbackCategory.slug,
          icon: fallbackCategory.icon,
          color: fallbackCategory.color,
          workspaceId,
        },
      });
    }
  }

  return category;
}

function buildEntryDataForOccurrence(
  occurrence: OccurrenceWithHabit,
  status: Exclude<HabitStatus, "pending">,
  context: {
    workspaceId: string;
    currentUserId: string;
  },
) {
  const amount = Number(occurrence.habit.amount);
  const sharedFields = {
    workspaceId: context.workspaceId,
    createdByUserId: context.currentUserId,
    paidByUserId: context.currentUserId,
    paidBy: DEFAULT_LEGACY_PERSON,
    person: DEFAULT_LEGACY_PERSON,
    beneficiaries: {
      create: [{ userId: context.currentUserId }],
    },
    visibility: EntryVisibility.workspace,
  };

  if (status === "spent") {
    return {
      ...sharedFields,
      title: occurrence.habit.name,
      categoryId: occurrence.habit.categoryId,
      realCost: toDecimalString(amount),
      alternativeCost: toDecimalString(amount),
      savedAmount: toDecimalString(0),
      date: occurrence.date,
      note: null,
      source: "habit" as const,
      habitOccurrenceId: occurrence.id,
    };
  }

  if (status === "avoided") {
    return {
      ...sharedFields,
      title: occurrence.habit.name,
      categoryId: occurrence.habit.categoryId,
      realCost: toDecimalString(0),
      alternativeCost: toDecimalString(amount),
      savedAmount: toDecimalString(amount),
      date: occurrence.date,
      note: null,
      source: "habit" as const,
      habitOccurrenceId: occurrence.id,
    };
  }

  return {
    ...sharedFields,
    title: occurrence.habit.name,
    categoryId: occurrence.habit.categoryId,
    realCost: toDecimalString(0),
    alternativeCost: toDecimalString(0),
    savedAmount: toDecimalString(0),
    date: occurrence.date,
    note: null,
    source: "habit" as const,
    habitOccurrenceId: occurrence.id,
  };
}

async function syncOccurrenceStatus(
  occurrenceId: string,
  status: Exclude<HabitStatus, "pending">,
): Promise<HabitActionResult> {
  const id = occurrenceId.trim();

  if (!id) {
    return {
      success: false,
      message: "ID abitudine non valido",
    };
  }

  try {
    const occurrence = await prisma.habitOccurrence.findUnique({
      where: { id },
      include: {
        habit: true,
      },
    });

    if (!occurrence) {
      return {
        success: false,
        message: "Occorrenza non trovata",
      };
    }

    await requireWorkspaceAccessForRecord(occurrence, "Occorrenza abitudine");

    const currentUser = await getCurrentUser();
    const workspaceId = await getCurrentWorkspaceId();

    await prisma.$transaction(async (tx) => {
      await tx.habitOccurrence.update({
        where: { id },
        data: { status },
      });

      if (status === "skipped") {
        await tx.entry.deleteMany({ where: { habitOccurrenceId: id } });
        return;
      }

      const entryData = buildEntryDataForOccurrence(occurrence, status, {
        workspaceId,
        currentUserId: currentUser.id,
      });

      await tx.entry.upsert({
        where: { habitOccurrenceId: id },
        update: entryData,
        create: entryData,
      });
    });

    tryRevalidatePaths();

    return {
      success: true,
      message:
        status === "spent"
          ? "Segnata come spesa"
          : status === "avoided"
            ? "Segnata come evitata"
            : "Segnata come saltata",
    };
  } catch (error) {
    console.error("Failed to update habit occurrence:", error);
    return {
      success: false,
      message: "Non riesco ad aggiornare l'abitudine adesso. Riprova tra poco.",
    };
  }
}

export async function createHabit(
  formData: FormData,
): Promise<HabitActionResult> {
  const errors: Record<string, string> = {};

  const name = getText(formData, "name");
  const categoryId = getText(formData, "categoryId");
  const amount = getMoney(formData, "amount");
  const activeDays = parseActiveDays(formData);
  const isActive = parseBoolean(getText(formData, "isActive"));

  if (!name) {
    errors.name = "Il nome è obbligatorio";
  }

  if (!categoryId) {
    errors.categoryId = "Seleziona una categoria";
  }

  if (amount.error) {
    errors.amount = amount.error;
  }

  if (activeDays.error) {
    errors.activeDays = activeDays.error;
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
    const category = await resolveCategory(categoryId, workspaceId);

    if (!category) {
      return {
        success: false,
        message: "Controlla i campi evidenziati",
        errors: {
          categoryId: "Seleziona una categoria valida",
        },
      };
    }

    await prisma.habit.create({
      data: {
        workspaceId,
        name,
        categoryId: category.id,
        amount: toDecimalString(amount.value),
        activeDays: activeDays.value,
        isActive,
        defaultBehavior: "spent",
      },
    });

    tryRevalidatePaths();

    return {
      success: true,
      message: "Abitudine salvata con successo",
    };
  } catch (error) {
    console.error("Failed to create habit:", error);
    return {
      success: false,
      message:
        "Non riesco a salvare l'abitudine adesso. Controlla il database e riprova tra poco.",
    };
  }
}

function isHabitDeleteMode(value: string): value is HabitDeleteMode {
  return value === "habit_only" || value === "habit_and_entries";
}

export async function deleteHabit(
  habitId: string,
  mode: HabitDeleteMode,
): Promise<HabitActionResult> {
  const id = habitId.trim();

  if (!id) {
    return {
      success: false,
      message: "ID abitudine non valido",
    };
  }

  if (!isHabitDeleteMode(mode)) {
    return {
      success: false,
      message: "Modalità di eliminazione non valida",
    };
  }

  try {
    const habit = await prisma.habit.findUnique({
      where: { id },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (!habit) {
      return {
        success: false,
        message: "Abitudine non trovata",
      };
    }

    await requireWorkspaceAccessForRecord(habit, "Abitudine");

    const occurrences = await prisma.habitOccurrence.findMany({
      where: { habitId: id },
      select: { id: true },
    });
    const occurrenceIds = occurrences.map((occurrence) => occurrence.id);

    await prisma.$transaction(async (tx) => {
      if (occurrenceIds.length > 0) {
        if (mode === "habit_and_entries") {
          await tx.entry.deleteMany({
            where: {
              habitOccurrenceId: {
                in: occurrenceIds,
              },
            },
          });
        } else {
          await tx.entry.updateMany({
            where: {
              habitOccurrenceId: {
                in: occurrenceIds,
              },
            },
            data: {
              habitOccurrenceId: null,
            },
          });
        }
      }

      await tx.habit.delete({
        where: { id },
      });
    });

    tryRevalidatePaths();

    return {
      success: true,
      message:
        mode === "habit_and_entries"
          ? "Abitudine e movimenti collegati eliminati"
          : "Abitudine eliminata. I movimenti generati restano nel registro.",
    };
  } catch (error) {
    console.error("Failed to delete habit:", error);
    return {
      success: false,
      message: "Non riesco a eliminare l'abitudine adesso. Riprova tra poco.",
    };
  }
}

export async function getHabits(): Promise<HabitListItem[]> {
  try {
    const workspaceWhere = await getCurrentWorkspaceScopedWhere();

    return await prisma.habit.findMany({
      where: workspaceWhere,
      orderBy: {
        name: "asc",
      },
      include: {
        category: true,
        _count: {
          select: {
            occurrences: true,
          },
        },
      },
    });
  } catch (error) {
    console.warn("Failed to load habits:", error);
    return [];
  }
}

export async function ensureTodayHabitOccurrences(): Promise<SyncResult> {
  const todayStart = getTodayStart();

  try {
    const workspaceWhere = await getCurrentWorkspaceScopedWhere({
      isActive: true,
    });
    const habits = await prisma.habit.findMany({
      where: workspaceWhere,
      select: {
        id: true,
        activeDays: true,
      },
    });

    const todayWeekday = getLocalIsoWeekday(todayStart);
    const rows = habits.filter((habit) => {
      if (!Array.isArray(habit.activeDays)) {
        return false;
      }

      const activeDays = normalizeActiveDays(
        habit.activeDays.map((value) => Number(value)).filter(Number.isFinite),
      );

      return activeDays.includes(todayWeekday);
    });

    if (!rows.length) {
      return { createdCount: 0 };
    }

    const result = await prisma.habitOccurrence.createMany({
      data: rows.map((habit) => ({
        habitId: habit.id,
        date: todayStart,
        status: "pending",
      })),
      skipDuplicates: true,
    });

    if (result.count > 0) {
      tryRevalidatePaths();
    }

    return { createdCount: result.count };
  } catch (error) {
    console.error("Failed to ensure today habit occurrences:", error);
    return { createdCount: 0 };
  }
}

export async function getTodayHabitOccurrences(): Promise<TodayHabitOccurrence[]> {
  const todayStart = getTodayStart();
  const tomorrowStart = getTomorrowStart();

  try {
    const workspaceWhere = await getCurrentWorkspaceScopedWhere();

    return await prisma.habitOccurrence.findMany({
      where: {
        date: {
          gte: todayStart,
          lt: tomorrowStart,
        },
        habit: {
          is: workspaceWhere,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        habit: {
          include: {
            category: true,
          },
        },
        entry: true,
      },
    });
  } catch (error) {
    console.warn("Failed to load today habit occurrences:", error);
    return [];
  }
}

export async function markHabitOccurrenceSpent(
  id: string,
): Promise<HabitActionResult> {
  return syncOccurrenceStatus(id, "spent");
}

export async function markHabitOccurrenceAvoided(
  id: string,
): Promise<HabitActionResult> {
  return syncOccurrenceStatus(id, "avoided");
}

export async function markHabitOccurrenceSkipped(
  id: string,
): Promise<HabitActionResult> {
  return syncOccurrenceStatus(id, "skipped");
}

export async function finalizeOldPendingOccurrences(): Promise<SyncResult> {
  const todayStart = getTodayStart();

  try {
    const workspaceWhere = await getCurrentWorkspaceScopedWhere();
    const pendingOccurrences = await prisma.habitOccurrence.findMany({
      where: {
        status: "pending",
        date: {
          lt: todayStart,
        },
        habit: {
          is: workspaceWhere,
        },
      },
      include: {
        habit: {
          select: {
            name: true,
            categoryId: true,
            amount: true,
            defaultBehavior: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    if (!pendingOccurrences.length) {
      return { finalizedCount: 0 };
    }

    let finalizedCount = 0;
    const currentUser = await getCurrentUser();
    const workspaceId = await getCurrentWorkspaceId();

    await prisma.$transaction(async (tx) => {
      for (const occurrence of pendingOccurrences) {
        if (occurrence.habit.defaultBehavior !== "spent") {
          continue;
        }

        const entryData = buildEntryDataForOccurrence(
          {
            id: occurrence.id,
            date: occurrence.date,
            habit: {
              name: occurrence.habit.name,
              categoryId: occurrence.habit.categoryId,
              amount: occurrence.habit.amount,
            },
          },
          "spent",
          {
            workspaceId,
            currentUserId: currentUser.id,
          },
        );

        await tx.habitOccurrence.update({
          where: { id: occurrence.id },
          data: { status: "spent" },
        });

        await tx.entry.upsert({
          where: { habitOccurrenceId: occurrence.id },
          update: entryData,
          create: entryData,
        });

        finalizedCount += 1;
      }
    });

    if (finalizedCount > 0) {
      tryRevalidatePaths();
    }

    return { finalizedCount };
  } catch (error) {
    console.error("Failed to finalize old habit occurrences:", error);
    return { finalizedCount: 0 };
  }
}
