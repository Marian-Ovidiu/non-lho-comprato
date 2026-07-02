import { round2 } from "@/src/lib/money-number";
import { getBudgetElapsedFraction } from "@/src/lib/budget-period";

export type BudgetSpendEntry = {
  realCost?: unknown;
  alternativeCost?: unknown;
  savedAmount?: unknown;
  mode?: unknown;
};

export type BudgetSpendTotals = {
  spentAmount: number;
  wouldHaveSpentAmount: number;
  entriesCount: number;
};

export type BudgetStatus = "ok" | "warning" | "danger";

export type BudgetProgressInput = {
  budgetAmount: unknown;
  spentAmount: unknown;
  periodStart: Date;
  periodEnd: Date;
  now?: Date;
  wouldHaveSpentAmount?: unknown;
};

export type BudgetProgress = {
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  spentPercentage: number;
  timeProgressPercentage: number;
  dailyRemainingAmount: number;
  projectedSpendAtPeriodEnd: number;
  wouldHaveSpentAmount?: number;
  status: BudgetStatus;
  message: string;
};

function toFiniteNumber(value: unknown): number {
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

function getBudgetStatus(
  spentAmount: number,
  budgetAmount: number,
  spentPercentage: number,
  timeProgressPercentage: number,
): { status: BudgetStatus; message: string } {
  if (spentAmount > budgetAmount) {
    return {
      status: "danger",
      message: "Budget superato.",
    };
  }

  if (spentPercentage <= timeProgressPercentage + 10) {
    return {
      status: "ok",
      message: "Sei in linea con il budget.",
    };
  }

  if (spentPercentage <= timeProgressPercentage + 25) {
    return {
      status: "warning",
      message: "Stai spendendo un po' più velocemente del previsto.",
    };
  }

  return {
    status: "danger",
    message: "Stai andando troppo veloce rispetto al budget.",
  };
}

export function aggregateBudgetSpend(
  entries: ReadonlyArray<BudgetSpendEntry>,
): BudgetSpendTotals {
  let spentAmount = 0;
  let wouldHaveSpentAmount = 0;

  for (const entry of entries) {
    spentAmount = round2(spentAmount + toFiniteNumber(entry.realCost));
    wouldHaveSpentAmount = round2(
      wouldHaveSpentAmount + toFiniteNumber(entry.alternativeCost),
    );
  }

  return {
    spentAmount,
    wouldHaveSpentAmount,
    entriesCount: entries.length,
  };
}

export function calculateBudgetProgress(
  input: BudgetProgressInput,
): BudgetProgress {
  const budgetAmount = round2(toFiniteNumber(input.budgetAmount));
  const spentAmount = round2(toFiniteNumber(input.spentAmount));
  const wouldHaveSpentAmount =
    input.wouldHaveSpentAmount === undefined
      ? undefined
      : round2(toFiniteNumber(input.wouldHaveSpentAmount));
  const elapsedFraction = getBudgetElapsedFraction(
    input.periodStart,
    input.periodEnd,
    input.now ?? new Date(),
  );
  const timeProgressPercentage = round2(elapsedFraction * 100);
  const spentPercentage =
    budgetAmount > 0 ? round2((spentAmount / budgetAmount) * 100) : 0;
  const remainingAmount = round2(budgetAmount - spentAmount);
  const projectedSpendAtPeriodEnd =
    elapsedFraction > 0 ? round2(spentAmount / elapsedFraction) : spentAmount;

  const periodStartMs = input.periodStart.getTime();
  const periodEndMs = input.periodEnd.getTime();
  const nowMs = (input.now ?? new Date()).getTime();
  const clampedNowMs = Math.min(Math.max(nowMs, periodStartMs), periodEndMs);
  const remainingDays = Math.max(
    (periodEndMs - clampedNowMs) / (24 * 60 * 60 * 1000),
    1,
  );
  const dailyRemainingAmount = round2(remainingAmount / remainingDays);

  const { status, message } = getBudgetStatus(
    spentAmount,
    budgetAmount,
    spentPercentage,
    timeProgressPercentage,
  );

  return {
    budgetAmount,
    spentAmount,
    remainingAmount,
    spentPercentage,
    timeProgressPercentage,
    dailyRemainingAmount,
    projectedSpendAtPeriodEnd,
    ...(wouldHaveSpentAmount === undefined
      ? {}
      : { wouldHaveSpentAmount }),
    status,
    message,
  };
}
