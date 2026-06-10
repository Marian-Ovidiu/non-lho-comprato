import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatRomeMonthLabel,
  getPreviousRomeMonthKey,
  getRomeDateKey,
  getRomeDayRangeForDateKey,
  getRomeIsoWeekday,
  getRomeMonthKey,
  getRomeMonthRangeForMonthKey,
  getRomeTodayDateKey,
  normalizeRomeMonthKey,
} from "@/src/lib/rome-dates";

describe("getRomeMonthKey", () => {
  it("derives the month key from the Rome date key", () => {
    const date = new Date(Date.UTC(2026, 5, 7, 12, 0, 0));

    assert.equal(getRomeDateKey(date), "2026-06-07");
    assert.equal(getRomeMonthKey(date), "2026-06");
  });

  it("assigns late UTC June to July when Rome is already in the next month", () => {
    const date = new Date(Date.UTC(2026, 5, 30, 22, 0, 0));

    assert.equal(getRomeDateKey(date), "2026-07-01");
    assert.equal(getRomeMonthKey(date), "2026-07");
  });

  it("keeps late UTC January in January when Rome is still on the same day", () => {
    const date = new Date(Date.UTC(2026, 0, 31, 22, 59, 0));

    assert.equal(getRomeDateKey(date), "2026-01-31");
    assert.equal(getRomeMonthKey(date), "2026-01");
  });

  it("assigns late UTC January to February when Rome crosses midnight", () => {
    const date = new Date(Date.UTC(2026, 0, 31, 23, 0, 0));

    assert.equal(getRomeDateKey(date), "2026-02-01");
    assert.equal(getRomeMonthKey(date), "2026-02");
  });
});

describe("Rome date-only helpers", () => {
  it("uses the Rome date for today keys near UTC month boundaries", () => {
    const date = new Date("2026-06-30T22:30:00.000Z");

    assert.equal(getRomeTodayDateKey(date), "2026-07-01");
    assert.equal(normalizeRomeMonthKey(undefined, date), "2026-07");
  });

  it("builds Rome month ranges using Rome midnight UTC boundaries", () => {
    const range = getRomeMonthRangeForMonthKey("2026-07");

    assert.equal(range.start.toISOString(), "2026-06-30T22:00:00.000Z");
    assert.equal(range.end.toISOString(), "2026-07-31T22:00:00.000Z");
  });

  it("builds DST-safe Rome day ranges", () => {
    const springForward = getRomeDayRangeForDateKey("2026-03-29");
    const fallBack = getRomeDayRangeForDateKey("2026-10-25");

    assert.equal(springForward.start.toISOString(), "2026-03-28T23:00:00.000Z");
    assert.equal(springForward.end.toISOString(), "2026-03-29T22:00:00.000Z");
    assert.equal(fallBack.start.toISOString(), "2026-10-24T22:00:00.000Z");
    assert.equal(fallBack.end.toISOString(), "2026-10-25T23:00:00.000Z");
  });

  it("derives previous month and labels from date-only month keys", () => {
    assert.equal(getPreviousRomeMonthKey("2026-01"), "2025-12");
    assert.equal(formatRomeMonthLabel("2026-07"), "Luglio 2026");
  });

  it("calculates ISO weekdays from the Rome calendar day", () => {
    const lateSundayUtc = new Date("2026-06-07T22:30:00.000Z");

    assert.equal(getRomeDateKey(lateSundayUtc), "2026-06-08");
    assert.equal(getRomeIsoWeekday(lateSundayUtc), 1);
  });
});
