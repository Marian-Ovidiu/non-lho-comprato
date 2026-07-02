import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSavingCategoryInsight,
  buildSpendingCategoryInsight,
  buildSpendingTrendInsight,
  type CategoryStatsItem,
  type MonthlyStatsItem,
  type StatsMonthlyCategoryRow,
} from "@/src/features/stats/insights";

function month(
  key: string,
  overrides: Partial<MonthlyStatsItem> = {},
): MonthlyStatsItem {
  return {
    month: key,
    label: key,
    totalRealSpent: 0,
    totalAlternativeCost: 0,
    totalSaved: 0,
    netImpact: 0,
    avoidedAmount: 0,
    comparisonSaved: 0,
    comparisonOverspent: 0,
    grossPositiveImpact: 0,
    largeComparisonImpact: 0,
    ordinaryImpact: 0,
    entriesCount: 0,
    ...overrides,
  };
}

function categoryRow(
  name: string,
  overrides: Partial<StatsMonthlyCategoryRow> = {},
): StatsMonthlyCategoryRow {
  return {
    categoryName: name,
    categorySlug: name.toLowerCase(),
    totalRealSpent: 0,
    totalAlternativeCost: 0,
    totalSaved: 0,
    entriesCount: 0,
    ...overrides,
  };
}

function categoryStat(
  name: string,
  overrides: Partial<CategoryStatsItem> = {},
): CategoryStatsItem {
  return {
    categoryId: name.toLowerCase(),
    categoryName: name,
    categorySlug: name.toLowerCase(),
    totalRealSpent: 0,
    totalAlternativeCost: 0,
    totalSaved: 0,
    netImpact: 0,
    avoidedAmount: 0,
    comparisonSaved: 0,
    comparisonOverspent: 0,
    grossPositiveImpact: 0,
    entriesCount: 0,
    averageSaved: 0,
    ...overrides,
  };
}

describe("buildSpendingTrendInsight", () => {
  it("needs two months of data", () => {
    const insight = buildSpendingTrendInsight([month("2026-06")]);
    assert.equal(insight.tone, "default");
    assert.match(insight.value, /non ancora disponibile/i);
  });

  it("flags rising spending as a warning", () => {
    const insight = buildSpendingTrendInsight([
      month("2026-05", { totalRealSpent: 100 }),
      month("2026-06", { totalRealSpent: 130 }),
    ]);
    assert.equal(insight.tone, "warning");
    assert.equal(insight.value, "Spesa in salita");
    assert.match(insight.detail, /30,00/);
  });

  it("flags falling spending as a success", () => {
    const insight = buildSpendingTrendInsight([
      month("2026-05", { totalRealSpent: 100 }),
      month("2026-06", { totalRealSpent: 80 }),
    ]);
    assert.equal(insight.tone, "success");
    assert.equal(insight.value, "Spesa in discesa");
  });

  it("reports stable spending", () => {
    const insight = buildSpendingTrendInsight([
      month("2026-05", { totalRealSpent: 100 }),
      month("2026-06", { totalRealSpent: 100 }),
    ]);
    assert.equal(insight.value, "Spesa stabile");
  });
});

describe("buildSavingCategoryInsight", () => {
  it("shows the placeholder without data", () => {
    const insight = buildSavingCategoryInsight([], new Map(), []);
    assert.equal(insight.value, "In costruzione");
  });

  it("picks the top positive category of the latest month with the delta", () => {
    const grouped = new Map([
      [
        "2026-05",
        new Map([["caffe", categoryRow("Caffè", { totalSaved: 10 })]]),
      ],
      [
        "2026-06",
        new Map([
          ["caffe", categoryRow("Caffè", { totalSaved: 25 })],
          ["svago", categoryRow("Svago", { totalSaved: 5 })],
        ]),
      ],
    ]);
    const insight = buildSavingCategoryInsight(
      [month("2026-05"), month("2026-06", { label: "Giu 2026" })],
      grouped,
      [],
    );

    assert.equal(insight.value, "Caffè");
    assert.equal(insight.tone, "success");
    assert.match(insight.detail, /\+15,00.*rispetto al mese scorso/);
  });

  it("reports missing positive data for the latest month", () => {
    const grouped = new Map([
      ["2026-06", new Map([["caffe", categoryRow("Caffè", { totalSaved: 0 })]])],
    ]);
    const insight = buildSavingCategoryInsight(
      [month("2026-06", { label: "Giu 2026" })],
      grouped,
      [],
    );

    assert.equal(insight.value, "Nessun dato positivo");
  });

  it("falls back to the all-time category when the month has no rows", () => {
    const insight = buildSavingCategoryInsight(
      [month("2026-06")],
      new Map(),
      [categoryStat("Delivery", { totalSaved: 40 })],
    );

    assert.equal(insight.value, "Delivery");
  });
});

describe("buildSpendingCategoryInsight", () => {
  it("picks the top spending category of the latest month", () => {
    const grouped = new Map([
      [
        "2026-06",
        new Map([
          ["cibo", categoryRow("Cibo", { totalRealSpent: 200 })],
          ["svago", categoryRow("Svago", { totalRealSpent: 90 })],
        ]),
      ],
    ]);
    const insight = buildSpendingCategoryInsight(
      [month("2026-06", { label: "Giu 2026" })],
      grouped,
      [],
    );

    assert.equal(insight.value, "Cibo");
    assert.equal(insight.tone, "premium");
    assert.match(insight.detail, /200,00.*Giu 2026/);
  });

  it("breaks ties by entry count then name", () => {
    const grouped = new Map([
      [
        "2026-06",
        new Map([
          ["b", categoryRow("Beta", { totalRealSpent: 100, entriesCount: 2 })],
          ["a", categoryRow("Alfa", { totalRealSpent: 100, entriesCount: 2 })],
        ]),
      ],
    ]);
    const insight = buildSpendingCategoryInsight([month("2026-06")], grouped, []);
    assert.equal(insight.value, "Alfa");
  });
});
