import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateEntrySavedAmount,
  calculateEntryMoney,
  inferEntryMode,
  inferEntrySavingContext,
  isAvoidedEntry,
  isComparedEntry,
  parseEntryMoneyInput,
  toEntryMoneyView,
} from "@/src/lib/entry-domain";

describe("inferEntryMode", () => {
  it("infers avoided from legacy money fields", () => {
    assert.equal(
      inferEntryMode({
        realCost: 0,
        alternativeCost: 18,
        savedAmount: 18,
      }),
      "avoided",
    );
  });

  it("prefers explicit mode when already available", () => {
    assert.equal(
      inferEntryMode({
        mode: "avoided",
        realCost: 12,
        alternativeCost: 12,
        savedAmount: 0,
      }),
      "avoided",
    );
  });
});

describe("inferEntrySavingContext", () => {
  it("prefers explicit saving context when already available", () => {
    assert.equal(
      inferEntrySavingContext({
        savingContext: "none",
        realCost: 28,
        alternativeCost: 45,
        savedAmount: 17,
      }),
      "none",
    );
  });

  it("infers comparison when alternative and real costs differ", () => {
    assert.equal(
      inferEntrySavingContext({
        realCost: 28,
        alternativeCost: 45,
        savedAmount: 17,
      }),
      "comparison",
    );
  });

  it("falls back to none when alternative and real costs match", () => {
    assert.equal(
      inferEntrySavingContext({
        realCost: 12,
        alternativeCost: 12,
        savedAmount: 0,
      }),
      "none",
    );
  });
});

describe("calculateEntryMoney", () => {
  it("builds a normal spent entry without comparison", () => {
    assert.deepEqual(
      calculateEntryMoney({
        mode: "spent",
        savingContext: "none",
        amountSpent: 12,
      }),
      {
        mode: "spent",
        savingContext: "none",
        realCost: 12,
        alternativeCost: 12,
        savedAmount: 0,
        amountSpent: 12,
        comparisonAmount: 12,
        savingImpact: 0,
      },
    );
  });

  it("builds a spent entry with positive comparison impact", () => {
    assert.deepEqual(
      calculateEntryMoney({
        mode: "spent",
        savingContext: "comparison",
        amountSpent: 28,
        comparisonAmount: 45,
      }),
      {
        mode: "spent",
        savingContext: "comparison",
        realCost: 28,
        alternativeCost: 45,
        savedAmount: 17,
        amountSpent: 28,
        comparisonAmount: 45,
        savingImpact: 17,
      },
    );
  });

  it("preserves negative saving impact for compared spending", () => {
    assert.deepEqual(
      calculateEntryMoney({
        mode: "spent",
        savingContext: "comparison",
        amountSpent: 50,
        comparisonAmount: 40,
      }),
      {
        mode: "spent",
        savingContext: "comparison",
        realCost: 50,
        alternativeCost: 40,
        savedAmount: -10,
        amountSpent: 50,
        comparisonAmount: 40,
        savingImpact: -10,
      },
    );
  });

  it("builds an avoided entry and forces comparison context", () => {
    assert.deepEqual(
      calculateEntryMoney({
        mode: "avoided",
        savingContext: "none",
        amountSpent: 12,
        comparisonAmount: 18,
      }),
      {
        mode: "avoided",
        savingContext: "comparison",
        realCost: 0,
        alternativeCost: 18,
        savedAmount: 18,
        amountSpent: 0,
        comparisonAmount: 18,
        savingImpact: 18,
      },
    );
  });

  it("rejects invalid amounts instead of silently converting them to zero", () => {
    assert.throws(
      () =>
        calculateEntryMoney({
          mode: "spent",
          savingContext: "comparison",
          amountSpent: "abc",
          comparisonAmount: 40,
        }),
      /Invalid entry money value for amountSpent/,
    );
  });
});

describe("parseEntryMoneyInput", () => {
  it("parses comma decimals and rounds to cents", () => {
    assert.deepEqual(parseEntryMoneyInput("12,345"), {
      ok: true,
      value: 12.35,
    });
  });

  it("distinguishes empty, invalid, and negative input", () => {
    assert.deepEqual(parseEntryMoneyInput(""), {
      ok: false,
      reason: "empty",
    });
    assert.deepEqual(parseEntryMoneyInput("abc"), {
      ok: false,
      reason: "invalid",
    });
    assert.deepEqual(parseEntryMoneyInput("-1"), {
      ok: false,
      reason: "negative",
    });
  });

  it("parses thousands-separated amounts in both locale formats", () => {
    // Previously the naive replace(",", ".") turned these into NaN; now they
    // parse like the rest of the app (search, goal target).
    assert.deepEqual(parseEntryMoneyInput("1.234,56"), { ok: true, value: 1234.56 });
    assert.deepEqual(parseEntryMoneyInput("1,234.56"), { ok: true, value: 1234.56 });
  });

  it("accepts the Decimal(10,2) ceiling and rejects anything above it", () => {
    assert.deepEqual(parseEntryMoneyInput("99999999.99"), {
      ok: true,
      value: 99999999.99,
    });
    assert.deepEqual(parseEntryMoneyInput("100000000"), {
      ok: false,
      reason: "too_large",
    });
    assert.deepEqual(parseEntryMoneyInput("1000000000000"), {
      ok: false,
      reason: "too_large",
    });
  });
});

describe("calculateEntrySavedAmount", () => {
  it("calculates positive and negative comparison impact", () => {
    assert.equal(calculateEntrySavedAmount(28, 45), 17);
    assert.equal(calculateEntrySavedAmount(50, 40), -10);
  });

  it("rejects invalid inputs", () => {
    assert.throws(
      () => calculateEntrySavedAmount("nope", 40),
      /Invalid entry money value for realCost/,
    );
  });
});

describe("toEntryMoneyView", () => {
  it("prefers explicit mode and saving context over legacy inference", () => {
    assert.deepEqual(
      toEntryMoneyView({
        mode: "spent",
        savingContext: "none",
        realCost: 0,
        alternativeCost: 18,
        savedAmount: 18,
      }),
      {
        mode: "spent",
        savingContext: "none",
        realCost: 0,
        alternativeCost: 18,
        savedAmount: 18,
        amountSpent: 0,
        comparisonAmount: 18,
        savingImpact: 18,
      },
    );
  });

  it("maps legacy entry fields to v2 money names", () => {
    assert.deepEqual(
      toEntryMoneyView({
        realCost: "28",
        alternativeCost: "45",
        savedAmount: "17",
      }),
      {
        mode: "spent",
        savingContext: "comparison",
        realCost: 28,
        alternativeCost: 45,
        savedAmount: 17,
        amountSpent: 28,
        comparisonAmount: 45,
        savingImpact: 17,
      },
    );
  });
});

describe("entry helpers", () => {
  it("detects avoided entries", () => {
    assert.equal(
      isAvoidedEntry({
        realCost: 0,
        alternativeCost: 18,
        savedAmount: 18,
      }),
      true,
    );
  });

  it("detects compared entries", () => {
    assert.equal(
      isComparedEntry({
        realCost: 50,
        alternativeCost: 40,
        savedAmount: -10,
      }),
      true,
    );
  });
});
