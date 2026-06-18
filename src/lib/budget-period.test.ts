import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getBudgetElapsedFraction,
  getBudgetPeriodRange,
} from "@/src/lib/budget-period";

describe("getBudgetPeriodRange", () => {
  it("builds the monthly range in Europe/Rome", () => {
    const range = getBudgetPeriodRange(
      "monthly",
      "Europe/Rome",
      new Date("2026-07-15T12:00:00.000Z"),
    );

    assert.equal(range.start.toISOString(), "2026-06-30T22:00:00.000Z");
    assert.equal(range.end.toISOString(), "2026-07-31T22:00:00.000Z");
  });

  it("builds the weekly Monday-to-Monday range in Europe/Rome", () => {
    const range = getBudgetPeriodRange(
      "weekly",
      "Europe/Rome",
      new Date("2026-06-10T12:00:00.000Z"),
    );

    assert.equal(range.start.toISOString(), "2026-06-07T22:00:00.000Z");
    assert.equal(range.end.toISOString(), "2026-06-14T22:00:00.000Z");
  });
});

describe("getBudgetElapsedFraction", () => {
  it("returns zero at the start of the period without NaN or Infinity", () => {
    const start = new Date("2026-06-30T22:00:00.000Z");
    const end = new Date("2026-07-31T22:00:00.000Z");
    const fraction = getBudgetElapsedFraction(start, end, start);

    assert.equal(fraction, 0);
    assert.equal(Number.isNaN(fraction), false);
    assert.equal(Number.isFinite(fraction), true);
  });
});
