"use server";

import { cacheLife, cacheTag, revalidatePath, updateTag } from "next/cache";

import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { calculateEntryMoney } from "@/src/lib/entry-domain";
import { upsertDefaultCategoryForWorkspace } from "@/src/features/categories/repository";
import type { Prisma } from "@/src/lib/generated/prisma/client";
import { EntryVisibility } from "@/src/lib/generated/prisma/enums";
import { logAndRethrowDataLoadError } from "@/src/lib/data-load-error";
import { prisma } from "@/src/lib/prisma";
import { resolveIsFirstEntryOfDayForHabitOccurrence } from "@/src/lib/entry-first-of-day";
import {
  getDayRangeForDateKey,
  getIsoWeekday,
  getTodayDateKey,
} from "@/src/lib/workspace-dates";
import {
  getCurrentUser,
  getCurrentWorkspaceId,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceScopedWhere,
  getCurrentWorkspaceTimezone,
  requireWorkspaceAccessForRecord,
} from "@/src/lib/workspace-context";
import {
  getDefaultHabitTargetUserId,
  getHabitTargetUserIds,
  normalizeHabitTargetScope,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";

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

const habitCategorySelect = {
  id: true,
  name: true,
  slug: true,
  color: true,
  icon: true,
} as const;

const habitOccurrenceEntrySelect = {
  id: true,
  title: true,
  realCost: true,
  alternativeCost: true,
  savedAmount: true,
  mode: true,
  savingContext: true,
  source: true,
} as const;

type HabitListItem = {
  id: string;
  name: string;
  categoryId: string;
  amount: number;
  activeDays: unknown;
  isActive: boolean;
  defaultBehavior: string;
  targetScope: string;
  targetUserId: string | null;
  reminderEnabled: boolean;
  reminderTime: string | null;
  createdAt: string;
  updatedAt: string;
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
  date: string;
  status: HabitStatus;
  createdAt: string;
  updatedAt: string;
  habit: {
    id: string;
    name: string;
    categoryId: string;
    amount: number;
    activeDays: unknown;
    isActive: boolean;
    defaultBehavior: string;
    targetScope: string;
    targetUserId: string | null;
    reminderEnabled: boolean;
    reminderTime: string | null;
    createdAt: string;
    updatedAt: string;
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
    realCost: number;
    alternativeCost: number;
    savedAmount: number;
    mode: "spent" | "avoided";
    savingContext: "none" | "comparison";
    source: string;
  } | null;
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
    const decimal = value as { toString?: () => string };

    if (typeof decimal.toString === "function") {
      const parsed = Number(decimal.toString().replace(",", "."));
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  return 0;
}

function serializeHabitListItem(
  habit: Omit<HabitListItem, "amount" | "createdAt" | "updatedAt"> & {
    amount: unknown;
    createdAt: Date;
    updatedAt: Date;
  },
): HabitListItem {
  return {
    ...habit,
    amount: toNumber(habit.amount),
    createdAt: habit.createdAt.toISOString(),
    updatedAt: habit.updatedAt.toISOString(),
  };
}

function serializeTodayHabitOccurrence(
  occurrence: {
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
      targetScope: string;
      targetUserId: string | null;
      reminderEnabled: boolean;
      reminderTime: string | null;
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
      mode: "spent" | "avoided";
      savingContext: "none" | "comparison";
      source: string;
    } | null;
  },
): TodayHabitOccurrence {
  return {
    id: occurrence.id,
    habitId: occurrence.habitId,
    date: occurrence.date.toISOString(),
    status: occurrence.status,
    createdAt: occurrence.createdAt.toISOString(),
    updatedAt: occurrence.updatedAt.toISOString(),
    habit: {
      ...occurrence.habit,
      amount: toNumber(occurrence.habit.amount),
      createdAt: occurrence.habit.createdAt.toISOString(),
      updatedAt: occurrence.habit.updatedAt.toISOString(),
    },
    entry: occurrence.entry
      ? {
          id: occurrence.entry.id,
          title: occurrence.entry.title,
          realCost: toNumber(occurrence.entry.realCost),
          alternativeCost: toNumber(occurrence.entry.alternativeCost),
          savedAmount: toNumber(occurrence.entry.savedAmount),
          mode: occurrence.entry.mode,
          savingContext: occurrence.entry.savingContext,
          source: occurrence.entry.source,
        }
      : null,
  };
}

type OccurrenceWithHabit = {
  id: string;
  date: Date;
  habit: {
    name: string;
    categoryId: string;
    amount: unknown;
    targetScope: string;
    targetUserId: string | null;
  };
};

function tryRevalidatePaths() {
  for (const path of ["/", "/entries", "/habits", "/stats", "/workspace/budgets", "/more"]) {
    try {
      revalidatePath(path);
    } catch (error) {
      console.warn(`Failed to revalidate ${path}:`, error);
    }
  }
}

function revalidateHabitOccurrencePaths() {
  for (const path of ["/habits", "/", "/workspace/budgets", "/more"]) {
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

function getTodayDayRange(timeZone: string): { start: Date; end: Date } {
  return getDayRangeForDateKey(getTodayDateKey(timeZone), timeZone);
}

function getTodayIsoWeekday(timeZone: string): number {
  return getIsoWeekday(new Date(), timeZone);
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

function parseCheckbox(value: string): boolean {
  return value === "1" || value === "true" || value === "on";
}

function parseReminderTime(value: string): {
  value: string | null;
  error?: string;
} {
  const raw = value.trim();

  if (!raw) {
    return { value: null };
  }

  const match = raw.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return {
      value: null,
      error: "Inserisci un orario valido nel formato HH:mm",
    };
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return {
      value: null,
      error: "Inserisci un orario valido nel formato HH:mm",
    };
  }

  return { value: raw };
}

function getOptionalFormText(formData: FormData, name: string): string | null {
  if (!formData.has(name)) {
    return null;
  }

  return getText(formData, name);
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
      category = await upsertDefaultCategoryForWorkspace(
        prisma,
        workspaceId,
        fallbackCategory,
      );
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
    members: WorkspaceMemberOption[];
  },
) {
  const amount = Number(occurrence.habit.amount);
  const money =
    status === "spent"
      ? calculateEntryMoney({
          mode: "spent",
          savingContext: "none",
          amountSpent: amount,
        })
      : status === "avoided"
        ? calculateEntryMoney({
            mode: "avoided",
            comparisonAmount: amount,
          })
        : calculateEntryMoney({
            mode: "spent",
            savingContext: "none",
            amountSpent: 0,
          });
  const resolvedBeneficiaries = getHabitTargetUserIds({
    targetScope: occurrence.habit.targetScope,
    targetUserId: occurrence.habit.targetUserId,
    members: context.members,
    currentUserId: context.currentUserId,
  });
  const paidByUserId = context.currentUserId;
  const beneficiaryUserIds =
    resolvedBeneficiaries.length > 0
      ? resolvedBeneficiaries
      : [context.currentUserId];
  const sharedFields = {
    workspaceId: context.workspaceId,
    createdByUserId: context.currentUserId,
    paidByUserId,
    beneficiaries: {
      create: beneficiaryUserIds.map((userId) => ({ userId })),
    },
    visibility: EntryVisibility.workspace,
  };

  if (status === "spent") {
    return {
      ...sharedFields,
      title: occurrence.habit.name,
      categoryId: occurrence.habit.categoryId,
      realCost: toDecimalString(money.realCost),
      alternativeCost: toDecimalString(money.alternativeCost),
      savedAmount: toDecimalString(money.savedAmount),
      mode: money.mode,
      savingContext: money.savingContext,
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
      realCost: toDecimalString(money.realCost),
      alternativeCost: toDecimalString(money.alternativeCost),
      savedAmount: toDecimalString(money.savedAmount),
      mode: money.mode,
      savingContext: money.savingContext,
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
    realCost: toDecimalString(money.realCost),
    alternativeCost: toDecimalString(money.alternativeCost),
    savedAmount: toDecimalString(money.savedAmount),
    mode: money.mode,
    savingContext: money.savingContext,
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
  const startedAt = performance.now();
  const logStep = (label: string) => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    console.info(
      `[perf] habits/syncOccurrenceStatus/${label} ${Math.round(performance.now() - startedAt)}ms`,
    );
  };

  if (!id) {
    return {
      success: false,
      message: "ID ricorrente non valido",
    };
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();
    const occurrence = await prisma.habitOccurrence.findFirst({
      where: {
        id,
        habit: { workspaceId },
      },
      include: {
        habit: true,
      },
    });
    logStep("load-occurrence");

    if (!occurrence) {
      return {
        success: false,
        message: "Occorrenza non trovata",
      };
    }

    await requireWorkspaceAccessForRecord(occurrence, "Occorrenza ricorrente");
    logStep("access-check");

    const [currentUser, members, workspaceWhere, timeZone] = await Promise.all([
      getCurrentUser(),
      getCurrentWorkspaceMembers(),
      getCurrentWorkspaceScopedWhere(),
      getCurrentWorkspaceTimezone(),
    ]);
    logStep("workspace-context");

    await prisma.$transaction(async (tx) => {
      await tx.habitOccurrence.updateMany({
        where: {
          id,
          habit: { workspaceId },
        },
        data: { status },
      });

      if (status === "skipped") {
        await tx.entry.deleteMany({
          where: {
            workspaceId,
            habitOccurrenceId: id,
          },
        });
        return;
      }

      const isFirstEntryOfDay = await resolveIsFirstEntryOfDayForHabitOccurrence(
        occurrence.date,
        timeZone,
        workspaceWhere,
        tx,
        id,
      );

      const entryData = {
        ...buildEntryDataForOccurrence(occurrence, status, {
          workspaceId,
          currentUserId: currentUser.id,
          members,
        }),
        isFirstEntryOfDay,
      };

      await tx.entry.upsert({
        where: { habitOccurrenceId: id },
        update: entryData,
        create: entryData,
      });
    });
    logStep("transaction");

    revalidateHabitOccurrencePaths();
    updateTag(`habits:${workspaceId}`);
    updateTag(`entries:${workspaceId}`);
    logStep("revalidate");

    return {
      success: true,
      message:
        status === "spent"
          ? "Segnata come pagata"
          : status === "avoided"
            ? "Segnata come evitata"
            : "Segnata come non applicabile",
    };
  } catch (error) {
    console.error("Failed to update habit occurrence:", error);
    return {
      success: false,
      message: "Non riesco ad aggiornare la ricorrente adesso. Riprova tra poco.",
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
  const targetScopeInput = getOptionalFormText(formData, "targetScope");
  const targetUserIdInput = getOptionalFormText(formData, "targetUserId");
  const reminderEnabledInput = getOptionalFormText(formData, "reminderEnabled");
  const reminderTimeInput = getOptionalFormText(formData, "reminderTime");
  const targetScope = normalizeHabitTargetScope(targetScopeInput);
  const reminderEnabled =
    reminderEnabledInput === null ? false : parseCheckbox(reminderEnabledInput);
  const reminderTime =
    reminderEnabled && reminderTimeInput !== null
      ? parseReminderTime(reminderTimeInput)
      : { value: null as string | null };

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

  if (targetScopeInput !== null && !targetScopeInput) {
    errors.targetScope = "Seleziona per chi vale la ricorrente";
  } else if (
    targetScopeInput !== null &&
    targetScopeInput !== "self" &&
    targetScopeInput !== "shared"
  ) {
    errors.targetScope = "Seleziona per chi vale la ricorrente";
  }

  if (
    reminderEnabled &&
    (reminderTimeInput === null || !reminderTimeInput.trim())
  ) {
    errors.reminderTime = "Seleziona un orario per il promemoria";
  } else if (reminderEnabled && reminderTime.error) {
    errors.reminderTime = reminderTime.error;
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Controlla i campi evidenziati",
      errors,
    };
  }

  try {
    const [workspaceId, currentUser, members] = await Promise.all([
      getCurrentWorkspaceId(),
      getCurrentUser(),
      getCurrentWorkspaceMembers(),
    ]);
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

    const resolvedTargetUserId =
      targetScope === "shared"
        ? null
        : targetUserIdInput !== null
          ? targetUserIdInput || getDefaultHabitTargetUserId(members, currentUser.id)
          : getDefaultHabitTargetUserId(members, currentUser.id);

    if (
      targetScope === "self" &&
      targetUserIdInput !== null &&
      targetUserIdInput &&
      !members.some((member) => member.userId === targetUserIdInput)
    ) {
      return {
        success: false,
        message: "Controlla i campi evidenziati",
        errors: {
          targetUserId: "Seleziona un utente valido",
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
        isActive: true,
        defaultBehavior: "spent",
        targetScope,
        targetUserId: resolvedTargetUserId,
        reminderEnabled,
        reminderTime: reminderEnabled ? reminderTime.value : null,
      },
    });

    tryRevalidatePaths();

    return {
      success: true,
      message: "Ricorrente salvata con successo",
    };
  } catch (error) {
    console.error("Failed to create habit:", error);
    return {
      success: false,
      message:
        "Non riesco a salvare la ricorrente adesso. Controlla il database e riprova tra poco.",
    };
  }
}

function isHabitDeleteMode(value: string): value is HabitDeleteMode {
  return value === "habit_only" || value === "habit_and_entries";
}

function getHabitLinkedEntriesWhere(
  habitId: string,
  workspaceId: string,
): Prisma.EntryWhereInput {
  return {
    workspaceId,
    habitOccurrence: {
      habitId,
    },
  };
}

async function applyHabitDeletionToLinkedEntries(
  tx: Prisma.TransactionClient,
  habitId: string,
  workspaceId: string,
  mode: HabitDeleteMode,
): Promise<void> {
  const linkedEntriesWhere = getHabitLinkedEntriesWhere(habitId, workspaceId);

  if (mode === "habit_and_entries") {
    await tx.entry.deleteMany({
      where: linkedEntriesWhere,
    });
    return;
  }

  await tx.entry.updateMany({
    where: linkedEntriesWhere,
    data: {
      habitOccurrenceId: null,
    },
  });
}

export async function deleteHabit(
  habitId: string,
  mode: HabitDeleteMode,
): Promise<HabitActionResult> {
  const id = habitId.trim();

  if (!id) {
    return {
      success: false,
      message: "ID ricorrente non valido",
    };
  }

  if (!isHabitDeleteMode(mode)) {
    return {
      success: false,
      message: "Modalità di eliminazione non valida",
    };
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();
    const habit = await prisma.habit.findUnique({
      where: { id, workspaceId },
      select: {
        id: true,
      },
    });

    if (!habit) {
      return {
        success: false,
        message: "Ricorrente non trovata",
      };
    }

    await prisma.$transaction(async (tx) => {
      await applyHabitDeletionToLinkedEntries(tx, id, workspaceId, mode);

      await tx.habit.delete({
        where: { id, workspaceId },
      });
    });

    tryRevalidatePaths();

    return {
      success: true,
      message:
        mode === "habit_and_entries"
          ? "Ricorrente e movimenti collegati eliminati"
          : "Ricorrente eliminata. I movimenti generati restano nel registro.",
    };
  } catch (error) {
    console.error("Failed to delete habit:", error);
    return {
      success: false,
      message: "Non riesco a eliminare la ricorrente adesso. Riprova tra poco.",
    };
  }
}

export async function updateHabit(
  habitId: string,
  formData: FormData,
): Promise<HabitActionResult> {
  const id = habitId.trim();
  const errors: Record<string, string> = {};

  if (!id) {
    return {
      success: false,
      message: "ID ricorrente non valido",
    };
  }

  const name = getText(formData, "name");
  const categoryId = getText(formData, "categoryId");
  const amount = getMoney(formData, "amount");
  const activeDays = parseActiveDays(formData);
  const isActive = parseBoolean(getText(formData, "isActive"));
  const targetScopeInput = getOptionalFormText(formData, "targetScope");
  const targetUserIdInput = getOptionalFormText(formData, "targetUserId");
  const reminderEnabledInput = getOptionalFormText(formData, "reminderEnabled");
  const reminderTimeInput = getOptionalFormText(formData, "reminderTime");

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
    const existingHabit = await prisma.habit.findUnique({
      where: { id, workspaceId },
      select: {
        id: true,
        targetScope: true,
        targetUserId: true,
        reminderEnabled: true,
        reminderTime: true,
      },
    });

    if (!existingHabit) {
      return {
        success: false,
        message: "Ricorrente non trovata",
      };
    }

    const [currentUser, members] = await Promise.all([
      getCurrentUser(),
      getCurrentWorkspaceMembers(),
    ]);
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

    const nextTargetScope = normalizeHabitTargetScope(
      targetScopeInput ?? existingHabit.targetScope,
    );
    const nextTargetUserId =
      nextTargetScope === "shared"
        ? null
        : targetUserIdInput !== null
          ? targetUserIdInput || getDefaultHabitTargetUserId(members, currentUser.id)
          : existingHabit.targetUserId ?? getDefaultHabitTargetUserId(members, currentUser.id);
    const nextReminderEnabled =
      reminderEnabledInput !== null
        ? parseCheckbox(reminderEnabledInput)
        : existingHabit.reminderEnabled;
    const nextReminderTimeInput =
      reminderTimeInput !== null ? reminderTimeInput : existingHabit.reminderTime;
    const nextReminderTime =
      nextReminderEnabled && nextReminderTimeInput !== null
        ? parseReminderTime(nextReminderTimeInput)
        : { value: null as string | null };

    if (
      targetScopeInput !== null &&
      targetScopeInput !== "self" &&
      targetScopeInput !== "shared"
    ) {
      errors.targetScope = "Seleziona per chi vale la ricorrente";
    }

    if (
      nextTargetScope === "self" &&
      nextTargetUserId &&
      !members.some((member) => member.userId === nextTargetUserId)
    ) {
      errors.targetUserId = "Seleziona un utente valido";
    }

    if (
      nextReminderEnabled &&
      (nextReminderTimeInput === null || !nextReminderTimeInput.trim())
    ) {
      errors.reminderTime = "Seleziona un orario per il promemoria";
    } else if (nextReminderEnabled && nextReminderTime.error) {
      errors.reminderTime = nextReminderTime.error;
    }

    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        message: "Controlla i campi evidenziati",
        errors,
      };
    }

    await prisma.habit.update({
      where: { id, workspaceId },
      data: {
        name,
        categoryId: category.id,
        amount: toDecimalString(amount.value),
        activeDays: activeDays.value,
        isActive,
        targetScope: nextTargetScope,
        targetUserId: nextTargetUserId,
        reminderEnabled: nextReminderEnabled,
        reminderTime: nextReminderEnabled ? nextReminderTime.value : null,
      },
    });

    tryRevalidatePaths();

    return {
      success: true,
      message: "Ricorrente aggiornata con successo",
    };
  } catch (error) {
    console.error("Failed to update habit:", error);
    return {
      success: false,
      message:
        "Non riesco ad aggiornare la ricorrente adesso. Controlla il database e riprova tra poco.",
    };
  }
}

export async function deleteHabitFromForm(
  formData: FormData,
): Promise<HabitActionResult> {
  const habitId = getText(formData, "habitId");
  const mode = getText(formData, "deleteMode");

  if (!isHabitDeleteMode(mode)) {
    return {
      success: false,
      message: "Modalità di eliminazione non valida",
    };
  }

  return deleteHabit(habitId, mode);
}

export async function getHabits(): Promise<HabitListItem[]> {
  try {
    const workspaceWhere = await getCurrentWorkspaceScopedWhere();

    const habits = await prisma.habit.findMany({
      where: workspaceWhere,
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        categoryId: true,
        amount: true,
        activeDays: true,
        isActive: true,
        defaultBehavior: true,
        targetScope: true,
        targetUserId: true,
        reminderEnabled: true,
        reminderTime: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: habitCategorySelect,
        },
        _count: {
          select: {
            occurrences: true,
          },
        },
      },
    });

    return habits.map(serializeHabitListItem);
  } catch (error) {
    logAndRethrowDataLoadError("Failed to load habits", error);
  }
}

export async function ensureTodayHabitOccurrences(): Promise<SyncResult> {
  const timeZone = await getCurrentWorkspaceTimezone();
  const todayStart = getTodayDayRange(timeZone).start;

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

    const todayWeekday = getTodayIsoWeekday(timeZone);
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

    return { createdCount: result.count };
  } catch (error) {
    console.error("Failed to ensure today habit occurrences:", error);
    return { createdCount: 0 };
  }
}

export async function getTodayHabitOccurrences(): Promise<TodayHabitOccurrence[]> {
  const [workspaceId, timeZone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceTimezone(),
  ]);
  return _cachedTodayHabitOccurrences(workspaceId, timeZone);
}

async function _cachedTodayHabitOccurrences(workspaceId: string, timeZone: string): Promise<TodayHabitOccurrence[]> {
  "use cache";
  cacheTag(`habits:${workspaceId}`);
  cacheLife("minutes");

  const todayRange = getTodayDayRange(timeZone);

  try {
    const occurrences = await prisma.habitOccurrence.findMany({
      where: {
        date: {
          gte: todayRange.start,
          lt: todayRange.end,
        },
        habit: {
          is: { workspaceId },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        habitId: true,
        date: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        habit: {
          select: {
            id: true,
            name: true,
            categoryId: true,
            amount: true,
            activeDays: true,
            isActive: true,
            defaultBehavior: true,
            targetScope: true,
            targetUserId: true,
            reminderEnabled: true,
            reminderTime: true,
            createdAt: true,
            updatedAt: true,
            category: {
              select: habitCategorySelect,
            },
          },
        },
        entry: {
          select: habitOccurrenceEntrySelect,
        },
      },
    });

    return occurrences.map(serializeTodayHabitOccurrence);
  } catch (error) {
    logAndRethrowDataLoadError("Failed to load today habit occurrences", error);
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
  const timeZone = await getCurrentWorkspaceTimezone();
  const todayStart = getTodayDayRange(timeZone).start;

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
            targetScope: true,
            targetUserId: true,
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
    const [currentUser, workspaceId, members] = await Promise.all([
      getCurrentUser(),
      getCurrentWorkspaceId(),
      getCurrentWorkspaceMembers(),
    ]);

    await prisma.$transaction(async (tx) => {
      for (const occurrence of pendingOccurrences) {
        if (occurrence.habit.defaultBehavior !== "spent") {
          continue;
        }

        const isFirstEntryOfDay = await resolveIsFirstEntryOfDayForHabitOccurrence(
          occurrence.date,
          timeZone,
          workspaceWhere,
          tx,
          occurrence.id,
        );

        const entryData = {
          ...buildEntryDataForOccurrence(
            {
              id: occurrence.id,
              date: occurrence.date,
              habit: {
                name: occurrence.habit.name,
                categoryId: occurrence.habit.categoryId,
                amount: occurrence.habit.amount,
                targetScope: occurrence.habit.targetScope,
                targetUserId: occurrence.habit.targetUserId,
              },
            },
            "spent",
            {
              workspaceId,
              currentUserId: currentUser.id,
              members,
            },
          ),
          isFirstEntryOfDay,
        };

        await tx.habitOccurrence.updateMany({
          where: {
            id: occurrence.id,
            habit: { workspaceId },
          },
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

    return { finalizedCount };
  } catch (error) {
    console.error("Failed to finalize old habit occurrences:", error);
    return { finalizedCount: 0 };
  }
}
