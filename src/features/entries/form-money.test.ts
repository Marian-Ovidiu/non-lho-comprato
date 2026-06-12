import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveEntryMoneyFromForm } from "@/src/features/entries/form-money";

function formData(values: Record<string, string>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }

  return data;
}

describe("resolveEntryMoneyFromForm", () => {
  it("resolves legacy real and alternative costs", () => {
    const result = resolveEntryMoneyFromForm(
      formData({
        realCost: "28",
        alternativeCost: "45",
      }),
    );

    assert.equal(result.usesTrackerFields, false);
    assert.deepEqual(result.errors, {});
    assert.equal(result.money?.realCost, 28);
    assert.equal(result.money?.alternativeCost, 45);
    assert.equal(result.money?.savedAmount, 17);
  });

  it("defaults legacy alternative cost to real cost", () => {
    const result = resolveEntryMoneyFromForm(
      formData({
        realCost: "12,50",
      }),
    );

    assert.equal(result.usesTrackerFields, false);
    assert.equal(result.money?.realCost, 12.5);
    assert.equal(result.money?.alternativeCost, 12.5);
    assert.equal(result.money?.savedAmount, 0);
  });

  it("resolves tracker-first spent comparisons", () => {
    const result = resolveEntryMoneyFromForm(
      formData({
        mode: "spent",
        savingContext: "comparison",
        amountSpent: "50",
        comparisonAmount: "40",
      }),
    );

    assert.equal(result.usesTrackerFields, true);
    assert.deepEqual(result.errors, {});
    assert.equal(result.money?.mode, "spent");
    assert.equal(result.money?.savingContext, "comparison");
    assert.equal(result.money?.savedAmount, -10);
  });

  it("resolves the Ho speso form intent as a normal expense", () => {
    const result = resolveEntryMoneyFromForm(
      formData({
        mode: "spent",
        savingContext: "none",
        amountSpent: "20",
      }),
    );

    assert.equal(result.usesTrackerFields, true);
    assert.deepEqual(result.errors, {});
    assert.equal(result.money?.mode, "spent");
    assert.equal(result.money?.savingContext, "none");
    assert.equal(result.money?.realCost, 20);
    assert.equal(result.money?.alternativeCost, 20);
    assert.equal(result.money?.savedAmount, 0);
  });

  it("resolves the Ho speso e voglio confrontarlo form intent", () => {
    const result = resolveEntryMoneyFromForm(
      formData({
        mode: "spent",
        savingContext: "comparison",
        amountSpent: "8",
        comparisonAmount: "15",
      }),
    );

    assert.equal(result.usesTrackerFields, true);
    assert.deepEqual(result.errors, {});
    assert.equal(result.money?.mode, "spent");
    assert.equal(result.money?.savingContext, "comparison");
    assert.equal(result.money?.realCost, 8);
    assert.equal(result.money?.alternativeCost, 15);
    assert.equal(result.money?.savedAmount, 7);
  });

  it("resolves the Non l'ho comprato form intent as avoided spending", () => {
    const result = resolveEntryMoneyFromForm(
      formData({
        mode: "avoided",
        savingContext: "comparison",
        comparisonAmount: "18",
      }),
    );

    assert.equal(result.usesTrackerFields, true);
    assert.deepEqual(result.errors, {});
    assert.equal(result.money?.mode, "avoided");
    assert.equal(result.money?.savingContext, "comparison");
    assert.equal(result.money?.realCost, 0);
    assert.equal(result.money?.alternativeCost, 18);
    assert.equal(result.money?.savedAmount, 18);
  });

  it("rejects invalid tracker-first money", () => {
    const result = resolveEntryMoneyFromForm(
      formData({
        mode: "spent",
        amountSpent: "nope",
      }),
    );

    assert.equal(result.usesTrackerFields, true);
    assert.equal(result.money, undefined);
    assert.equal(result.errors.amountSpent, "Inserisci un numero valido");
  });
});
