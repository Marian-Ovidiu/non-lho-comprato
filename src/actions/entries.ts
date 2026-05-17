"use server";

import { revalidatePath } from "next/cache";

import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { calculateSavedAmount } from "@/src/lib/entry-calculations";
import { EntryVisibility } from "@/src/lib/generated/prisma/enums";
import { prisma } from "@/src/lib/prisma";
import { buildPersonWhere, type PersonFilterValue } from "@/src/lib/person-filter";
import type { LegacyPersonValue } from "@/src/lib/ui-person";
import {
  getDefaultBeneficiaryUserIds,
  getDefaultPaidByUserId,
  mapUserIdsToLegacyPersonFields,
  resolveEntryPeopleFromRecord,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";
import {
  getCurrentUser,
  getCurrentWorkspaceId,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceScopedWhere,
  requireWorkspaceAccessForRecord,
} from "@/src/lib/workspace-context";

type CreateEntryResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
  isFirstEntryCreated?: boolean;
};

type EntryWithCategory = {
  id: string;
  title: string;
  categoryId: string;
  realCost: unknown;
  alternativeCost: unknown;
  savedAmount: unknown;
  date: Date;
  note: string | null;
  source: string;
  person: LegacyPersonValue;
  paidBy: LegacyPersonValue;
  beneficiaries: { userId: string }[];
  paidByUserId: string | null;
  habitOccurrenceId: string | null;
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

type SerializableEntry = {
  id: string;
  title: string;
  categoryId: string;
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  date: string;
  note: string | null;
  source: string;
  person: LegacyPersonValue;
  paidByUserId: string;
  beneficiaryUserIds: string[];
  habitOccurrenceId: string | null;
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

type MonthlySummary = {
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
};

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

function getPaidByUserId(
  formData: FormData,
  members: WorkspaceMemberOption[],
  currentUserId: string,
): {
  value: string;
  error?: string;
} {
  const raw = getText(formData, "paidByUserId");
  const memberIds = new Set(members.map((member) => member.userId));

  if (raw && memberIds.has(raw)) {
    return { value: raw };
  }

  if (!raw) {
    return {
      value: getDefaultPaidByUserId(members, currentUserId),
    };
  }

  return {
    value: getDefaultPaidByUserId(members, currentUserId),
    error: "Seleziona chi ha pagato",
  };
}

function getBeneficiaryUserIds(
  formData: FormData,
  members: WorkspaceMemberOption[],
  paidByUserId: string,
): {
  value: string[];
  error?: string;
} {
  const rawValues = formData.getAll("beneficiaryUserIds");
  const isExplicitField = getText(formData, "beneficiariesMode") === "explicit";
  const memberIds = new Set(members.map((member) => member.userId));

  if (rawValues.length === 0) {
    if (isExplicitField) {
      return {
        value: getDefaultBeneficiaryUserIds(members, paidByUserId),
        error: "Seleziona almeno un beneficiario",
      };
    }

    return {
      value: getDefaultBeneficiaryUserIds(members, paidByUserId),
    };
  }

  const values = rawValues
    .filter((value): value is string => typeof value === "string")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  const invalidValue = values.find((value) => !memberIds.has(value));

  if (invalidValue) {
    return {
      value: getDefaultBeneficiaryUserIds(members, paidByUserId),
      error: "Seleziona beneficiari validi",
    };
  }

  const beneficiaryUserIds = Array.from(new Set(values));

  if (beneficiaryUserIds.length === 0) {
    return {
      value: getDefaultBeneficiaryUserIds(members, paidByUserId),
      error: "Seleziona almeno un beneficiario",
    };
  }

  return { value: beneficiaryUserIds };
}

function toDecimalString(value: number): string {
  return value.toFixed(2);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
}

function tryRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    console.warn(`Failed to revalidate ${path}:`, error);
  }
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

function isMissingEntryBeneficiaryTable(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String(error.code) : "";
  if (code === "P2021") {
    return true;
  }

  const message = "message" in error ? String(error.message) : "";
  return (
    message.includes("EntryBeneficiary") &&
    message.includes("does not exist")
  );
}

function logEntryLoadError(
  operation: string,
  error: unknown,
  context: Record<string, unknown> = {},
) {
  const prismaCode =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : undefined;

  console.error(`[entries] ${operation} failed`, {
    ...context,
    prismaCode,
    message: error instanceof Error ? error.message : String(error),
    hint:
      prismaCode === "P2021" || isMissingEntryBeneficiaryTable(error)
        ? 'Run "npx prisma migrate deploy" to create EntryBeneficiary.'
        : undefined,
  });
  console.error(error);
}

async function findEntriesForList(
  where: Awaited<ReturnType<typeof getCurrentWorkspaceScopedWhere>>,
): Promise<EntryWithCategory[]> {
  const baseQuery = {
    where,
    orderBy: {
      date: "desc" as const,
    },
    include: {
      category: true,
    },
  };

  try {
    return await prisma.entry.findMany({
      ...baseQuery,
      include: {
        ...baseQuery.include,
        beneficiaries: {
          select: {
            userId: true,
          },
        },
      },
    });
  } catch (error) {
    if (!isMissingEntryBeneficiaryTable(error)) {
      throw error;
    }

    logEntryLoadError("findEntriesForList.beneficiariesInclude", error, {
      fallback: "legacy-person-fields",
    });

    const entries = await prisma.entry.findMany(baseQuery);
    return entries.map((entry) => ({
      ...entry,
      beneficiaries: [],
    }));
  }
}

function serializeEntry(
  entry: EntryWithCategory,
  members: WorkspaceMemberOption[],
): SerializableEntry {
  const people = resolveEntryPeopleFromRecord(entry, members);

  return {
    id: entry.id,
    title: entry.title,
    categoryId: entry.categoryId,
    realCost: toNumber(entry.realCost),
    alternativeCost: toNumber(entry.alternativeCost),
    savedAmount: toNumber(entry.savedAmount),
    date: entry.date.toISOString(),
    note: entry.note,
    source: entry.source,
    person: entry.person,
    paidByUserId: people.paidByUserId,
    beneficiaryUserIds: people.beneficiaryUserIds,
    habitOccurrenceId: entry.habitOccurrenceId,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    category: {
      id: entry.category.id,
      name: entry.category.name,
      slug: entry.category.slug,
      color: entry.category.color,
      icon: entry.category.icon,
    },
  };
}

export async function getEntries(
  person?: PersonFilterValue,
): Promise<SerializableEntry[]> {
  let workspaceId = "unknown";

  try {
    const [workspaceWhere, members] = await Promise.all([
      getCurrentWorkspaceScopedWhere(buildPersonWhere(person)),
      getCurrentWorkspaceMembers(),
    ]);

    workspaceId = workspaceWhere.workspaceId;
    const entries = await findEntriesForList(workspaceWhere);

    return entries.map((entry) => serializeEntry(entry, members));
  } catch (error) {
    logEntryLoadError("getEntries", error, {
      workspaceId,
      personFilter: person ?? "all",
    });
    throw error;
  }
}

export async function getEntryById(
  entryId: string,
): Promise<SerializableEntry | null> {
  const id = entryId.trim();

  if (!id) {
    return null;
  }

  try {
    const entrySelect = {
      id: true,
      title: true,
      categoryId: true,
      realCost: true,
      alternativeCost: true,
      savedAmount: true,
      date: true,
      note: true,
      source: true,
      person: true,
      paidBy: true,
      paidByUserId: true,
      habitOccurrenceId: true,
      createdAt: true,
      updatedAt: true,
      workspaceId: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          color: true,
          icon: true,
        },
      },
    } as const;

    let entry:
      | (EntryWithCategory & { workspaceId: string | null })
      | null = null;

    try {
      entry = await prisma.entry.findUnique({
        where: { id },
        select: {
          ...entrySelect,
          beneficiaries: {
            select: {
              userId: true,
            },
          },
        },
      });
    } catch (error) {
      if (!isMissingEntryBeneficiaryTable(error)) {
        throw error;
      }

      logEntryLoadError("getEntryById.beneficiariesSelect", error, {
        entryId: id,
        fallback: "legacy-person-fields",
      });

      const legacyEntry = await prisma.entry.findUnique({
        where: { id },
        select: entrySelect,
      });

      entry = legacyEntry
        ? {
            ...legacyEntry,
            beneficiaries: [],
          }
        : null;
    }

    if (!entry) {
      return null;
    }

    await requireWorkspaceAccessForRecord(entry, "Movimento");

    const members = await getCurrentWorkspaceMembers();
    return serializeEntry(entry, members);
  } catch (error) {
    logEntryLoadError("getEntryById", error, { entryId: id });
    throw error;
  }
}

export async function getDashboardSummary(
  person?: PersonFilterValue,
): Promise<MonthlySummary> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const nextMonthStart = startOfNextMonth(now);
  const workspaceWhere = await getCurrentWorkspaceScopedWhere({
    ...buildPersonWhere(person),
    date: {
      gte: monthStart,
      lt: nextMonthStart,
    },
  });

  const entries = await prisma.entry.findMany({
    where: workspaceWhere,
    select: {
      realCost: true,
      alternativeCost: true,
      savedAmount: true,
    },
  });

  const summary: MonthlySummary = {
    totalRealSpent: 0,
    totalAlternativeCost: 0,
    totalSaved: 0,
    entriesCount: 0,
  };

  for (const entry of entries) {
    summary.totalRealSpent += Number(entry.realCost);
    summary.totalAlternativeCost += Number(entry.alternativeCost);
    summary.totalSaved += Number(entry.savedAmount);
    summary.entriesCount += 1;
  }

  return {
    totalRealSpent: Number(summary.totalRealSpent.toFixed(2)),
    totalAlternativeCost: Number(summary.totalAlternativeCost.toFixed(2)),
    totalSaved: Number(summary.totalSaved.toFixed(2)),
    entriesCount: summary.entriesCount,
  };
}

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: await getCurrentWorkspaceScopedWhere(),
      orderBy: {
        name: "asc",
      },
    });

    if (categories.length > 0) {
      return categories;
    }
  } catch (error) {
    console.warn("Falling back to static categories:", error);
  }

  return DEFAULT_CATEGORIES.map((category) => ({
    id: category.slug,
    name: category.name,
    slug: category.slug,
    color: category.color,
    icon: category.icon,
  }));
}

export async function createEntry(
  formData: FormData,
): Promise<CreateEntryResult> {
  const errors: Record<string, string> = {};

  const title = getText(formData, "title");
  const categoryId = getText(formData, "categoryId");
  const note = getText(formData, "note");
  const dateValue = getText(formData, "date");
  const realCost = getMoney(formData, "realCost");
  const alternativeCost = getMoney(formData, "alternativeCost");
  let members: WorkspaceMemberOption[] = [];
  let currentUserId = "";

  try {
    const [loadedMembers, currentUser] = await Promise.all([
      getCurrentWorkspaceMembers(),
      getCurrentUser(),
    ]);
    members = loadedMembers;
    currentUserId = currentUser.id;
  } catch {
    members = [];
  }

  const paidByUserId = getPaidByUserId(formData, members, currentUserId);
  const beneficiaryUserIds = getBeneficiaryUserIds(
    formData,
    members,
    paidByUserId.value,
  );
  const legacyFields =
    members.length > 0
      ? mapUserIdsToLegacyPersonFields(
          paidByUserId.value,
          beneficiaryUserIds.value,
          members,
        )
      : null;

  if (!title) {
    errors.title = "Il titolo è obbligatorio";
  } else if (title.length < 2) {
    errors.title = "Il titolo deve avere almeno 2 caratteri";
  }

  if (!categoryId) {
    errors.categoryId = "Seleziona una categoria";
  }

  if (realCost.error) {
    errors.realCost = realCost.error;
  }

  if (alternativeCost.error) {
    errors.alternativeCost = alternativeCost.error;
  }

  if (members.length === 0) {
    errors.paidByUserId = "Nessun membro disponibile nel workspace";
  }

  if (paidByUserId.error) {
    errors.paidByUserId = paidByUserId.error;
  }

  if (beneficiaryUserIds.error) {
    errors.beneficiaryUserIds = beneficiaryUserIds.error;
  }

  const date = new Date(dateValue);
  if (!dateValue || Number.isNaN(date.getTime())) {
    errors.date = "Inserisci una data valida";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Controlla i campi evidenziati",
      errors,
    };
  }

  if (!legacyFields) {
    return {
      success: false,
      message: "Controlla i campi evidenziati",
      errors: {
        paidByUserId: "Nessun membro disponibile nel workspace",
      },
    };
  }

  const savedAmount = calculateSavedAmount(
    realCost.value,
    alternativeCost.value,
  );

  try {
    const currentUser = await getCurrentUser();
    const workspaceId = await getCurrentWorkspaceId();
    const existingEntryCount = await prisma.entry.count({
      where: await getCurrentWorkspaceScopedWhere(),
    });
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

    await prisma.entry.create({
      data: {
        workspaceId,
        title,
        categoryId: category.id,
        realCost: toDecimalString(realCost.value),
        alternativeCost: toDecimalString(alternativeCost.value),
        savedAmount: toDecimalString(savedAmount),
        date,
        note: note || null,
        source: "manual",
        paidByUserId: paidByUserId.value,
        beneficiaries: {
          create: beneficiaryUserIds.value.map((userId) => ({ userId })),
        },
        person: legacyFields.person,
        paidBy: legacyFields.paidBy,
        createdByUserId: currentUser.id,
        visibility: EntryVisibility.workspace,
      },
    });

    tryRevalidatePath("/");
    tryRevalidatePath("/entries");
    tryRevalidatePath("/stats");

    return {
      success: true,
      message: "Entrata salvata con successo",
      isFirstEntryCreated: existingEntryCount === 0,
    };
  } catch (error) {
    console.error("Failed to create entry:", error);
    return {
      success: false,
      message:
        "Non riesco a salvare il movimento adesso. Controlla il database e riprova tra poco.",
    };
  }
}

export async function updateEntry(
  entryId: string,
  formData: FormData,
): Promise<CreateEntryResult> {
  const id = entryId.trim();
  const errors: Record<string, string> = {};

  if (!id) {
    errors.entryId = "ID movimento non valido";
  }

  const title = getText(formData, "title");
  const categoryId = getText(formData, "categoryId");
  const note = getText(formData, "note");
  const dateValue = getText(formData, "date");
  const realCost = getMoney(formData, "realCost");
  const alternativeCost = getMoney(formData, "alternativeCost");
  let members: WorkspaceMemberOption[] = [];
  let currentUserId = "";

  try {
    const [loadedMembers, currentUser] = await Promise.all([
      getCurrentWorkspaceMembers(),
      getCurrentUser(),
    ]);
    members = loadedMembers;
    currentUserId = currentUser.id;
  } catch {
    members = [];
  }

  const paidByUserId = getPaidByUserId(formData, members, currentUserId);
  const beneficiaryUserIds = getBeneficiaryUserIds(
    formData,
    members,
    paidByUserId.value,
  );
  const legacyFields =
    members.length > 0
      ? mapUserIdsToLegacyPersonFields(
          paidByUserId.value,
          beneficiaryUserIds.value,
          members,
        )
      : null;

  if (!title) {
    errors.title = "Il titolo è obbligatorio";
  } else if (title.length < 2) {
    errors.title = "Il titolo deve avere almeno 2 caratteri";
  }

  if (!categoryId) {
    errors.categoryId = "Seleziona una categoria";
  }

  if (realCost.error) {
    errors.realCost = realCost.error;
  }

  if (alternativeCost.error) {
    errors.alternativeCost = alternativeCost.error;
  }

  if (members.length === 0) {
    errors.paidByUserId = "Nessun membro disponibile nel workspace";
  }

  if (paidByUserId.error) {
    errors.paidByUserId = paidByUserId.error;
  }

  if (beneficiaryUserIds.error) {
    errors.beneficiaryUserIds = beneficiaryUserIds.error;
  }

  const date = new Date(dateValue);
  if (!dateValue || Number.isNaN(date.getTime())) {
    errors.date = "Inserisci una data valida";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Controlla i campi evidenziati",
      errors,
    };
  }

  if (!legacyFields) {
    return {
      success: false,
      message: "Controlla i campi evidenziati",
      errors: {
        paidByUserId: "Nessun membro disponibile nel workspace",
      },
    };
  }

  const savedAmount = calculateSavedAmount(
    realCost.value,
    alternativeCost.value,
  );

  try {
    const existingEntry = await prisma.entry.findUnique({
      where: { id },
      select: {
        id: true,
        source: true,
        habitOccurrenceId: true,
        workspaceId: true,
        createdByUserId: true,
        paidByUserId: true,
      },
    });

    if (!existingEntry) {
      return {
        success: false,
        message: "Movimento non trovato",
      };
    }

    await requireWorkspaceAccessForRecord(existingEntry, "Movimento");

    const currentUser = await getCurrentUser();
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

    await prisma.$transaction(async (tx) => {
      await tx.entryBeneficiary.deleteMany({
        where: { entryId: id },
      });

      await tx.entry.update({
        where: { id },
        data: {
          workspaceId,
          title,
          categoryId: category.id,
          realCost: toDecimalString(realCost.value),
          alternativeCost: toDecimalString(alternativeCost.value),
          savedAmount: toDecimalString(savedAmount),
          date,
          note: note || null,
          paidByUserId: paidByUserId.value,
          beneficiaries: {
            create: beneficiaryUserIds.value.map((userId) => ({ userId })),
          },
          person: legacyFields.person,
          paidBy: legacyFields.paidBy,
          source: existingEntry.source,
          habitOccurrenceId: existingEntry.habitOccurrenceId,
          createdByUserId: existingEntry.createdByUserId ?? currentUser.id,
          visibility: EntryVisibility.workspace,
        },
      });
    });

    tryRevalidatePath("/");
    tryRevalidatePath("/entries");
    tryRevalidatePath("/stats");
    tryRevalidatePath("/habits");
    tryRevalidatePath("/goals");
    tryRevalidatePath("/reports/monthly");

    return {
      success: true,
      message: "Movimento aggiornato con successo",
    };
  } catch (error) {
    console.error("Failed to update entry:", error);
    return {
      success: false,
      message:
        "Non riesco ad aggiornare il movimento adesso. Controlla il database e riprova tra poco.",
    };
  }
}

type DeleteEntryResult = {
  success: boolean;
  message: string;
};

export async function deleteEntry(entryId: string): Promise<DeleteEntryResult> {
  const id = entryId.trim();

  if (!id) {
    return {
      success: false,
      message: "ID movimento non valido",
    };
  }

  try {
    const entry = await prisma.entry.findUnique({
      where: { id },
      select: {
        id: true,
        source: true,
        habitOccurrenceId: true,
        workspaceId: true,
      },
    });

    if (!entry) {
      return {
        success: false,
        message: "Movimento non trovato",
      };
    }

    await requireWorkspaceAccessForRecord(entry, "Movimento");

    if (entry.habitOccurrenceId) {
      const habitOccurrence = await prisma.habitOccurrence.findUnique({
        where: { id: entry.habitOccurrenceId },
        include: {
          habit: {
            select: {
              workspaceId: true,
            },
          },
        },
      });

      await requireWorkspaceAccessForRecord(habitOccurrence, "Occorrenza abitudine");

      await prisma.$transaction([
        prisma.entry.delete({
          where: { id },
        }),
        prisma.habitOccurrence.update({
          where: { id: entry.habitOccurrenceId },
          data: {
            status: "skipped",
          },
        }),
      ]);
    } else {
      await prisma.entry.delete({
        where: { id },
      });
    }

    tryRevalidatePath("/");
    tryRevalidatePath("/entries");
    tryRevalidatePath("/stats");
    tryRevalidatePath("/habits");
    tryRevalidatePath("/goals");
    tryRevalidatePath("/reports/monthly");

    return {
      success: true,
      message: "Movimento eliminato",
    };
  } catch (error) {
    console.error("Failed to delete entry:", error);
    return {
      success: false,
      message: "Si è verificato un errore durante l'eliminazione",
    };
  }
}
