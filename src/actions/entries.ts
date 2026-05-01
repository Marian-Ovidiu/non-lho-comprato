"use server";

import { revalidatePath } from "next/cache";

import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { calculateSavedAmount } from "@/src/lib/entry-calculations";
import { prisma } from "@/src/lib/prisma";

type CreateEntryResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
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

export async function getEntries(): Promise<EntryWithCategory[]> {
  return prisma.entry.findMany({
    orderBy: {
      date: "desc",
    },
    include: {
      category: true,
    },
  });
}

export async function getDashboardSummary(): Promise<MonthlySummary> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const nextMonthStart = startOfNextMonth(now);

  const entries = await prisma.entry.findMany({
    where: {
      date: {
        gte: monthStart,
        lt: nextMonthStart,
      },
    },
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

  const savedAmount = calculateSavedAmount(
    realCost.value,
    alternativeCost.value,
  );

  try {
    let category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      category = await prisma.category.findUnique({
        where: { slug: categoryId },
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
          },
          create: {
            name: fallbackCategory.name,
            slug: fallbackCategory.slug,
            icon: fallbackCategory.icon,
            color: fallbackCategory.color,
          },
        });
      }
    }

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
        title,
        categoryId: category.id,
        realCost: toDecimalString(realCost.value),
        alternativeCost: toDecimalString(alternativeCost.value),
        savedAmount: toDecimalString(savedAmount),
        date,
        note: note || null,
        source: "manual",
      },
    });

    tryRevalidatePath("/");
    tryRevalidatePath("/entries");
    tryRevalidatePath("/stats");

    return {
      success: true,
      message: "Entrata salvata con successo",
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
      },
    });

    if (!entry) {
      return {
        success: false,
        message: "Movimento non trovato",
      };
    }

    if (entry.source === "habit") {
      return {
        success: false,
        message:
          "Questo movimento arriva da un'abitudine. Gestiscilo dalla pagina Abitudini.",
      };
    }

    await prisma.entry.delete({
      where: { id },
    });

    tryRevalidatePath("/");
    tryRevalidatePath("/entries");
    tryRevalidatePath("/stats");

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
