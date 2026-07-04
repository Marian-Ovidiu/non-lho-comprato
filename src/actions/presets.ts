"use server";

import { getActionTranslations } from "@/src/lib/i18n/server";
import { it } from "@/src/lib/i18n/it";
import type { Translations } from "@/src/lib/i18n";
import { toMoneyNumber as toNumber } from "@/src/lib/money-number";
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
import { logAndRethrowDataLoadError } from "@/src/lib/data-load-error";
import { decryptOptionalText, encryptOptionalText } from "@/src/lib/field-encryption";
import { prisma } from "@/src/lib/prisma";
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
  getCurrentWorkspaceTimezone,
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
  targetUserId: string | null;
  targetScope: string | null;
  targetUserLabel: string;
  createdAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
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


function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getMoney(
  formData: FormData,
  name: string,
  v: Translations["validation"] = it.validation,
): {
  value: number;
  error?: string;
} {
  const raw = getText(formData, name);

  if (!raw) {
    return { value: Number.NaN, error: v.required };
  }

  const normalized = raw.replace(",", ".");
  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    return { value: Number.NaN, error: v.invalidNumber };
  }

  if (value < 0) {
    return { value, error: "Il valore deve essere maggiore o uguale a 0" };
  }

  return { value };
}

function getOptionalMoney(
  formData: FormData,
  name: string,
  v: Translations["validation"] = it.validation,
): ParsedMoneyField {
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
      error: v.invalidNumber,
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
  v: Translations["validation"] = it.validation,
): { value: number; error?: string } {
  const raw = getText(formData, "alternativeCost");

  if (!raw) {
    if (realCost.error) {
      return { value: Number.NaN };
    }

    return { value: realCost.value };
  }

  return getMoney(formData, "alternativeCost", v);
}

function hasTrackerFirstMoneyFields(formData: FormData): boolean {
  return ["mode", "savingContext", "amountSpent", "comparisonAmount"].some(
    (name) => getText(formData, name) !== "",
  );
}

function resolveLegacyPresetMoney(
  formData: FormData,
  tr: Translations = it,
): ResolvedPresetMoney {
  const errors: Record<string, string> = {};
  const realCost = getMoney(formData, "realCost", tr.validation);
  const alternativeCost = resolveLegacyAlternativeCost(formData, realCost, tr.validation);

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

function resolveTrackerFirstPresetMoney(
  formData: FormData,
  tr: Translations = it,
): ResolvedPresetMoney {
  const errors: Record<string, string> = {};
  const rawMode = getText(formData, "mode");
  const rawSavingContext = getText(formData, "savingContext");
  const amountSpent = getOptionalMoney(formData, "amountSpent", tr.validation);
  const comparisonAmount = getOptionalMoney(formData, "comparisonAmount", tr.validation);

  if (amountSpent.error) {
    errors.amountSpent = amountSpent.error;
  }

  if (comparisonAmount.error) {
    errors.comparisonAmount = comparisonAmount.error;
  }

  const mode: EntryMode = rawMode === "avoided" ? "avoided" : "spent";

  if (rawMode && rawMode !== "spent" && rawMode !== "avoided") {
    errors.mode = tr.presetActions.selectValidMode;
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
    errors.savingContext = tr.presetActions.selectValidContext;
  }

  if (mode === "avoided") {
    savingContext = "comparison";

    if (!comparisonAmount.provided) {
      errors.comparisonAmount = tr.validation.required;
    } else if (comparisonAmount.value <= 0) {
      errors.comparisonAmount = "L'importo deve essere maggiore di 0";
    }
  } else {
    if (!amountSpent.provided) {
      errors.amountSpent = tr.validation.required;
    } else if (amountSpent.value <= 0) {
      errors.amountSpent = "L'importo deve essere maggiore di 0";
    }

    if (savingContext === "comparison" && !comparisonAmount.provided) {
      errors.comparisonAmount = tr.validation.required;
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

function resolvePresetMoney(
  formData: FormData,
  tr: Translations = it,
): ResolvedPresetMoney {
  if (hasTrackerFirstMoneyFields(formData)) {
    return resolveTrackerFirstPresetMoney(formData, tr);
  }

  return resolveLegacyPresetMoney(formData, tr);
}

function buildPresetEntryFormData(params: {
  title: string;
  categoryId: string;
  money: EntryMoneyView;
  note: string | null;
  paidByUserId: string;
  beneficiaryUserIds: string[];
  timeZone: string;
}): FormData {
  const formData = new FormData();
  formData.append("title", params.title);
  formData.append("categoryId", params.categoryId);
  formData.append("mode", params.money.mode);
  formData.append("savingContext", params.money.savingContext);
  formData.append("realCost", params.money.realCost.toFixed(2));
  formData.append("alternativeCost", params.money.alternativeCost.toFixed(2));
  formData.append("date", getDateInputValue(new Date(), params.timeZone));
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
  targetUserId: string | null,
  targetScope: string | null,
  members: WorkspaceMemberOption[],
  currentUserId: string,
): {
  paidByUserId: string;
  beneficiaryUserIds: string[];
} {
  const defaultPaidByUserId = getDefaultPaidByUserId(members, currentUserId);

  if (targetScope === "shared") {
    const beneficiaryUserIds = members.map((member) => member.userId);
    return {
      paidByUserId: defaultPaidByUserId,
      beneficiaryUserIds:
        beneficiaryUserIds.length > 0
          ? beneficiaryUserIds
          : getDefaultBeneficiaryUserIds(members, defaultPaidByUserId),
    };
  }

  const resolvedUserId = targetUserId ?? defaultPaidByUserId;

  return {
    paidByUserId: resolvedUserId,
    beneficiaryUserIds: resolvedUserId
      ? [resolvedUserId]
      : getDefaultBeneficiaryUserIds(members, resolvedUserId),
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
  const t = await getActionTranslations();
  const errors: Record<string, string> = {};

  const title = getText(formData, "title");
  const categoryId = getText(formData, "categoryId");
  const note = getText(formData, "note");
  const money = resolvePresetMoney(formData, t);

  if (!title) {
    errors.title = t.validation.titleRequired;
  }

  if (title && title.length < 2) {
    errors.title = "Il titolo deve avere almeno 2 caratteri";
  }

  if (!categoryId) {
    errors.categoryId = t.validation.selectCategory;
  }

  Object.assign(errors, money.errors);

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: t.validation.checkFields,
      errors,
    };
  }

  if (!money.money) {
    return {
      success: false,
      message: t.validation.checkFields,
      errors,
    };
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();
    const category = await resolveCategory(categoryId, workspaceId);

    if (!category) {
      return {
        success: false,
        message: t.validation.selectValidCategory,
      };
    }

    await prisma.quickPreset.create({
      data: {
        workspaceId,
        title,
        categoryId: category.id,
        realCost: money.money.realCost.toFixed(2),
        alternativeCost: money.money.alternativeCost.toFixed(2),
        note: encryptOptionalText(note),
      },
    });

    revalidatePresetPaths();

    return {
      success: true,
      message: t.presetActions.saved,
    };
  } catch (error) {
    console.error("Failed to create preset:", error);
    return {
      success: false,
      message:
        t.presetActions.saveFailed,
    };
  }
}

export async function updatePreset(
  id: string,
  formData: FormData,
): Promise<PresetActionResult> {
  const t = await getActionTranslations();
  const presetId = id.trim();
  const errors: Record<string, string> = {};

  if (!presetId) {
    return {
      success: false,
      message: t.presetActions.invalidId,
    };
  }

  const title = getText(formData, "title");
  const categoryId = getText(formData, "categoryId");
  const note = getText(formData, "note");
  const money = resolvePresetMoney(formData, t);

  if (!title) {
    errors.title = t.validation.titleRequired;
  }

  if (title && title.length < 2) {
    errors.title = "Il titolo deve avere almeno 2 caratteri";
  }

  if (!categoryId) {
    errors.categoryId = t.validation.selectCategory;
  }

  Object.assign(errors, money.errors);

  if (Object.keys(errors).length > 0 || !money.money) {
    return {
      success: false,
      message: t.validation.checkFields,
      errors,
    };
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();
    const preset = await prisma.quickPreset.findUnique({
      where: { id: presetId, workspaceId },
      select: {
        id: true,
      },
    });

    if (!preset) {
      return {
        success: false,
        message: t.presetActions.notFound,
      };
    }

    const category = await resolveCategory(categoryId, workspaceId);

    if (!category) {
      return {
        success: false,
        message: t.validation.selectValidCategory,
      };
    }

    await prisma.quickPreset.update({
      where: { id: presetId, workspaceId },
      data: {
        title,
        categoryId: category.id,
        realCost: money.money.realCost.toFixed(2),
        alternativeCost: money.money.alternativeCost.toFixed(2),
        note: encryptOptionalText(note),
      },
    });

    revalidatePresetPaths();

    return {
      success: true,
      message: t.presetActions.updated,
    };
  } catch (error) {
    console.error("Failed to update preset:", error);
    return {
      success: false,
      message:
        t.presetActions.updateFailed,
    };
  }
}

function resolveTargetUserLabel(
  targetUserId: string | null,
  targetScope: string | null,
  members: WorkspaceMemberOption[],
): string {
  if (targetScope === "shared") return "Condiviso";
  if (!targetUserId) return "Automatico";
  const member = members.find((m) => m.userId === targetUserId);
  return member?.label ?? "Automatico";
}

function serializePreset(
  preset: {
    id: string;
    title: string;
    realCost: unknown;
    alternativeCost: unknown;
    note: string | null;
    targetUserId: string | null;
    targetScope: string | null;
    createdAt: Date;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  },
  members: WorkspaceMemberOption[],
): SerializablePreset {
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
    note: decryptOptionalText(preset.note),
    targetUserId: preset.targetUserId,
    targetScope: preset.targetScope,
    targetUserLabel: resolveTargetUserLabel(preset.targetUserId, preset.targetScope, members),
    createdAt: preset.createdAt.toISOString(),
    category: {
      id: preset.category.id,
      name: preset.category.name,
      slug: preset.category.slug,
    },
  };
}

export async function getPresets(): Promise<SerializablePreset[]> {
  try {
    const [workspaceWhere, members] = await Promise.all([
      getCurrentWorkspaceScopedWhere(),
      getCurrentWorkspaceMembers(),
    ]);

    const presets = await prisma.quickPreset.findMany({
      where: workspaceWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        realCost: true,
        alternativeCost: true,
        note: true,
        targetUserId: true,
        targetScope: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return presets.map((preset) => serializePreset(preset, members));
  } catch (error) {
    logAndRethrowDataLoadError("Failed to load presets", error);
  }
}

export async function createEntryFromPreset(
  presetId: string,
): Promise<PresetActionResult> {
  const t = await getActionTranslations();
  const id = presetId.trim();

  if (!id) {
    return {
      success: false,
      message: t.presetActions.invalidId,
    };
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();
    const preset = await prisma.quickPreset.findUnique({
      where: { id, workspaceId },
      select: {
        title: true,
        categoryId: true,
        realCost: true,
        alternativeCost: true,
        note: true,
        targetUserId: true,
        targetScope: true,
      },
    });

    if (!preset) {
      return {
        success: false,
        message: t.presetActions.notFound,
      };
    }

    const [currentUser, members, timeZone] = await Promise.all([
      getCurrentUser(),
      getCurrentWorkspaceMembers(),
      getCurrentWorkspaceTimezone(),
    ]);

    if (members.length === 0) {
      return {
        success: false,
        message: "Nessun membro disponibile nel workspace",
      };
    }

    const hasExplicitTarget = preset.targetUserId !== null || preset.targetScope !== null;
    const ownership = hasExplicitTarget
      ? resolvePresetOwnership(preset.targetUserId, preset.targetScope, members, currentUser.id)
      : resolveDefaultPresetOwnership(members, currentUser.id);

    const entryFormData = buildPresetEntryFormData({
      title: preset.title,
      categoryId: preset.categoryId,
      money: toEntryMoneyView({
        realCost: toNumber(preset.realCost),
        alternativeCost: toNumber(preset.alternativeCost),
        savedAmount: toNumber(preset.alternativeCost) - toNumber(preset.realCost),
      }),
      note: decryptOptionalText(preset.note),
      paidByUserId: ownership.paidByUserId,
      beneficiaryUserIds: ownership.beneficiaryUserIds,
      timeZone,
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
      message: t.presetActions.entryCreated,
      isFirstEntryOfDay: result.isFirstEntryOfDay,
      streakFrom: result.streakFrom,
      streakTo: result.streakTo,
    };
  } catch (error) {
    console.error("Failed to create entry from preset:", error);
    return {
      success: false,
      message:
        t.presetActions.entryCreateFailed,
    };
  }
}

export async function deletePreset(id: string): Promise<PresetActionResult> {
  const t = await getActionTranslations();
  const presetId = id.trim();

  if (!presetId) {
    return {
      success: false,
      message: t.presetActions.invalidId,
    };
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();
    const preset = await prisma.quickPreset.findUnique({
      where: { id: presetId, workspaceId },
      select: {
        id: true,
      },
    });

    if (!preset) {
      return {
        success: false,
        message: t.presetActions.notFound,
      };
    }

    await prisma.quickPreset.delete({
      where: { id: presetId, workspaceId },
    });

    revalidatePresetPaths();

    return {
      success: true,
      message: t.presetActions.deleted,
    };
  } catch (error) {
    console.error("Failed to delete preset:", error);
    return {
      success: false,
      message: t.validation.deleteError,
    };
  }
}

function getDateInputValue(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}
