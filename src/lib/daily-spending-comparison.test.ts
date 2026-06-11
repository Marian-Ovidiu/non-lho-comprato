import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildDailySpendingComparison } from "@/src/lib/daily-spending-comparison";

function romeDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function getDay(
  comparison: ReturnType<typeof buildDailySpendingComparison>,
  month: "current" | "previous",
  day: number,
) {
  const row =
    month === "current" ? comparison.currentMonth : comparison.previousMonth;
  assert.ok(row, `Expected ${month} month row to exist`);
  return row.days.find((cell) => cell.day === day);
}

describe("buildDailySpendingComparison", () => {
  it("sums multiple entries on the same day", () => {
    const now = romeDate(2026, 6, 8);
    const comparison = buildDailySpendingComparison(
      [
        { date: romeDate(2026, 6, 7), realCost: 10 },
        { date: romeDate(2026, 6, 7), realCost: 17 },
      ],
      now,
    );

    const day7 = getDay(comparison, "current", 7);
    assert.equal(day7?.totalRealSpent, 27);
    assert.equal(day7?.entriesCount, 2);
  });

  it("compares the same day across May and June", () => {
    const now = romeDate(2026, 6, 8);
    const comparison = buildDailySpendingComparison(
      [
        { date: romeDate(2026, 5, 7), realCost: 27 },
        { date: romeDate(2026, 6, 7), realCost: 30 },
      ],
      now,
    );

    assert.equal(getDay(comparison, "previous", 7)?.totalRealSpent, 27);
    assert.equal(getDay(comparison, "current", 7)?.totalRealSpent, 30);
    assert.ok(comparison.previousMonth);
    assert.equal(comparison.previousMonth.monthKey, "2026-05");
    assert.equal(comparison.currentMonth.monthKey, "2026-06");
  });

  it("marks future days in the current month", () => {
    const now = romeDate(2026, 6, 8);
    const comparison = buildDailySpendingComparison([], now);

    const day8 = getDay(comparison, "current", 8);
    const day9 = getDay(comparison, "current", 9);

    assert.equal(day8?.isToday, true);
    assert.equal(day8?.isFuture, false);
    assert.equal(day9?.isFuture, true);
    assert.equal(day9?.totalRealSpent, 0);
  });

  it("uses null dateKey for days that do not exist in the month", () => {
    const now = romeDate(2026, 3, 10);
    const comparison = buildDailySpendingComparison(
      [{ date: romeDate(2026, 2, 28), realCost: 15 }],
      now,
    );

    assert.ok(comparison.previousMonth);
    const day29 = getDay(comparison, "previous", 29);
    const day31 = getDay(comparison, "previous", 31);

    assert.equal(day29?.dateKey, null);
    assert.equal(day31?.dateKey, null);
    assert.equal(getDay(comparison, "previous", 28)?.dateKey, "2026-02-28");
  });

  it("returns zeros and no previous month when there are no entries", () => {
    const now = romeDate(2026, 6, 8);
    const comparison = buildDailySpendingComparison([], now);

    assert.equal(comparison.previousMonth, null);
    assert.equal(comparison.currentMonth.totalRealSpent, 0);
    assert.equal(comparison.maxDailySpent, 1);
    assert.equal(comparison.monthToDateDelta, null);
    assert.equal(comparison.currentMonth.days.length, 31);
  });

  it("populates previous month when only previous-month entries exist", () => {
    const now = romeDate(2026, 6, 8);
    const comparison = buildDailySpendingComparison(
      [{ date: romeDate(2026, 5, 3), realCost: 42 }],
      now,
    );

    assert.ok(comparison.previousMonth);
    assert.equal(comparison.previousMonth.totalRealSpent, 42);
    assert.equal(comparison.currentMonth.totalRealSpent, 0);
    assert.equal(getDay(comparison, "previous", 3)?.totalRealSpent, 42);
  });

  it("computes monthToDateDelta using partial month totals", () => {
    const now = romeDate(2026, 6, 8);
    const comparison = buildDailySpendingComparison(
      [
        { date: romeDate(2026, 5, 1), realCost: 10 },
        { date: romeDate(2026, 5, 7), realCost: 20 },
        { date: romeDate(2026, 5, 20), realCost: 100 },
        { date: romeDate(2026, 6, 1), realCost: 15 },
        { date: romeDate(2026, 6, 7), realCost: 25 },
      ],
      now,
    );

    assert.equal(comparison.monthToDateDelta, 10);
  });

  it("can build the comparison for a selected past month", () => {
    const now = romeDate(2026, 6, 8);
    const comparison = buildDailySpendingComparison(
      [
        { date: romeDate(2026, 4, 12), realCost: 18 },
        { date: romeDate(2026, 5, 12), realCost: 30 },
      ],
      now,
      "2026-05",
    );

    assert.equal(comparison.currentMonth.monthKey, "2026-05");
    assert.equal(comparison.previousMonth?.monthKey, "2026-04");
    assert.equal(getDay(comparison, "current", 31)?.isFuture, false);
    assert.equal(getDay(comparison, "current", 12)?.totalRealSpent, 30);
    assert.equal(getDay(comparison, "previous", 12)?.totalRealSpent, 18);
    assert.equal(comparison.monthToDateDelta, 12);
  });
});
