import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BudgetSummaryView } from "@/src/lib/budget-summary";
import {
  createBudgetAlertFromSummary,
  createBudgetAlertsFromSummaries,
  selectBudgetAlertSelection,
} from "@/src/lib/budget-alerts";

const PERIOD_START = new Date("2026-06-30T22:00:00.000Z");
const PERIOD_END = new Date("2026-07-31T22:00:00.000Z");

function makeWorkspaceSummary(
  overrides: Partial<BudgetSummaryView> = {},
): BudgetSummaryView {
  return {
    id: "budget-workspace",
    workspaceId: "workspace-1",
    scope: "workspace",
    scopeKey: "workspace",
    categoryId: null,
    category: null,
    period: "monthly",
    amount: "100",
    currency: "EUR",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    budgetAmount: 100,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    spentAmount: 40,
    remainingAmount: 60,
    spentPercentage: 40,
    timeProgressPercentage: 30,
    dailyRemainingAmount: 6,
    projectedSpendAtPeriodEnd: 50,
    wouldHaveSpentAmount: 60,
    status: "ok",
    message: "Sei in linea con il budget.",
    title: "Budget mensile globale",
    subtitle: "Mensile · Tutte le categorie",
    scopeLabel: "Tutte le categorie",
    periodLabel: "Mensile",
    ...overrides,
  };
}

function makeCategorySummary(
  overrides: Partial<BudgetSummaryView> = {},
): BudgetSummaryView {
  return {
    id: "budget-category",
    workspaceId: "workspace-1",
    scope: "category",
    scopeKey: "category-1",
    categoryId: "category-1",
    category: {
      id: "category-1",
      name: "Sigarette",
      slug: "sigarette",
      icon: null,
      color: null,
      archivedAt: null,
    },
    period: "monthly",
    amount: "100",
    currency: "EUR",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    budgetAmount: 100,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    spentAmount: 40,
    remainingAmount: 60,
    spentPercentage: 40,
    timeProgressPercentage: 30,
    dailyRemainingAmount: 6,
    projectedSpendAtPeriodEnd: 50,
    wouldHaveSpentAmount: 60,
    status: "ok",
    message: "Sei in linea con il budget.",
    title: "Sigarette",
    subtitle: "Mensile · Sigarette",
    scopeLabel: "Sigarette",
    periodLabel: "Mensile",
    ...overrides,
  };
}

describe("createBudgetAlertFromSummary", () => {
  it("returns no alert when the budget is ok", () => {
    const alert = createBudgetAlertFromSummary(makeWorkspaceSummary());
    assert.equal(alert, null);
  });

  it("generates an over_budget danger alert", () => {
    const alert = createBudgetAlertFromSummary(
      makeWorkspaceSummary({
        spentAmount: 124,
        remainingAmount: -24,
        spentPercentage: 124,
        status: "danger",
        message: "Budget superato.",
        projectedSpendAtPeriodEnd: 130,
      }),
    );

    assert.ok(alert);
    assert.equal(alert?.kind, "over_budget");
    assert.equal(alert?.level, "danger");
    assert.equal(alert?.title, "Budget superato");
    assert.equal(
      alert?.message,
      "Hai superato il budget mensile totale di 24€.",
    );
  });

  it("generates a pace_risk warning alert", () => {
    const alert = createBudgetAlertFromSummary(
      makeWorkspaceSummary({
        spentAmount: 62,
        spentPercentage: 62,
        status: "warning",
        message: "Stai spendendo un po' più velocemente del previsto.",
        projectedSpendAtPeriodEnd: 118,
      }),
    );

    assert.ok(alert);
    assert.equal(alert?.kind, "pace_risk");
    assert.equal(alert?.level, "warning");
    assert.equal(alert?.title, "Ritmo troppo alto");
  });

  it("generates a pace_risk danger alert when not superato", () => {
    const alert = createBudgetAlertFromSummary(
      makeWorkspaceSummary({
        spentAmount: 82,
        spentPercentage: 82,
        status: "danger",
        message: "Stai andando troppo veloce rispetto al budget.",
        projectedSpendAtPeriodEnd: 140,
      }),
    );

    assert.ok(alert);
    assert.equal(alert?.kind, "pace_risk");
    assert.equal(alert?.level, "danger");
  });

  it("generates a low_runway warning alert", () => {
    const alert = createBudgetAlertFromSummary(
      makeWorkspaceSummary({
        spentAmount: 84,
        remainingAmount: 16,
        spentPercentage: 84,
        timeProgressPercentage: 40,
        dailyRemainingAmount: 4.2,
        projectedSpendAtPeriodEnd: 96,
        status: "ok",
        message: "Sei in linea con il budget.",
      }),
    );

    assert.ok(alert);
    assert.equal(alert?.kind, "low_runway");
    assert.equal(alert?.level, "warning");
    assert.equal(
      alert?.message,
      "Ti restano circa 4,20€ al giorno fino a fine periodo.",
    );
  });

  it("does not flag an untouched small budget as low_runway", () => {
    const alert = createBudgetAlertFromSummary(
      makeWorkspaceSummary({
        spentAmount: 0,
        remainingAmount: 100,
        spentPercentage: 0,
        timeProgressPercentage: 5.25,
        dailyRemainingAmount: 3.4,
        projectedSpendAtPeriodEnd: 0,
        status: "ok",
      }),
    );

    assert.equal(alert, null);
  });

  it("does not flag low_runway when spending is behind the time pace", () => {
    const alert = createBudgetAlertFromSummary(
      makeWorkspaceSummary({
        spentAmount: 10,
        remainingAmount: 90,
        spentPercentage: 10,
        timeProgressPercentage: 50,
        dailyRemainingAmount: 4.5,
        projectedSpendAtPeriodEnd: 20,
        status: "ok",
      }),
    );

    assert.equal(alert, null);
  });

  it("uses category scope and categoryName for category alerts", () => {
    const alert = createBudgetAlertFromSummary(
      makeCategorySummary({
        spentAmount: 112,
        remainingAmount: -12,
        spentPercentage: 112,
        status: "danger",
        message: "Budget superato.",
      }),
    );

    assert.ok(alert);
    assert.equal(alert?.scope, "category");
    assert.equal(alert?.categoryName, "Sigarette");
    assert.equal(
      alert?.message,
      "Hai superato il budget mensile di Sigarette di 12€.",
    );
  });

  it("gives over_budget priority over pace_risk", () => {
    const alert = createBudgetAlertFromSummary(
      makeWorkspaceSummary({
        spentAmount: 124,
        remainingAmount: -24,
        spentPercentage: 124,
        status: "danger",
      }),
    );

    assert.equal(alert?.kind, "over_budget");
  });

  it("gives pace_risk priority over low_runway", () => {
    const alert = createBudgetAlertFromSummary(
      makeWorkspaceSummary({
        spentAmount: 70,
        remainingAmount: 30,
        spentPercentage: 70,
        status: "warning",
        dailyRemainingAmount: 4,
      }),
    );

    assert.equal(alert?.kind, "pace_risk");
  });
});

describe("createBudgetAlertsFromSummaries", () => {
  it("orders danger alerts before warning alerts", () => {
    const alerts = createBudgetAlertsFromSummaries([
      makeWorkspaceSummary({
        id: "warning",
        spentAmount: 70,
        remainingAmount: 30,
        spentPercentage: 70,
        status: "warning",
        title: "Workspace warning",
      }),
      makeWorkspaceSummary({
        id: "danger",
        spentAmount: 82,
        remainingAmount: 18,
        spentPercentage: 82,
        status: "danger",
        title: "Workspace danger",
      }),
    ]);

    assert.equal(alerts[0]?.id, "budget-alert:danger:pace_risk");
    assert.equal(alerts[1]?.id, "budget-alert:warning:pace_risk");
  });

  it("puts workspace alerts before category alerts at parity", () => {
    const alerts = createBudgetAlertsFromSummaries([
      makeCategorySummary({
        id: "category-warning",
        spentAmount: 70,
        remainingAmount: 30,
        spentPercentage: 70,
        status: "warning",
        title: "Category warning",
      }),
      makeWorkspaceSummary({
        id: "workspace-warning",
        spentAmount: 70,
        remainingAmount: 30,
        spentPercentage: 70,
        status: "warning",
        title: "Workspace warning",
      }),
    ]);

    assert.equal(alerts[0]?.scope, "workspace");
    assert.equal(alerts[1]?.scope, "category");
  });

  it("preserves kind priority over remainingAmount when sorting", () => {
    const alerts = createBudgetAlertsFromSummaries([
      makeWorkspaceSummary({
        id: "low-runway",
        spentAmount: 84,
        remainingAmount: 16,
        spentPercentage: 84,
        timeProgressPercentage: 40,
        dailyRemainingAmount: 4.2,
        status: "ok",
      }),
      makeWorkspaceSummary({
        id: "pace-risk",
        spentAmount: 70,
        remainingAmount: 30,
        spentPercentage: 70,
        status: "warning",
      }),
    ]);

    assert.equal(alerts[0]?.kind, "pace_risk");
    assert.equal(alerts[1]?.kind, "low_runway");
  });
});

describe("selectBudgetAlertSelection", () => {
  it("limits primaryAlerts to the default maximum of 2", () => {
    const selection = selectBudgetAlertSelection([
      makeWorkspaceSummary({
        id: "budget-1",
        spentAmount: 124,
        remainingAmount: -24,
        spentPercentage: 124,
        status: "danger",
      }),
      makeWorkspaceSummary({
        id: "budget-2",
        spentAmount: 82,
        remainingAmount: 18,
        spentPercentage: 82,
        status: "danger",
      }),
      makeCategorySummary({
        id: "budget-3",
        spentAmount: 70,
        remainingAmount: 30,
        spentPercentage: 70,
        status: "warning",
      }),
    ]);

    assert.equal(selection.primaryAlerts.length, 2);
    assert.equal(selection.pageAlerts.length, 3);
    assert.equal(selection.hasAlerts, true);
  });

  it("returns ordered pageAlerts", () => {
    const selection = selectBudgetAlertSelection([
      makeCategorySummary({
        id: "budget-3",
        spentAmount: 70,
        remainingAmount: 30,
        spentPercentage: 70,
        status: "warning",
      }),
      makeWorkspaceSummary({
        id: "budget-1",
        spentAmount: 124,
        remainingAmount: -24,
        spentPercentage: 124,
        status: "danger",
      }),
      makeWorkspaceSummary({
        id: "budget-2",
        spentAmount: 84,
        remainingAmount: 16,
        spentPercentage: 84,
        timeProgressPercentage: 40,
        dailyRemainingAmount: 4.2,
        status: "ok",
      }),
    ]);

    assert.equal(selection.pageAlerts[0]?.kind, "over_budget");
    assert.equal(selection.pageAlerts[1]?.kind, "pace_risk");
    assert.equal(selection.pageAlerts[2]?.kind, "low_runway");
  });

  it("returns hasAlerts false when there are no alerts", () => {
    const selection = selectBudgetAlertSelection([
      makeWorkspaceSummary({ status: "ok" }),
      makeCategorySummary({ status: "ok" }),
    ]);

    assert.equal(selection.hasAlerts, false);
    assert.deepEqual(selection.primaryAlerts, []);
    assert.deepEqual(selection.pageAlerts, []);
  });
});
