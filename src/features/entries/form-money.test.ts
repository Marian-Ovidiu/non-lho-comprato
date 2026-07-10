import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveEntryMoneyFromForm } from "@/src/features/entries/form-money";
import { it as itDict } from "@/src/lib/i18n/it";

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

  it("rejects an amount above the Decimal(10,2) ceiling with a field error", () => {
    const result = resolveEntryMoneyFromForm(
      formData({
        realCost: "100000000",
      }),
    );

    assert.equal(result.money, undefined);
    assert.equal(result.errors.realCost, itDict.validation.amountTooLarge);
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

  // NLC only records real spending. "avoided" is no longer creatable from any
  // user path; it survives only for rows written before this rule.
  it("rejects a new avoided entry", () => {
    const result = resolveEntryMoneyFromForm(
      formData({
        mode: "avoided",
        savingContext: "comparison",
        comparisonAmount: "18",
      }),
    );

    assert.equal(result.usesTrackerFields, true);
    assert.equal(result.money, undefined);
    assert.equal(result.errors.mode, "Seleziona una modalita valida");
  });

  it("rejects a zero real cost on the legacy path instead of inferring avoided", () => {
    const result = resolveEntryMoneyFromForm(
      formData({
        realCost: "0",
        alternativeCost: "65",
      }),
    );

    assert.equal(result.usesTrackerFields, false);
    assert.equal(result.money, undefined);
    assert.equal(result.errors.realCost, "L'importo deve essere maggiore di 0");
  });

  it("rejects a comparison whose amountSpent is zero", () => {
    const result = resolveEntryMoneyFromForm(
      formData({
        mode: "spent",
        savingContext: "comparison",
        amountSpent: "0",
        comparisonAmount: "28",
      }),
    );

    assert.equal(result.money, undefined);
    assert.equal(result.errors.amountSpent, "L'importo deve essere maggiore di 0");
  });

  it("resolves a comparison where the real cost is lower than the alternative", () => {
    const result = resolveEntryMoneyFromForm(
      formData({
        mode: "spent",
        savingContext: "comparison",
        amountSpent: "0.30",
        comparisonAmount: "1.50",
      }),
    );

    assert.deepEqual(result.errors, {});
    assert.equal(result.money?.mode, "spent");
    assert.equal(result.money?.savingContext, "comparison");
    assert.equal(result.money?.realCost, 0.3);
    assert.equal(result.money?.alternativeCost, 1.5);
    assert.equal(result.money?.savedAmount, 1.2);
  });

  it("resolves a plain expense with a positive amount", () => {
    const result = resolveEntryMoneyFromForm(
      formData({
        mode: "spent",
        savingContext: "none",
        amountSpent: "12.40",
      }),
    );

    assert.deepEqual(result.errors, {});
    assert.equal(result.money?.mode, "spent");
    assert.equal(result.money?.realCost, 12.4);
    assert.equal(result.money?.savedAmount, 0);
  });

  // Habit-generated avoided entries predate the rule and must stay editable.
  describe("with allowExistingAvoided", () => {
    it("still resolves an avoided entry without requiring amountSpent", () => {
      const result = resolveEntryMoneyFromForm(
        formData({
          mode: "avoided",
          savingContext: "comparison",
          comparisonAmount: "18",
        }),
        itDict,
        { allowExistingAvoided: true },
      );

      assert.equal(result.usesTrackerFields, true);
      assert.deepEqual(result.errors, {});
      assert.equal(result.money?.mode, "avoided");
      assert.equal(result.money?.savingContext, "comparison");
      assert.equal(result.money?.realCost, 0);
      assert.equal(result.money?.alternativeCost, 18);
      assert.equal(result.money?.savedAmount, 18);
    });

    it("still requires a positive comparison amount", () => {
      const missing = resolveEntryMoneyFromForm(
        formData({ mode: "avoided" }),
        itDict,
        { allowExistingAvoided: true },
      );

      assert.equal(missing.money, undefined);
      assert.equal(missing.errors.comparisonAmount, "Questo campo è obbligatorio");
      assert.equal(missing.errors.amountSpent, undefined);

      const zero = resolveEntryMoneyFromForm(
        formData({ mode: "avoided", comparisonAmount: "0" }),
        itDict,
        { allowExistingAvoided: true },
      );

      assert.equal(zero.money, undefined);
      assert.equal(
        zero.errors.comparisonAmount,
        "L'importo deve essere maggiore di 0",
      );
    });

    it("does not let a spent submission become avoided", () => {
      // The flag mirrors the stored row, so a "spent" entry never passes it.
      const result = resolveEntryMoneyFromForm(
        formData({
          mode: "spent",
          savingContext: "none",
          amountSpent: "9",
        }),
        itDict,
        { allowExistingAvoided: true },
      );

      assert.deepEqual(result.errors, {});
      assert.equal(result.money?.mode, "spent");
      assert.equal(result.money?.realCost, 9);
    });
  });

  it("rejects unknown modes", () => {
    const result = resolveEntryMoneyFromForm(
      formData({
        mode: "banana",
        amountSpent: "10",
      }),
    );

    assert.equal(result.usesTrackerFields, true);
    assert.equal(result.money, undefined);
    assert.equal(result.errors.mode, "Seleziona una modalita valida");
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
