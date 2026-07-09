import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildHabitStatsFromRows,
  type HabitStatsRow,
} from "@/src/features/stats/habit-stats";

function row(overrides: Partial<HabitStatsRow> = {}): HabitStatsRow {
  return {
    habitId: "habit-1",
    habitName: "Caffè al bar",
    categoryName: "Cibo",
    amount: "3.50",
    totalOccurrences: 0,
    spentCount: 0,
    avoidedCount: 0,
    skippedCount: 0,
    pendingCount: 0,
    ...overrides,
  };
}

describe("buildHabitStatsFromRows", () => {
  it("returns an empty list for no rows", () => {
    assert.deepEqual(buildHabitStatsFromRows([]), []);
  });

  it("derives totalSaved from avoided occurrences and the habit amount", () => {
    const [item] = buildHabitStatsFromRows([
      row({
        amount: "3.50",
        totalOccurrences: 10,
        spentCount: 4,
        avoidedCount: 6,
      }),
    ]);

    assert.equal(item.amount, 3.5);
    assert.equal(item.totalSaved, 21); // 6 × 3.50
    assert.equal(item.totalOccurrences, 10);
  });

  it("computes discipline rate as avoided / (avoided + spent)", () => {
    const [item] = buildHabitStatsFromRows([
      row({ totalOccurrences: 5, spentCount: 1, avoidedCount: 3, skippedCount: 1 }),
    ]);

    // 3 / (3 + 1) = 75 %. Skipped/pending do not count toward discipline.
    assert.equal(item.disciplineRatePercent, 75);
  });

  it("reports zero discipline and savings when nothing was considered", () => {
    const [item] = buildHabitStatsFromRows([
      row({ totalOccurrences: 4, skippedCount: 1, pendingCount: 3 }),
    ]);

    assert.equal(item.disciplineRatePercent, 0);
    assert.equal(item.totalSaved, 0);
  });

  it("rounds fractional discipline rates to two decimals", () => {
    const [item] = buildHabitStatsFromRows([
      row({ totalOccurrences: 3, spentCount: 2, avoidedCount: 1 }),
    ]);

    // 1 / 3 = 33.333… → 33.33
    assert.equal(item.disciplineRatePercent, 33.33);
  });

  it("sorts habits by total saved, descending", () => {
    const items = buildHabitStatsFromRows([
      row({ habitId: "small", amount: "1.00", avoidedCount: 2 }), // 2.00
      row({ habitId: "big", amount: "5.00", avoidedCount: 4 }), // 20.00
      row({ habitId: "mid", amount: "2.00", avoidedCount: 3 }), // 6.00
    ]);

    assert.deepEqual(
      items.map((item) => item.habitId),
      ["big", "mid", "small"],
    );
  });
});
