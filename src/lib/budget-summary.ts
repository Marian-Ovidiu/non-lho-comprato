import { round2 } from "@/src/lib/money-number";
import { aggregateBudgetSpend, calculateBudgetProgress } from "@/src/lib/budget-domain";
import { getBudgetPeriodRange } from "@/src/lib/budget-period";
import type { BudgetPeriod, BudgetScope } from "@/src/lib/budget-model";
import type { BudgetStatus } from "@/src/lib/budget-domain";

export type BudgetCategoryOption = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  archivedAt: Date | null;
};

export type BudgetSummarySource = {
  id: string;
  workspaceId: string;
  scope: BudgetScope;
  scopeKey: string;
  categoryId: string | null;
  category: BudgetCategoryOption | null;
  period: BudgetPeriod;
  amount: unknown;
  currency: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BudgetSummaryEntry = {
  categoryId: string;
  realCost: unknown;
  alternativeCost: unknown;
  savedAmount: unknown;
  mode?: unknown;
  date: Date;
};

// "amount" (Prisma Decimal) stays out of the view: it is not serializable
// across the RSC boundary; clients read the numeric budgetAmount instead.
export type BudgetSummaryView = Omit<BudgetSummarySource, "amount"> & {
  budgetAmount: number;
  periodStart: Date;
  periodEnd: Date;
  spentAmount: number;
  remainingAmount: number;
  spentPercentage: number;
  timeProgressPercentage: number;
  dailyRemainingAmount: number;
  projectedSpendAtPeriodEnd: number;
  wouldHaveSpentAmount: number;
  status: BudgetStatus;
  message: string;
  title: string;
  subtitle: string;
  scopeLabel: string;
  periodLabel: string;
};

export type BudgetDashboardSelection = {
  mainBudget: BudgetSummaryView | null;
  categoryBudgets: BudgetSummaryView[];
  hasAnyBudget: boolean;
};

function isInRange(date: Date, start: Date, end: Date): boolean {
  return date.getTime() >= start.getTime() && date.getTime() < end.getTime();
}

function getPeriodLabel(period: BudgetPeriod): string {
  return period === "monthly" ? "Mensile" : "Settimanale";
}

function getScopeLabel(budget: BudgetSummarySource): string {
  if (budget.scope === "workspace") {
    return "Tutte le categorie";
  }

  return budget.category?.name ?? "Categoria";
}

function getBudgetTitle(budget: BudgetSummarySource): string {
  if (budget.scope === "workspace") {
    return budget.period === "monthly"
      ? "Budget mensile globale"
      : "Budget settimanale globale";
  }

  return budget.category?.name ?? "Budget categoria";
}

function getBudgetSubtitle(budget: BudgetSummarySource): string {
  return `${getPeriodLabel(budget.period)} · ${getScopeLabel(budget)}`;
}

function getStatusRank(status: BudgetStatus): number {
  if (status === "danger") {
    return 0;
  }

  if (status === "warning") {
    return 1;
  }

  return 2;
}

export function summarizeBudget(
  budget: BudgetSummarySource,
  entries: ReadonlyArray<BudgetSummaryEntry>,
  timeZone: string,
  now: Date = new Date(),
  workspaceCurrency: string,
): BudgetSummaryView {
  const { start, end } = getBudgetPeriodRange(budget.period, timeZone, now);
  const scopedEntries = entries.filter((entry) => {
    if (!isInRange(entry.date, start, end)) {
      return false;
    }

    if (budget.scope === "workspace") {
      return true;
    }

    return entry.categoryId === budget.categoryId;
  });

  const totals = aggregateBudgetSpend(scopedEntries);
  const progress = calculateBudgetProgress({
    budgetAmount: budget.amount,
    spentAmount: totals.spentAmount,
    wouldHaveSpentAmount: totals.wouldHaveSpentAmount,
    periodStart: start,
    periodEnd: end,
    now,
  });

  const { amount: _rawAmount, ...budgetRecord } = budget;

  return {
    ...budgetRecord,
    currency: budget.currency ?? workspaceCurrency,
    budgetAmount: round2(progress.budgetAmount),
    periodStart: start,
    periodEnd: end,
    spentAmount: round2(progress.spentAmount),
    remainingAmount: round2(progress.remainingAmount),
    spentPercentage: round2(progress.spentPercentage),
    timeProgressPercentage: round2(progress.timeProgressPercentage),
    dailyRemainingAmount: round2(progress.dailyRemainingAmount),
    projectedSpendAtPeriodEnd: round2(progress.projectedSpendAtPeriodEnd),
    wouldHaveSpentAmount: round2(progress.wouldHaveSpentAmount ?? totals.wouldHaveSpentAmount),
    status: progress.status,
    message: progress.message,
    title: getBudgetTitle(budget),
    subtitle: getBudgetSubtitle(budget),
    scopeLabel: getScopeLabel(budget),
    periodLabel: getPeriodLabel(budget.period),
  };
}

export function sortBudgetSummariesForManagement(
  budgets: ReadonlyArray<BudgetSummaryView>,
): BudgetSummaryView[] {
  return [...budgets].sort((left, right) => {
    if (left.scope !== right.scope) {
      return left.scope === "workspace" ? -1 : 1;
    }

    if (left.scope === "workspace") {
      if (left.period !== right.period) {
        return left.period === "monthly" ? -1 : 1;
      }

      return left.title.localeCompare(right.title, "it");
    }

    const leftCategory = left.category?.name ?? "";
    const rightCategory = right.category?.name ?? "";

    return (
      leftCategory.localeCompare(rightCategory, "it") ||
      (left.period === right.period
        ? 0
        : left.period === "monthly"
          ? -1
          : 1)
    );
  });
}

export function selectDashboardBudgetSelection(
  budgets: ReadonlyArray<BudgetSummaryView>,
): BudgetDashboardSelection {
  const globalBudgets = budgets.filter((budget) => budget.scope === "workspace");
  const mainBudget =
    globalBudgets.find((budget) => budget.period === "monthly") ??
    globalBudgets.find((budget) => budget.period === "weekly") ??
    null;

  const categoryBudgets = [...budgets]
    .filter((budget) => budget.scope === "category")
    .sort((left, right) => {
      const statusDelta = getStatusRank(left.status) - getStatusRank(right.status);
      if (statusDelta !== 0) {
        return statusDelta;
      }

      const spentDelta = right.spentPercentage - left.spentPercentage;
      if (spentDelta !== 0) {
        return spentDelta;
      }

      if (left.period !== right.period) {
        return left.period === "monthly" ? -1 : 1;
      }

      return left.title.localeCompare(right.title, "it");
    })
    .slice(0, 3);

  return {
    mainBudget,
    categoryBudgets,
    hasAnyBudget: budgets.length > 0,
  };
}
