import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  selectDashboardBudgetSelection,
  summarizeBudget,
} from "@/src/lib/budget-summary";

const PERIOD_START = new Date("2026-06-30T22:00:00.000Z");
const PERIOD_END = new Date("2026-07-31T22:00:00.000Z");
const NOW = new Date("2026-07-15T12:00:00.000Z");

describe("summarizeBudget", () => {
  it("counts only the caller-filtered category entries", () => {
    const summary = summarizeBudget(
      {
        id: "budget-1",
        workspaceId: "workspace-1",
        scope: "category",
        scopeKey: "category-1",
        categoryId: "category-1",
        category: {
          id: "category-1",
          name: "Spesa",
          slug: "spesa",
          icon: null,
          color: null,
          archivedAt: null,
        },
        period: "monthly",
        amount: "50",
        currency: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      [
        {
          categoryId: "category-1",
          realCost: 12,
          alternativeCost: 30,
          savedAmount: 18,
          mode: "spent",
          date: new Date("2026-07-10T10:00:00.000Z"),
        },
        {
          categoryId: "category-2",
          realCost: 8,
          alternativeCost: 10,
          savedAmount: 2,
          mode: "spent",
          date: new Date("2026-07-11T10:00:00.000Z"),
        },
      ],
      "Europe/Rome",
      NOW,
      "EUR",
    );

    assert.equal(summary.spentAmount, 12);
    assert.equal(summary.wouldHaveSpentAmount, 30);
    assert.equal(summary.remainingAmount, 38);
  });

  it("does not let savedAmount or alternativeCost reduce the spent amount", () => {
    const summary = summarizeBudget(
      {
        id: "budget-2",
        workspaceId: "workspace-1",
        scope: "workspace",
        scopeKey: "workspace",
        categoryId: null,
        category: null,
        period: "monthly",
        amount: "100",
        currency: "EUR",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      [
        {
          categoryId: "category-1",
          realCost: 30,
          alternativeCost: 50,
          savedAmount: 20,
          mode: "spent",
          date: new Date("2026-07-10T10:00:00.000Z"),
        },
        {
          categoryId: "category-2",
          realCost: 0,
          alternativeCost: 100,
          savedAmount: 100,
          mode: "avoided",
          date: new Date("2026-07-10T12:00:00.000Z"),
        },
      ],
      "Europe/Rome",
      NOW,
      "EUR",
    );

    assert.equal(summary.spentAmount, 30);
    assert.equal(summary.wouldHaveSpentAmount, 150);
  });
});

describe("selectDashboardBudgetSelection", () => {
  it("returns a CTA state when no budget exists", () => {
    const selection = selectDashboardBudgetSelection([]);
    assert.equal(selection.hasAnyBudget, false);
    assert.equal(selection.mainBudget, null);
    assert.deepEqual(selection.categoryBudgets, []);
  });

  it("prioritizes danger category budgets before warning and ok", () => {
    const selection = selectDashboardBudgetSelection([
      {
        id: "ok",
        workspaceId: "workspace-1",
        scope: "category",
        scopeKey: "category-ok",
        categoryId: "category-ok",
        category: {
          id: "category-ok",
          name: "Ok",
          slug: "ok",
          icon: null,
          color: null,
          archivedAt: null,
        },
        period: "monthly",
        amount: "100",
        currency: "EUR",
        createdAt: new Date(),
        updatedAt: new Date(),
        budgetAmount: 100,
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
        spentAmount: 25,
        remainingAmount: 75,
        spentPercentage: 25,
        timeProgressPercentage: 20,
        dailyRemainingAmount: 1,
        projectedSpendAtPeriodEnd: 30,
        wouldHaveSpentAmount: 25,
        status: "ok",
        message: "ok",
        title: "Ok",
        subtitle: "Mensile · Ok",
        scopeLabel: "Ok",
        periodLabel: "Mensile",
      },
      {
        id: "warning",
        workspaceId: "workspace-1",
        scope: "category",
        scopeKey: "category-warning",
        categoryId: "category-warning",
        category: {
          id: "category-warning",
          name: "Warning",
          slug: "warning",
          icon: null,
          color: null,
          archivedAt: null,
        },
        period: "monthly",
        amount: "100",
        currency: "EUR",
        createdAt: new Date(),
        updatedAt: new Date(),
        budgetAmount: 100,
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
        spentAmount: 60,
        remainingAmount: 40,
        spentPercentage: 60,
        timeProgressPercentage: 20,
        dailyRemainingAmount: 1,
        projectedSpendAtPeriodEnd: 80,
        wouldHaveSpentAmount: 60,
        status: "warning",
        message: "warning",
        title: "Warning",
        subtitle: "Mensile · Warning",
        scopeLabel: "Warning",
        periodLabel: "Mensile",
      },
      {
        id: "danger",
        workspaceId: "workspace-1",
        scope: "category",
        scopeKey: "category-danger",
        categoryId: "category-danger",
        category: {
          id: "category-danger",
          name: "Danger",
          slug: "danger",
          icon: null,
          color: null,
          archivedAt: null,
        },
        period: "monthly",
        amount: "100",
        currency: "EUR",
        createdAt: new Date(),
        updatedAt: new Date(),
        budgetAmount: 100,
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
        spentAmount: 120,
        remainingAmount: -20,
        spentPercentage: 120,
        timeProgressPercentage: 20,
        dailyRemainingAmount: -1,
        projectedSpendAtPeriodEnd: 140,
        wouldHaveSpentAmount: 120,
        status: "danger",
        message: "danger",
        title: "Danger",
        subtitle: "Mensile · Danger",
        scopeLabel: "Danger",
        periodLabel: "Mensile",
      },
    ]);

    assert.equal(selection.categoryBudgets[0]?.id, "danger");
    assert.equal(selection.categoryBudgets[1]?.id, "warning");
    assert.equal(selection.categoryBudgets[2]?.id, "ok");
  });
});
