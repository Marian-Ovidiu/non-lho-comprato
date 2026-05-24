import { getEntryOwnershipLabel } from "@/src/lib/person-labels";

const ROME_TIME_ZONE = "Europe/Rome";

export const AI_EXPENSE_EXPORT_COLUMNS = [
  "id",
  "createdAt",
  "updatedAt",
  "date",
  "month",
  "year",
  "dayOfWeek",
  "person",
  "workspace",
  "title",
  "description",
  "category",
  "subcategory",
  "tags",
  "type",
  "spentReally",
  "wouldHaveSpent",
  "savedAmount",
  "currency",
  "habitId",
  "habitName",
  "isHabitGenerated",
  "location",
  "paymentMethod",
  "notes",
] as const;

export type AiExpenseExportEntry = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  date: Date;
  title: string;
  note: string | null;
  source: string;
  person: string;
  realCost: unknown;
  alternativeCost: unknown;
  category: {
    name: string;
  };
  habitOccurrence: {
    habitId: string;
    habit: {
      name: string;
    } | null;
  } | null;
};

export type AiExpenseExportRow = {
  id: string;
  createdAt: string;
  updatedAt: string;
  date: string;
  month: number;
  year: number;
  dayOfWeek: string;
  person: string;
  workspace: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string;
  type: string;
  spentReally: string;
  wouldHaveSpent: string;
  savedAmount: string;
  currency: string;
  habitId: string;
  habitName: string;
  isHabitGenerated: boolean;
  location: string;
  paymentMethod: string;
  notes: string;
};

export type AiExpenseExportSummary = {
  totalEntries: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  totalSpentReally: number;
  totalWouldHaveSpent: number;
  totalSaved: number;
  habitGeneratedEntries: number;
  categoriesByFrequency: Map<string, { count: number; spend: number }>;
  categoriesBySpend: Map<string, { count: number; spend: number }>;
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

function round2(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;

  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatMoneyValue(value: number): string {
  return round2(value).toFixed(2);
}

function getRomeDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

function formatRomeDate(date: Date): string {
  const parts = getRomeDateParts(date);

  if (
    !Number.isFinite(parts.year) ||
    !Number.isFinite(parts.month) ||
    !Number.isFinite(parts.day)
  ) {
    return "";
  }

  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(
    2,
    "0",
  )}-${String(parts.day).padStart(2, "0")}`;
}

function formatRomeWeekday(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ROME_TIME_ZONE,
    weekday: "long",
  }).format(date);
}

function escapeCsvValue(value: string): string {
  if (
    /[",\r\n]/.test(value) ||
    value.startsWith(" ") ||
    value.endsWith(" ")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function csvLine(values: Array<string | number | boolean>): string {
  return `${values.map((value) => escapeCsvValue(String(value))).join(",")}\n`;
}

export function createAiExpenseExportSummary(): AiExpenseExportSummary {
  return {
    totalEntries: 0,
    dateRangeStart: "",
    dateRangeEnd: "",
    totalSpentReally: 0,
    totalWouldHaveSpent: 0,
    totalSaved: 0,
    habitGeneratedEntries: 0,
    categoriesByFrequency: new Map(),
    categoriesBySpend: new Map(),
  };
}

export function buildAiExpenseExportRow(
  entry: AiExpenseExportEntry,
  workspaceName: string,
): AiExpenseExportRow {
  const spentReally = round2(toNumber(entry.realCost));
  const wouldHaveSpent = round2(toNumber(entry.alternativeCost));
  const savedAmount = round2(wouldHaveSpent - spentReally);
  const habitId = entry.habitOccurrence?.habitId ?? "";
  const habitName = entry.habitOccurrence?.habit?.name ?? "";
  const isHabitGenerated = Boolean(habitId);

  return {
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    date: formatRomeDate(entry.date),
    month: getRomeDateParts(entry.date).month,
    year: getRomeDateParts(entry.date).year,
    dayOfWeek: formatRomeWeekday(entry.date),
    person: getEntryOwnershipLabel(entry.person),
    workspace: workspaceName,
    title: entry.title,
    description: "",
    category: entry.category.name,
    subcategory: "",
    tags: "",
    type: entry.source,
    spentReally: formatMoneyValue(spentReally),
    wouldHaveSpent: formatMoneyValue(wouldHaveSpent),
    savedAmount: formatMoneyValue(savedAmount),
    currency: "EUR",
    habitId,
    habitName,
    isHabitGenerated,
    location: "",
    paymentMethod: "",
    notes: entry.note ?? "",
  };
}

export function serializeAiExpenseExportRow(row: AiExpenseExportRow): string {
  return csvLine([
    row.id,
    row.createdAt,
    row.updatedAt,
    row.date,
    row.month,
    row.year,
    row.dayOfWeek,
    row.person,
    row.workspace,
    row.title,
    row.description,
    row.category,
    row.subcategory,
    row.tags,
    row.type,
    row.spentReally,
    row.wouldHaveSpent,
    row.savedAmount,
    row.currency,
    row.habitId,
    row.habitName,
    row.isHabitGenerated,
    row.location,
    row.paymentMethod,
    row.notes,
  ]);
}

export function updateAiExpenseExportSummary(
  summary: AiExpenseExportSummary,
  row: AiExpenseExportRow,
): void {
  const spentReally = Number(row.spentReally) || 0;
  const wouldHaveSpent = Number(row.wouldHaveSpent) || 0;
  const savedAmount = Number(row.savedAmount) || 0;
  const categoryName = row.category;

  summary.totalEntries += 1;
  summary.totalSpentReally = round2(summary.totalSpentReally + spentReally);
  summary.totalWouldHaveSpent = round2(
    summary.totalWouldHaveSpent + wouldHaveSpent,
  );
  summary.totalSaved = round2(summary.totalSaved + savedAmount);
  summary.habitGeneratedEntries += row.isHabitGenerated ? 1 : 0;

  if (!summary.dateRangeStart) {
    summary.dateRangeStart = row.date;
  }

  summary.dateRangeEnd = row.date;

  const frequency = summary.categoriesByFrequency.get(categoryName) ?? {
    count: 0,
    spend: 0,
  };

  frequency.count += 1;
  frequency.spend = round2(frequency.spend + spentReally);
  summary.categoriesByFrequency.set(categoryName, frequency);

  const spend = summary.categoriesBySpend.get(categoryName) ?? {
    count: 0,
    spend: 0,
  };

  spend.count += 1;
  spend.spend = round2(spend.spend + spentReally);
  summary.categoriesBySpend.set(categoryName, spend);
}

function buildTopCategoriesJson(
  categories: Map<string, { count: number; spend: number }>,
  sortBy: "count" | "spend",
): string {
  return JSON.stringify(
    [...categories.entries()]
      .sort((left, right) => {
        const leftValue = sortBy === "count" ? left[1].count : left[1].spend;
        const rightValue = sortBy === "count" ? right[1].count : right[1].spend;

        return rightValue - leftValue || left[0].localeCompare(right[0], "it");
      })
      .slice(0, 10)
      .map(([category, value]) => ({
        category,
        count: value.count,
        spend: round2(value.spend),
      })),
  );
}

export function buildAiExpenseExportSummaryBlock(
  summary: AiExpenseExportSummary,
): string {
  const habitGeneratedPercentage =
    summary.totalEntries > 0
      ? formatMoneyValue(
          round2((summary.habitGeneratedEntries / summary.totalEntries) * 100),
        )
      : "0.00";

  return [
    "",
    "# SUMMARY",
    csvLine(["metric", "value"]).trimEnd(),
    csvLine(["totalEntries", summary.totalEntries]).trimEnd(),
    csvLine(["dateRangeStart", summary.dateRangeStart]).trimEnd(),
    csvLine(["dateRangeEnd", summary.dateRangeEnd]).trimEnd(),
    csvLine(["totalSpentReally", formatMoneyValue(summary.totalSpentReally)]).trimEnd(),
    csvLine([
      "totalWouldHaveSpent",
      formatMoneyValue(summary.totalWouldHaveSpent),
    ]).trimEnd(),
    csvLine(["totalSaved", formatMoneyValue(summary.totalSaved)]).trimEnd(),
    csvLine([
      "topCategoriesByFrequency",
      buildTopCategoriesJson(summary.categoriesByFrequency, "count"),
    ]).trimEnd(),
    csvLine([
      "topCategoriesBySpend",
      buildTopCategoriesJson(summary.categoriesBySpend, "spend"),
    ]).trimEnd(),
    csvLine(["habitGeneratedPercentage", habitGeneratedPercentage]).trimEnd(),
    "",
  ].join("\n");
}

export function getAiExpenseExportFilename(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `nlc-expenses-${year}-${month}-${day}.csv`;
}
