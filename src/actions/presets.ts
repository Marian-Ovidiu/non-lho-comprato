"use server";

import { revalidatePath } from "next/cache";

import { createEntry } from "@/src/actions/entries";
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { prisma } from "@/src/lib/prisma";
import type { PersonFilterValue } from "@/src/lib/person-filter";
import {
  normalizeLegacyPerson,
  type LegacyPersonValue,
} from "@/src/lib/ui-person";
import {
  getCurrentWorkspaceId,
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
  realCost: string;
  alternativeCost: string;
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

function getOptionalPerson(formData: FormData): {
  value: LegacyPersonValue | null;
  error?: string;
} {
  const raw = getText(formData, "person");

  if (!raw) {
    return { value: null };
  }

  const normalized = normalizeLegacyPerson(raw);
  if (normalized) {
    return { value: normalized };
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

function buildPresetEntryFormData(params: {
  title: string;
  categoryId: string;
  realCost: number;
  alternativeCost: number;
  note: string | null;
  person: LegacyPersonValue;
}): FormData {
  const formData = new FormData();
  formData.append("title", params.title);
  formData.append("categoryId", params.categoryId);
  formData.append("realCost", params.realCost.toFixed(2));
  formData.append("alternativeCost", params.alternativeCost.toFixed(2));
  formData.append("date", getRomeDateInputValue(new Date()));

  if (params.note) {
    formData.append("note", params.note);
  }

  formData.append("person", params.person);

  return formData;
}

export async function createPreset(
  formData: FormData,
): Promise<PresetActionResult> {
  const errors: Record<string, string> = {};

  const title = getText(formData, "title");
  const categoryId = getText(formData, "categoryId");
  const note = getText(formData, "note");
  const realCost = getMoney(formData, "realCost");
  const alternativeCost = getMoney(formData, "alternativeCost");
  const person = getOptionalPerson(formData);

  if (!title) {
    errors.title = "Il titolo è obbligatorio";
  }

  if (title && title.length < 2) {
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
        realCost: realCost.value.toFixed(2),
        alternativeCost: alternativeCost.value.toFixed(2),
        note: note || null,
        person: person.value,
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
  return {
    id: preset.id,
    title: preset.title,
    realCost: toNumber(preset.realCost).toFixed(2),
    alternativeCost: toNumber(preset.alternativeCost).toFixed(2),
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

    const effectivePerson = preset.person ?? normalizeLegacyPerson(person);

    if (!effectivePerson) {
      return {
        success: false,
        message: "Seleziona una persona per usare questo preset",
      };
    }

    const entryFormData = buildPresetEntryFormData({
      title: preset.title,
      categoryId: preset.categoryId,
      realCost: toNumber(preset.realCost),
      alternativeCost: toNumber(preset.alternativeCost),
      note: preset.note,
      person: effectivePerson,
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
      message: "Entrata creata dal preset",
      isFirstEntryOfDay: result.isFirstEntryOfDay,
      streakFrom: result.streakFrom,
      streakTo: result.streakTo,
    };
  } catch (error) {
    console.error("Failed to create entry from preset:", error);
    return {
      success: false,
      message:
        "Non riesco a creare l'entrata dal preset adesso. Riprova tra poco.",
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
