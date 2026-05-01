"use server";

import { prisma } from "@/lib/prisma";

type EntryState = {
  id: string;
  title: string;
};

function getText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getAmount(formData: FormData, name: string) {
  const raw = getText(formData, name);
  const value = Number(raw);

  if (!raw || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new Error(`Invalid ${name}`);
  }

  return value;
}

function toDecimalString(value: number) {
  return value.toFixed(2);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createEntry(
  _previousState: EntryState | null,
  formData: FormData,
): Promise<EntryState> {
  const title = getText(formData, "title");
  const category = getText(formData, "category");
  const realCost = getAmount(formData, "realCost");
  const alternativeCost = getAmount(formData, "alternativeCost");
  const dateValue = getText(formData, "date");
  const note = getText(formData, "note");

  if (!title) {
    throw new Error("Title is required");
  }

  if (!category) {
    throw new Error("Category is required");
  }

  if (realCost < 0 || alternativeCost < 0) {
    throw new Error("Costs must be greater than or equal to 0");
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }

  const savedAmount = alternativeCost - realCost;
  const categorySlug = slugify(category) || "altro";
  const categoryRecord = await prisma.category.upsert({
    where: { slug: categorySlug },
    update: {
      name: category,
    },
    create: {
      name: category,
      slug: categorySlug,
    },
  });

  return prisma.entry.create({
    data: {
      title,
      categoryId: categoryRecord.id,
      realCost: toDecimalString(realCost),
      alternativeCost: toDecimalString(alternativeCost),
      savedAmount: toDecimalString(savedAmount),
      date,
      note: note || null,
    },
  });
}
