import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeBudgetMonthTotals } from "@/src/features/budget/month-totals";

describe("computeBudgetMonthTotals", () => {
  it("returns zeros for no entries", () => {
    assert.deepEqual(computeBudgetMonthTotals([]), {
      ordinarySpent: 0,
      avoidedAmount: 0,
    });
  });

  it("sums realCost of ordinary expenses only", () => {
    const totals = computeBudgetMonthTotals([
      { realCost: 12.5, alternativeCost: 12.5, savedAmount: 0, mode: "spent", savingContext: "none" },
      { realCost: 7.25, alternativeCost: 7.25, savedAmount: 0, mode: "spent", savingContext: "none" },
    ]);

    assert.equal(totals.ordinarySpent, 19.75);
    assert.equal(totals.avoidedAmount, 0);
  });

  it("excludes comparison expenses from ordinarySpent", () => {
    const totals = computeBudgetMonthTotals([
      { realCost: 20, alternativeCost: 30, savedAmount: 10, mode: "spent", savingContext: "comparison" },
      { realCost: 5, alternativeCost: 5, savedAmount: 0, mode: "spent", savingContext: "none" },
    ]);

    // The comparison entry's realCost is not ordinary spending.
    assert.equal(totals.ordinarySpent, 5);
    assert.equal(totals.avoidedAmount, 0);
  });

  it("counts avoided entries by their alternativeCost", () => {
    const totals = computeBudgetMonthTotals([
      { realCost: 0, alternativeCost: 3.5, savedAmount: 3.5, mode: "avoided", savingContext: "none" },
      { realCost: 0, alternativeCost: 4.5, savedAmount: 4.5, mode: "avoided", savingContext: "none" },
    ]);

    assert.equal(totals.ordinarySpent, 0);
    assert.equal(totals.avoidedAmount, 8);
  });

  it("mixes ordinary, comparison and avoided in one month", () => {
    const totals = computeBudgetMonthTotals([
      { realCost: 10, alternativeCost: 10, savedAmount: 0, mode: "spent", savingContext: "none" },
      { realCost: 40, alternativeCost: 28, savedAmount: -12, mode: "spent", savingContext: "comparison" },
      { realCost: 0, alternativeCost: 6, savedAmount: 6, mode: "avoided", savingContext: "none" },
    ]);

    assert.equal(totals.ordinarySpent, 10);
    assert.equal(totals.avoidedAmount, 6);
  });

  it("infers avoided from legacy money fields without an explicit mode", () => {
    const totals = computeBudgetMonthTotals([
      { realCost: 0, alternativeCost: 9, savedAmount: 9 },
    ]);

    assert.equal(totals.ordinarySpent, 0);
    assert.equal(totals.avoidedAmount, 9);
  });
});
