import { toEntryMoneyView } from "@/src/lib/entry-domain";
import { calculateEntryMetrics } from "@/src/lib/entry-metrics";


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
  "mode",
  "savingContext",
  "amountSpent",
  "comparisonAmount",
  "savingImpact",
  // Unified metric breakdown columns
  "spentReal",
  "wouldHaveSpentMetric",
  "avoidedAmount",
  "comparisonSaved",
  "comparisonOverspent",
  "grossPositiveImpact",
  "netImpact",
  "ordinaryImpact",
  "largeComparisonImpact",
  "isLargeComparison",
  // Sharing/audit columns
  "paidByUserId",
  "paidByName",
  "beneficiaryUserIds",
  "beneficiaryNames",
  "beneficiaryCount",
  "sharePerBeneficiary",
  "isShared",
] as const;

export type AiExpenseExportEntry = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  date: Date;
  title: string;
  note: string | null;
  source: string;
  realCost: unknown;
  alternativeCost: unknown;
  savedAmount: unknown;
  mode?: unknown;
  savingContext?: unknown;
  amountSpent?: unknown;
  comparisonAmount?: unknown;
  savingImpact?: unknown;
  // Sharing fields (present for new entries; absent for legacy entries)
  paidByUserId?: string | null;
  paidByUserName?: string | null;
  paidByUserEmail?: string | null;
  beneficiaries?: Array<{ userId: string; userName?: string | null; userEmail?: string | null }>;
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
  mode: string;
  savingContext: string;
  amountSpent: string;
  comparisonAmount: string;
  savingImpact: string;
  // Unified metric breakdown columns
  spentReal: string;
  wouldHaveSpentMetric: string;
  avoidedAmount: string;
  comparisonSaved: string;
  comparisonOverspent: string;
  grossPositiveImpact: string;
  netImpact: string;
  ordinaryImpact: string;
  largeComparisonImpact: string;
  isLargeComparison: boolean;
  // Sharing/audit columns
  paidByUserId: string;
  paidByName: string;
  beneficiaryUserIds: string;
  beneficiaryNames: string;
  beneficiaryCount: number;
  sharePerBeneficiary: string;
  isShared: boolean;
};

export type AiExpenseExportSummary = {
  totalEntries: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  totalSpentReally: number;
  totalWouldHaveSpent: number;
  totalSaved: number;        // legacy: from savedAmount column
  totalNetImpact: number;    // from unified metric module
  habitGeneratedEntries: number;
  categoriesByFrequency: Map<string, { count: number; spend: number }>;
  categoriesBySpend: Map<string, { count: number; spend: number }>;
};

export type AiExpenseExportRange = "current-month" | "all";

function round2(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;

  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatMoneyValue(value: number): string {
  return round2(value).toFixed(2);
}

function getLocalDateParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
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

function formatLocalDate(date: Date, timeZone: string): string {
  const parts = getLocalDateParts(date, timeZone);

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

function formatLocalWeekday(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
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
    totalNetImpact: 0,
    habitGeneratedEntries: 0,
    categoriesByFrequency: new Map(),
    categoriesBySpend: new Map(),
  };
}

export function buildAiExpenseExportRow(
  entry: AiExpenseExportEntry,
  workspaceName: string,
  timeZone: string,
  currency = "EUR",
): AiExpenseExportRow {
  const money = toEntryMoneyView(entry);
  const spentReally = round2(money.realCost);
  const wouldHaveSpent = round2(money.alternativeCost);
  const savedAmount = round2(money.savedAmount);
  const habitId = entry.habitOccurrence?.habitId ?? "";
  const habitName = entry.habitOccurrence?.habit?.name ?? "";
  const isHabitGenerated = Boolean(habitId);

  // Unified metric columns
  const entryMetrics = calculateEntryMetrics(entry);
  const perEntryLargeComparisonImpact = entryMetrics.isLargeComparison
    ? entryMetrics.netImpact
    : 0;
  const perEntryOrdinaryImpact = entryMetrics.isLargeComparison
    ? 0
    : entryMetrics.netImpact;

  // Sharing columns
  const beneficiariesArr = entry.beneficiaries ?? [];
  const paidByName =
    entry.paidByUserName ??
    entry.paidByUserEmail ??
    (entry.paidByUserId ?? "");
  const beneficiaryUserIds = entryMetrics.beneficiaryUserIds.join("|");
  const beneficiaryNames = beneficiariesArr
    .map((b) => b.userName ?? b.userEmail ?? b.userId)
    .join("|");
  const personLabel =
    beneficiariesArr.length > 1
      ? "Condiviso"
      : beneficiariesArr.length === 1
        ? (beneficiariesArr[0]!.userName ?? beneficiariesArr[0]!.userEmail ?? beneficiariesArr[0]!.userId)
        : (entry.paidByUserName ?? entry.paidByUserEmail ?? entry.paidByUserId ?? "");

  return {
    // Legacy columns (preserved for backward compatibility)
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    date: formatLocalDate(entry.date, timeZone),
    month: getLocalDateParts(entry.date, timeZone).month,
    year: getLocalDateParts(entry.date, timeZone).year,
    dayOfWeek: formatLocalWeekday(entry.date, timeZone),
    person: personLabel,
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
    currency,
    habitId,
    habitName,
    isHabitGenerated,
    location: "",
    paymentMethod: "",
    notes: entry.note ?? "",
    mode: money.mode,
    savingContext: money.savingContext,
    amountSpent: formatMoneyValue(money.amountSpent),
    comparisonAmount: formatMoneyValue(money.comparisonAmount),
    savingImpact: formatMoneyValue(money.savingImpact),
    // Unified metric breakdown columns
    spentReal: formatMoneyValue(entryMetrics.spentReal),
    wouldHaveSpentMetric: formatMoneyValue(entryMetrics.wouldHaveSpent),
    avoidedAmount: formatMoneyValue(entryMetrics.avoidedAmount),
    comparisonSaved: formatMoneyValue(entryMetrics.comparisonSaved),
    comparisonOverspent: formatMoneyValue(entryMetrics.comparisonOverspent),
    grossPositiveImpact: formatMoneyValue(entryMetrics.grossPositiveImpact),
    netImpact: formatMoneyValue(entryMetrics.netImpact),
    ordinaryImpact: formatMoneyValue(perEntryOrdinaryImpact),
    largeComparisonImpact: formatMoneyValue(perEntryLargeComparisonImpact),
    isLargeComparison: entryMetrics.isLargeComparison,
    // Sharing/audit columns
    paidByUserId: entryMetrics.paidByUserId ?? "",
    paidByName,
    beneficiaryUserIds,
    beneficiaryNames,
    beneficiaryCount: entryMetrics.beneficiaryCount,
    sharePerBeneficiary: formatMoneyValue(entryMetrics.sharePerBeneficiary),
    isShared: entryMetrics.isShared,
  };
}

export function isExportableAiExpenseExportEntry(
  entry: Partial<AiExpenseExportEntry> | null | undefined,
): entry is AiExpenseExportEntry {
  const id = typeof entry?.id === "string" ? entry.id.trim() : "";
  const date = entry?.date;

  return id.length > 0 && date instanceof Date && Number.isFinite(date.getTime());
}

export function buildAiExpenseExportRows(
  entries: ReadonlyArray<AiExpenseExportEntry>,
  workspaceName: string,
  timeZone: string,
  currency = "EUR",
): AiExpenseExportRow[] {
  return entries
    .filter(isExportableAiExpenseExportEntry)
    .map((entry) => buildAiExpenseExportRow(entry, workspaceName, timeZone, currency));
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
    row.mode,
    row.savingContext,
    row.amountSpent,
    row.comparisonAmount,
    row.savingImpact,
    // Unified metric breakdown
    row.spentReal,
    row.wouldHaveSpentMetric,
    row.avoidedAmount,
    row.comparisonSaved,
    row.comparisonOverspent,
    row.grossPositiveImpact,
    row.netImpact,
    row.ordinaryImpact,
    row.largeComparisonImpact,
    row.isLargeComparison,
    // Sharing/audit
    row.paidByUserId,
    row.paidByName,
    row.beneficiaryUserIds,
    row.beneficiaryNames,
    row.beneficiaryCount,
    row.sharePerBeneficiary,
    row.isShared,
  ]);
}

export function serializeAiExpenseExportEntries(
  entries: ReadonlyArray<AiExpenseExportEntry>,
  workspaceName: string,
  timeZone: string,
  currency = "EUR",
): string {
  return buildAiExpenseExportRows(entries, workspaceName, timeZone, currency)
    .map(serializeAiExpenseExportRow)
    .join("");
}

export function updateAiExpenseExportSummary(
  summary: AiExpenseExportSummary,
  row: AiExpenseExportRow,
): void {
  const spentReally = Number(row.spentReally) || 0;
  const wouldHaveSpent = Number(row.wouldHaveSpent) || 0;
  const savedAmount = Number(row.savedAmount) || 0;
  const netImpact = Number(row.netImpact) || 0;
  const categoryName = row.category;

  summary.totalEntries += 1;
  summary.totalSpentReally = round2(summary.totalSpentReally + spentReally);
  summary.totalWouldHaveSpent = round2(
    summary.totalWouldHaveSpent + wouldHaveSpent,
  );
  summary.totalSaved = round2(summary.totalSaved + savedAmount);
  summary.totalNetImpact = round2(summary.totalNetImpact + netImpact);
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
    csvLine(["totalNetImpact", formatMoneyValue(summary.totalNetImpact)]).trimEnd(),
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

export function getAiExpenseExportFilename(
  timeZone: string,
  date = new Date(),
  range: AiExpenseExportRange = "all",
): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  const scope = range === "current-month" ? "mese-corrente" : "tutti";

  return `nlc-expenses-${scope}-${year}-${month}-${day}.csv`;
}
