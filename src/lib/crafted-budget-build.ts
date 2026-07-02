import { getDashboardSummary } from "@/src/actions/entries";
import { getWorkspaceBudgetsAction } from "@/src/actions/budgets";
import { toEntryMoneyView } from "@/src/lib/entry-domain";
import { prisma } from "@/src/lib/prisma";
import {
  getCurrentWorkspaceId,
  getCurrentWorkspaceTimezone,
} from "@/src/lib/workspace-context";
import {
  getDateParts,
  getMonthRangeForMonthKey,
  normalizeMonthKey,
} from "@/src/lib/workspace-dates";

export type CraftedBudgetTone = "success" | "accent" | "destructive";

export type CraftedBudgetCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  budget: number;
  spent: number;
  avoided: number;
  rollover: number;
  txCount: number;
};

export type CraftedBudgetMonthOption = {
  month: string;
  label: string;
};

export type CraftedBudgetProps = {
  monthKey: string;
  monthLabel: string;
  yearLabel: string;
  monthCode: string;
  monthOptions: CraftedBudgetMonthOption[];
  income: number;
  totalBudget: number;
  spent: number;
  avoided: number;
  daysInMonth: number;
  dayOfMonth: number;
  categories: CraftedBudgetCategory[];
};

type EntryForBudget = {
  categoryId: string;
  realCost: unknown;
  alternativeCost: unknown;
  savedAmount: unknown;
  mode: unknown;
  savingContext: unknown;
};

const MONTH_INCOME = 2400;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

function getMonthDate(monthKey: string) {
  const [yearPart, monthPart] = monthKey.split("-");
  return new Date(Date.UTC(Number(yearPart), Number(monthPart) - 1, 1));
}

function getDaysInMonth(monthKey: string) {
  const [yearPart, monthPart] = monthKey.split("-");
  return new Date(Date.UTC(Number(yearPart), Number(monthPart), 0)).getUTCDate();
}

function getDayOfMonth(monthKey: string, timeZone: string) {
  const monthDate = getMonthDate(monthKey);
  const daysInMonth = getDaysInMonth(monthKey);
  const nowParts = getDateParts(new Date(), timeZone);
  const selectedYear = monthDate.getUTCFullYear();
  const selectedMonth = monthDate.getUTCMonth() + 1;

  if (nowParts.year === selectedYear && nowParts.month === selectedMonth) {
    return Math.min(Math.max(nowParts.day, 1), daysInMonth);
  }

  const selectedTime = Date.UTC(selectedYear, selectedMonth - 1, 1);
  const currentTime = Date.UTC(nowParts.year, nowParts.month - 1, 1);

  return selectedTime < currentTime ? daysInMonth : 1;
}

function formatMonthLabel(date: Date, timeZone: string) {
  const month = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    timeZone,
  }).format(date);

  return month.charAt(0).toUpperCase() + month.slice(1);
}

function formatYearLabel(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("it-IT", {
    year: "numeric",
    timeZone,
  }).format(date);
}

function formatMonthCode(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("it-IT", {
    month: "2-digit",
    year: "2-digit",
    timeZone,
  }).format(date);
}

function buildMonthOptions(selectedMonthKey: string): CraftedBudgetMonthOption[] {
  const selected = getMonthDate(selectedMonthKey);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(
      Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth() + 1 - index, 1),
    );
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

    return {
      month,
      label: `${formatMonthLabel(date, "Europe/Rome")} ${date.getUTCFullYear()}`,
    };
  });
}

function getRollover(categoryId: string, index: number) {
  const seed = categoryId
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
  const amount = ((seed + index * 17) % 41) - 20;

  return Math.abs(amount) < 7 ? 0 : amount;
}

function sortCategories(
  categories: CraftedBudgetCategory[],
): CraftedBudgetCategory[] {
  return [...categories].sort((left, right) => {
    const leftOver = left.spent > left.budget ? 1 : 0;
    const rightOver = right.spent > right.budget ? 1 : 0;

    if (leftOver !== rightOver) {
      return rightOver - leftOver;
    }

    const leftPct = left.budget > 0 ? left.spent / left.budget : left.spent;
    const rightPct = right.budget > 0 ? right.spent / right.budget : right.spent;

    return rightPct - leftPct || left.name.localeCompare(right.name, "it");
  });
}

export async function buildCraftedBudgetProps(
  monthKeyInput?: string,
): Promise<CraftedBudgetProps> {
  const [workspaceId, timeZone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceTimezone(),
  ]);
  const monthKey = normalizeMonthKey(timeZone, monthKeyInput);
  const { start, end } = getMonthRangeForMonthKey(monthKey, timeZone);

  const [budgetData, monthSummary, entries] = await Promise.all([
    getWorkspaceBudgetsAction(),
    getDashboardSummary(monthKey),
    prisma.entry.findMany({
      where: {
        workspaceId,
        date: {
          gte: start,
          lt: end,
        },
      },
      select: {
        categoryId: true,
        realCost: true,
        alternativeCost: true,
        savedAmount: true,
        mode: true,
        savingContext: true,
      },
    }),
  ]);

  const monthlyBudgets = budgetData.budgets.filter(
    (budget) => budget.period === "monthly",
  );
  const workspaceBudget = monthlyBudgets.find(
    (budget) => budget.scope === "workspace",
  );
  const categoryBudgets = monthlyBudgets.filter(
    (budget) => budget.scope === "category" && budget.categoryId,
  );

  const categoryMap = new Map<string, CraftedBudgetCategory>();
  const ensureCategory = (
    category: {
      id: string;
      name: string;
      slug: string;
      icon: string | null;
    },
    index = categoryMap.size,
  ) => {
    const existing = categoryMap.get(category.id);
    if (existing) {
      return existing;
    }

    const created: CraftedBudgetCategory = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      budget: 0,
      spent: 0,
      avoided: 0,
      rollover: getRollover(category.id, index),
      txCount: 0,
    };
    categoryMap.set(category.id, created);

    return created;
  };

  budgetData.categories
    .filter((category) => !category.archivedAt)
    .forEach((category, index) => ensureCategory(category, index));

  categoryBudgets.forEach((budget) => {
    if (!budget.category) {
      return;
    }

    ensureCategory(budget.category).budget = round2(toNumber(budget.budgetAmount));
  });

  const categoryLookup = new Map(
    budgetData.categories.map((category) => [category.id, category]),
  );

  for (const entry of entries as EntryForBudget[]) {
    const category = categoryLookup.get(entry.categoryId);
    if (!category) {
      continue;
    }

    const row = ensureCategory(category);
    const money = toEntryMoneyView(entry);

    row.txCount += 1;

    if (money.mode === "avoided") {
      row.avoided = round2(row.avoided + money.savedAmount);
    } else {
      row.spent = round2(row.spent + money.amountSpent);
    }
  }

  const categories = sortCategories(
    [...categoryMap.values()].filter(
      (category) =>
        category.budget > 0 ||
        category.spent > 0 ||
        category.avoided > 0 ||
        category.txCount > 0,
    ),
  );
  const categoryBudgetTotal = categories.reduce(
    (total, category) => total + category.budget,
    0,
  );
  const totalBudget = round2(
    workspaceBudget?.budgetAmount ?? categoryBudgetTotal,
  );
  const monthDate = getMonthDate(monthKey);

  return {
    monthKey,
    monthLabel: formatMonthLabel(monthDate, timeZone),
    yearLabel: formatYearLabel(monthDate, timeZone),
    monthCode: formatMonthCode(monthDate, timeZone),
    monthOptions: buildMonthOptions(monthKey),
    income: MONTH_INCOME,
    totalBudget,
    spent: round2(monthSummary.ordinarySpent ?? monthSummary.totalRealSpent),
    avoided: round2(monthSummary.avoidedAmount),
    daysInMonth: getDaysInMonth(monthKey),
    dayOfMonth: getDayOfMonth(monthKey, timeZone),
    categories,
  };
}
