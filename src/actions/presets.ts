"use server";

import { revalidatePath } from "next/cache";

import { createEntry } from "@/src/actions/entries";
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { upsertDefaultCategoryForWorkspace } from "@/src/features/categories/repository";
import {
  calculateEntryMoney,
  toEntryMoneyView,
  type EntryMode,
  type EntryMoneyView,
  type EntrySavingContext,
} from "@/src/lib/entry-domain";
import { getWorkspaceMemberSlots } from "@/src/lib/member-slots";
import { prisma } from "@/src/lib/prisma";
import type { PersonFilterValue } from "@/src/lib/person-filter";
import {
  normalizeLegacyPerson,
  type LegacyPersonValue,
} from "@/src/lib/ui-person";
import {
  getDefaultBeneficiaryUserIds,
  getDefaultPaidByUserId,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";
import {
  getCurrentUser,
  getCurrentWorkspaceId,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceScopedWhere,
  requireWorkspaceAccessForRecord,
} from "@/src/lib/workspace-context";

type PresetActionResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
  isFirstEntryOfDay?: boolean;
  streakFrom?: number;
  streakTo?: number;
};

export type SerializablePreset = {
  id: string;
  title: string;
  mode: EntryMode;
  savingContext: EntrySavingContext;
  realCost: string;
  alternativeCost: string;
  amountSpent: string;
  comparisonAmount: string;
  savingImpact: string;
  note: string | null;
  person: LegacyPersonValue | null;
  createdAt: string;
  category: {
    name: string;
  };
};

type DecimalLike = {
  toString?: () => string;
};

type ParsedMoneyField = {
  value: number;
  provided: boolean;
  error?: string;
};

type ResolvedPresetMoney = {
  money?: EntryMoneyView;
  errors: Record<string, string>;
};

const ROME_TIME_ZONE = "Europe/Rome";

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

function getOptionalMoney(formData: FormData, name: string): ParsedMoneyField {
  const raw = getText(formData, name);

  if (!raw) {
    return {
      value: Number.NaN,
      provided: false,
    };
  }

  const normalized = raw.replace(",", ".");
  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    return {
      value: Number.NaN,
      provided: true,
      error: "Inserisci un numero valido",
    };
  }

  if (value < 0) {
    return {
      value,
      provided: true,
      error: "Il valore deve essere maggiore o uguale a 0",
    };
  }

  return {
    value,
    provided: true,
  };
}

function tryRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    console.warn(`Failed to revalidate ${path}:`, error);
  }
}

function revalidatePresetPaths() {
  for (const path of ["/", "/entries", "/stats", "/presets"]) {
    tryRevalidatePath(path);
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
      category = await upsertDefaultCategoryForWorkspace(
        prisma,
        workspaceId,
        fallbackCategory,
      );
    }
  }

  return category;
}

function resolveLegacyAlternativeCost(
  formData: FormData,
  realCost: { value: number; error?: string },
): { value: number; error?: string } {
  const raw = getText(formData, "alternativeCost");

  if (!raw) {
    if (realCost.error) {
      return { value: Number.NaN };
    }

    return { value: realCost.value };
  }

  return getMoney(formData, "alternativeCost");
}

function hasTrackerFirstMoneyFields(formData: FormData): boolean {
  return ["mode", "savingContext", "amountSpent", "comparisonAmount"].some(
    (name) => getText(formData, name) !== "",
  );
}

function resolveLegacyPresetMoney(formData: FormData): ResolvedPresetMoney {
  const errors: Record<string, string> = {};
  const realCost = getMoney(formData, "realCost");
  const alternativeCost = resolveLegacyAlternativeCost(formData, realCost);

  if (realCost.error) {
    errors.realCost = realCost.error;
  }

  if (alternativeCost.error) {
    errors.alternativeCost = alternativeCost.error;
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    errors,
    money: toEntryMoneyView({
      realCost: realCost.value,
      alternativeCost: alternativeCost.value,
      savedAmount: alternativeCost.value - realCost.value,
    }),
  };
}

function resolveTrackerFirstPresetMoney(formData: FormData): ResolvedPresetMoney {
  const errors: Record<string, string> = {};
  const rawMode = getText(formData, "mode");
  const rawSavingContext = getText(formData, "savingContext");
  const amountSpent = getOptionalMoney(formData, "amountSpent");
  const comparisonAmount = getOptionalMoney(formData, "comparisonAmount");

  if (amountSpent.error) {
    errors.amountSpent = amountSpent.error;
  }

  if (comparisonAmount.error) {
    errors.comparisonAmount = comparisonAmount.error;
  }

  const mode: EntryMode = rawMode === "avoided" ? "avoided" : "spent";

  if (rawMode && rawMode !== "spent" && rawMode !== "avoided") {
    errors.mode = "Seleziona una modalita valida";
  }

  let savingContext: EntrySavingContext =
    rawSavingContext === "comparison" ? "comparison" : "none";

  if (!rawSavingContext && mode === "spent" && comparisonAmount.provided) {
    savingContext = "comparison";
  }

  if (
    rawSavingContext &&
    rawSavingContext !== "none" &&
    rawSavingContext !== "comparison"
  ) {
    errors.savingContext = "Seleziona un contesto valido";
  }

  if (mode === "avoided") {
    savingContext = "comparison";

    if (!comparisonAmount.provided) {
      errors.comparisonAmount = "Questo campo è obbligatorio";
    } else if (comparisonAmount.value <= 0) {
      errors.comparisonAmount = "L'importo deve essere maggiore di 0";
    }
  } else {
    if (!amountSpent.provided) {
      errors.amountSpent = "Questo campo è obbligatorio";
    } else if (amountSpent.value <= 0) {
      errors.amountSpent = "L'importo deve essere maggiore di 0";
    }

    if (savingContext === "comparison" && !comparisonAmount.provided) {
      errors.comparisonAmount = "Questo campo è obbligatorio";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    errors,
    money: calculateEntryMoney({
      mode,
      savingContext,
      amountSpent: amountSpent.provided ? amountSpent.value : undefined,
      comparisonAmount: comparisonAmount.provided
        ? comparisonAmount.value
        : undefined,
    }),
  };
}

function resolvePresetMoney(formData: FormData): ResolvedPresetMoney {
  if (hasTrackerFirstMoneyFields(formData)) {
    return resolveTrackerFirstPresetMoney(formData);
  }

  return resolveLegacyPresetMoney(formData);
}

function buildPresetEntryFormData(params: {
  title: string;
  categoryId: string;
  money: EntryMoneyView;
  note: string | null;
  paidByUserId: string;
  beneficiaryUserIds: string[];
}): FormData {
  const formData = new FormData();
  formData.append("title", params.title);
  formData.append("categoryId", params.categoryId);
  formData.append("mode", params.money.mode);
  formData.append("savingContext", params.money.savingContext);
  formData.append("realCost", params.money.realCost.toFixed(2));
  formData.append("alternativeCost", params.money.alternativeCost.toFixed(2));
  formData.append("date", getRomeDateInputValue(new Date()));
  formData.append("paidByUserId", params.paidByUserId);

  if (params.money.mode === "spent") {
    formData.append("amountSpent", params.money.amountSpent.toFixed(2));
  }

  if (
    params.money.mode === "avoided" ||
    params.money.savingContext === "comparison"
  ) {
    formData.append("comparisonAmount", params.money.comparisonAmount.toFixed(2));
  }

  for (const beneficiaryUserId of params.beneficiaryUserIds) {
    formData.append("beneficiaryUserIds", beneficiaryUserId);
  }

  if (params.note) {
    formData.append("note", params.note);
  }

  return formData;
}

function resolvePresetOwnership(
  person: LegacyPersonValue,
  members: WorkspaceMemberOption[],
  currentUserId: string,
): {
  paidByUserId: string;
  beneficiaryUserIds: string[];
} {
  const defaultPaidByUserId = getDefaultPaidByUserId(members, currentUserId);
  const slots = getWorkspaceMemberSlots(members);

  if (person === "TUTTI") {
    const beneficiaryUserIds = members.map((member) => member.userId);

    return {
      paidByUserId: defaultPaidByUserId,
      beneficiaryUserIds:
        beneficiaryUserIds.length > 0
          ? beneficiaryUserIds
          : getDefaultBeneficiaryUserIds(members, defaultPaidByUserId),
    };
  }

  const targetUserId =
    person === "MARTINA"
      ? slots.secondaryUserId ?? slots.primaryUserId ?? defaultPaidByUserId
      : slots.primaryUserId ?? defaultPaidByUserId;

  return {
    paidByUserId: targetUserId,
    beneficiaryUserIds: targetUserId
      ? [targetUserId]
      : getDefaultBeneficiaryUserIds(members, targetUserId),
  };
}

function resolveDefaultPresetOwnership(
  members: WorkspaceMemberOption[],
  currentUserId: string,
): {
  paidByUserId: string;
  beneficiaryUserIds: string[];
} {
  const paidByUserId = getDefaultPaidByUserId(members, currentUserId);

  return {
    paidByUserId,
    beneficiaryUserIds: getDefaultBeneficiaryUserIds(members, paidByUserId),
  };
}

export async function createPreset(
  formData: FormData,
): Promise<PresetActionResult> {
  const errors: Record<string, string> = {};

  const title = getText(formData, "title");
  const categoryId = getText(formData, "categoryId");
  const note = getText(formData, "note");
  const money = resolvePresetMoney(formData);

  if (!title) {
    errors.title = "Il titolo è obbligatorio";
  }

  if (title && title.length < 2) {
    errors.title = "Il titolo deve avere almeno 2 caratteri";
  }

  if (!categoryId) {
    errors.categoryId = "Seleziona una categoria";
  }

  Object.assign(errors, money.errors);

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Controlla i campi evidenziati",
      errors,
    };
  }

  if (!money.money) {
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
        message: "Seleziona una categoria valida",
      };
    }

    await prisma.quickPreset.create({
      data: {
        workspaceId,
        title,
        categoryId: category.id,
        realCost: money.money.realCost.toFixed(2),
        alternativeCost: money.money.alternativeCost.toFixed(2),
        note: note || null,
      },
    });

    revalidatePresetPaths();

    return {
      success: true,
      message: "Preset salvato con successo",
    };
  } catch (error) {
    console.error("Failed to create preset:", error);
    return {
      success: false,
      message:
        "Non riesco a salvare il preset adesso. Controlla il database e riprova tra poco.",
    };
  }
}

function serializePreset(preset: {
  id: string;
  title: string;
  realCost: unknown;
  alternativeCost: unknown;
  note: string | null;
  person: LegacyPersonValue | null;
  createdAt: Date;
  category: {
    name: string;
  };
}): SerializablePreset {
  const money = toEntryMoneyView({
    realCost: preset.realCost,
    alternativeCost: preset.alternativeCost,
    savedAmount: toNumber(preset.alternativeCost) - toNumber(preset.realCost),
  });

  return {
    id: preset.id,
    title: preset.title,
    mode: money.mode,
    savingContext: money.savingContext,
    realCost: money.realCost.toFixed(2),
    alternativeCost: money.alternativeCost.toFixed(2),
    amountSpent: money.amountSpent.toFixed(2),
    comparisonAmount: money.comparisonAmount.toFixed(2),
    savingImpact: money.savingImpact.toFixed(2),
    note: preset.note,
    person: preset.person,
    createdAt: preset.createdAt.toISOString(),
    category: {
      name: preset.category.name,
    },
  };
}

export async function getPresets(): Promise<SerializablePreset[]> {
  try {
    const workspaceWhere = await getCurrentWorkspaceScopedWhere();

    const presets = await prisma.quickPreset.findMany({
      where: workspaceWhere,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        realCost: true,
        alternativeCost: true,
        note: true,
        person: true,
        createdAt: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    return presets.map(serializePreset);
  } catch (error) {
    console.error("Failed to load presets:", error);
    return [];
  }
}

export async function createEntryFromPreset(
  presetId: string,
  person?: PersonFilterValue,
): Promise<PresetActionResult> {
  const id = presetId.trim();

  if (!id) {
    return {
      success: false,
      message: "ID preset non valido",
    };
  }

  try {
    const preset = await prisma.quickPreset.findUnique({
      where: { id },
      select: {
        title: true,
        categoryId: true,
        realCost: true,
        alternativeCost: true,
        note: true,
        person: true,
        workspaceId: true,
      },
    });

    if (!preset) {
      return {
        success: false,
        message: "Preset non trovato",
      };
    }

    await requireWorkspaceAccessForRecord(preset, "Preset");

    const [currentUser, members] = await Promise.all([
      getCurrentUser(),
      getCurrentWorkspaceMembers(),
    ]);

    if (members.length === 0) {
      return {
        success: false,
        message: "Nessun membro disponibile nel workspace",
      };
    }

    const effectivePerson = preset.person ?? normalizeLegacyPerson(person);
    const ownership = effectivePerson
      ? resolvePresetOwnership(effectivePerson, members, currentUser.id)
      : resolveDefaultPresetOwnership(members, currentUser.id);

    const entryFormData = buildPresetEntryFormData({
      title: preset.title,
      categoryId: preset.categoryId,
      money: toEntryMoneyView({
        realCost: toNumber(preset.realCost),
        alternativeCost: toNumber(preset.alternativeCost),
        savedAmount: toNumber(preset.alternativeCost) - toNumber(preset.realCost),
      }),
      note: preset.note,
      paidByUserId: ownership.paidByUserId,
      beneficiaryUserIds: ownership.beneficiaryUserIds,
    });

    const result = await createEntry(entryFormData);

    if (!result.success) {
      return {
        success: false,
        message: result.message,
      };
    }

    revalidatePresetPaths();

    return {
      success: true,
      message: "Movimento creato dal preset",
      isFirstEntryOfDay: result.isFirstEntryOfDay,
      streakFrom: result.streakFrom,
      streakTo: result.streakTo,
    };
  } catch (error) {
    console.error("Failed to create entry from preset:", error);
    return {
      success: false,
      message:
        "Non riesco a creare il movimento dal preset adesso. Riprova tra poco.",
    };
  }
}

export async function deletePreset(id: string): Promise<PresetActionResult> {
  const presetId = id.trim();

  if (!presetId) {
    return {
      success: false,
      message: "ID preset non valido",
    };
  }

  try {
    const preset = await prisma.quickPreset.findUnique({
      where: { id: presetId },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (!preset) {
      return {
        success: false,
        message: "Preset non trovato",
      };
    }

    await requireWorkspaceAccessForRecord(preset, "Preset");

    await prisma.quickPreset.delete({
      where: { id: presetId },
    });

    revalidatePresetPaths();

    return {
      success: true,
      message: "Preset eliminato",
    };
  } catch (error) {
    console.error("Failed to delete preset:", error);
    return {
      success: false,
      message: "Si è verificato un errore durante l'eliminazione",
    };
  }
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

function getRomeDateInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}
