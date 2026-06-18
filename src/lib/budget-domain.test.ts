import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  aggregateBudgetSpend,
  calculateBudgetProgress,
} from "@/src/lib/budget-domain";

const PERIOD_START = new Date("2026-06-30T22:00:00.000Z");
const PERIOD_END = new Date("2026-07-31T22:00:00.000Z");
const NOW = new Date("2026-07-08T22:00:00.000Z");

describe("aggregateBudgetSpend", () => {
  it("sums only realCost and ignores savedAmount/alternativeCost as discounts", () => {
    const totals = aggregateBudgetSpend([
      {
        realCost: 30,
        alternativeCost: 50,
        savedAmount: 20,
        mode: "spent",
      },
      {
        realCost: 0,
        alternativeCost: 100,
        savedAmount: 100,
        mode: "avoided",
      },
    ]);

    assert.equal(totals.spentAmount, 30);
    assert.equal(totals.wouldHaveSpentAmount, 150);
    assert.equal(totals.entriesCount, 2);
  });

  it("does not increase spentAmount for avoided entries with realCost=0", () => {
    const totals = aggregateBudgetSpend([
      {
        realCost: 0,
        alternativeCost: 18,
        savedAmount: 18,
        mode: "avoided",
      },
    ]);

    assert.equal(totals.spentAmount, 0);
    assert.equal(totals.wouldHaveSpentAmount, 18);
  });
});

describe("calculateBudgetProgress", () => {
  it("returns ok for a monthly budget that is ahead of time pace", () => {
    const result = calculateBudgetProgress({
      budgetAmount: 100,
      spentAmount: 25,
      wouldHaveSpentAmount: 40,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      now: NOW,
    });

    assert.equal(result.status, "ok");
    assert.equal(result.message, "Sei in linea con il budget.");
    assert.equal(result.budgetAmount, 100);
    assert.equal(result.spentAmount, 25);
    assert.equal(result.remainingAmount, 75);
    assert.equal(result.wouldHaveSpentAmount, 40);
    assert.equal(result.spentPercentage > 0, true);
    assert.equal(result.timeProgressPercentage > 0, true);
  });

  it("returns warning for a monthly budget slightly ahead of pace", () => {
    const result = calculateBudgetProgress({
      budgetAmount: 100,
      spentAmount: 40,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      now: NOW,
    });

    assert.equal(result.status, "warning");
    assert.equal(
      result.message,
      "Stai spendendo un po' più velocemente del previsto.",
    );
  });

  it("returns danger for a monthly budget too far ahead of pace", () => {
    const result = calculateBudgetProgress({
      budgetAmount: 100,
      spentAmount: 60,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      now: NOW,
    });

    assert.equal(result.status, "danger");
    assert.equal(
      result.message,
      "Stai andando troppo veloce rispetto al budget.",
    );
  });

  it("returns danger and superato message when the budget is exceeded", () => {
    const result = calculateBudgetProgress({
      budgetAmount: 100,
      spentAmount: 120,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      now: NOW,
    });

    assert.equal(result.status, "danger");
    assert.equal(result.message, "Budget superato.");
    assert.equal(result.remainingAmount, -20);
  });

  it("supports category budgets as caller-filtered aggregates only", () => {
    const filteredCategorySpend = aggregateBudgetSpend([
      {
        realCost: 12,
        alternativeCost: 30,
        savedAmount: 18,
      },
      {
        realCost: 8,
        alternativeCost: 10,
        savedAmount: 2,
      },
    ]);

    const result = calculateBudgetProgress({
      budgetAmount: 50,
      spentAmount: filteredCategorySpend.spentAmount,
      wouldHaveSpentAmount: filteredCategorySpend.wouldHaveSpentAmount,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      now: NOW,
    });

    assert.equal(result.spentAmount, 20);
    assert.equal(result.wouldHaveSpentAmount, 40);
    assert.equal(result.status, "warning");
  });

  it("handles the start of the period without NaN or Infinity", () => {
    const result = calculateBudgetProgress({
      budgetAmount: 100,
      spentAmount: 0,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      now: PERIOD_START,
    });

    assert.equal(Number.isNaN(result.spentPercentage), false);
    assert.equal(Number.isFinite(result.spentPercentage), true);
    assert.equal(Number.isNaN(result.timeProgressPercentage), false);
    assert.equal(Number.isFinite(result.timeProgressPercentage), true);
    assert.equal(Number.isNaN(result.dailyRemainingAmount), false);
    assert.equal(Number.isFinite(result.dailyRemainingAmount), true);
    assert.equal(Number.isNaN(result.projectedSpendAtPeriodEnd), false);
    assert.equal(Number.isFinite(result.projectedSpendAtPeriodEnd), true);
  });
});
