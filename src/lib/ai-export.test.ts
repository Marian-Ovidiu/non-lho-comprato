import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAiExpenseExportRow, type AiExpenseExportEntry } from "@/src/lib/ai-export";

function createEntry(
  overrides: Partial<AiExpenseExportEntry>,
): AiExpenseExportEntry {
  return {
    id: "entry-1",
    createdAt: new Date("2026-06-10T08:00:00.000Z"),
    updatedAt: new Date("2026-06-10T09:00:00.000Z"),
    date: new Date("2026-06-10T00:00:00.000Z"),
    title: "Test entry",
    note: null,
    source: "manual",
    person: "personal",
    realCost: 0,
    alternativeCost: 0,
    savedAmount: 0,
    category: {
      name: "Food",
    },
    habitOccurrence: null,
    ...overrides,
  };
}

describe("buildAiExpenseExportRow", () => {
  it("exports a normal spent entry without savings", () => {
    const row = buildAiExpenseExportRow(
      createEntry({
        realCost: 12,
        alternativeCost: 12,
        savedAmount: 0,
      }),
      "Workspace",
    );

    assert.equal(row.mode, "spent");
    assert.equal(row.savingContext, "none");
    assert.equal(row.savingImpact, "0.00");
  });

  it("exports a legacy avoided entry using savedAmount", () => {
    const row = buildAiExpenseExportRow(
      createEntry({
        realCost: 0,
        alternativeCost: 18,
        savedAmount: 18,
      }),
      "Workspace",
    );

    assert.equal(row.mode, "avoided");
    assert.equal(row.savingContext, "comparison");
    assert.equal(row.savingImpact, "18.00");
  });

  it("exports a negative comparison impact for spent entries", () => {
    const row = buildAiExpenseExportRow(
      createEntry({
        realCost: 50,
        alternativeCost: 40,
        savedAmount: -10,
      }),
      "Workspace",
    );

    assert.equal(row.mode, "spent");
    assert.equal(row.savingContext, "comparison");
    assert.equal(row.savingImpact, "-10.00");
  });
});
