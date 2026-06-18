import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { CraftedBudgetAlertList } from "@/src/components/budget/crafted-budget-alert-list";
import type { BudgetAlert } from "@/src/lib/budget-alerts";

function makeAlert(overrides: Partial<BudgetAlert> = {}): BudgetAlert {
  return {
    id: "budget-alert:budget-1:over_budget",
    kind: "over_budget",
    level: "danger",
    budgetId: "budget-1",
    scope: "workspace",
    period: "monthly",
    title: "Budget superato",
    subtitle: "Workspace · mensile",
    categoryName: null,
    message: "Hai superato il budget mensile totale di 24€.",
    detail: "Speso 124€ su 100€.",
    spentAmount: 124,
    remainingAmount: -24,
    spentPercentage: 124,
    timeProgressPercentage: 50,
    dailyRemainingAmount: -3,
    projectedSpendAtPeriodEnd: 148,
    daysRemaining: 15,
    ctaHref: "/workspace/budgets",
    ...overrides,
  };
}

describe("CraftedBudgetAlertList", () => {
  it("renders nothing when the list is empty", () => {
    const markup = renderToStaticMarkup(<CraftedBudgetAlertList alerts={[]} />);
    assert.equal(markup, "");
  });

  it("renders an alert with the workspace budget link", () => {
    const markup = renderToStaticMarkup(
      <CraftedBudgetAlertList alerts={[makeAlert()]} />,
    );

    assert.match(markup, /Budget superato/);
    assert.match(markup, /Hai superato il budget mensile totale di 24€\./);
    assert.match(markup, /href="\/workspace\/budgets"/);
  });

  it("renders more than one alert without crashing", () => {
    const markup = renderToStaticMarkup(
      <CraftedBudgetAlertList
        alerts={[
          makeAlert(),
          makeAlert({
            id: "budget-alert:budget-2:pace_risk",
            kind: "pace_risk",
            level: "warning",
            budgetId: "budget-2",
            scope: "category",
            period: "weekly",
            title: "Ritmo troppo alto",
            subtitle: "Sigarette · settimanale",
            categoryName: "Sigarette",
            message: "Stai usando il budget più velocemente del previsto.",
            detail: "Spesa proiettata a fine periodo: 30€.",
          }),
        ]}
      />,
    );

    assert.equal((markup.match(/href="\/workspace\/budgets"/g) ?? []).length, 2);
    assert.match(markup, /Ritmo troppo alto/);
  });
});
