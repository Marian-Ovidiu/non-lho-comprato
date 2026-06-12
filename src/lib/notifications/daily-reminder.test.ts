import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getRomeNowMinutes, isAfterReminderHour } from "@/src/lib/notifications/daily-reminder";

// Europe/Rome offsets:
//   CET  (winter): UTC+1
//   CEST (summer): UTC+2
//
// These tests use noon UTC to avoid day-boundary ambiguity.

describe("getRomeNowMinutes", () => {
  it("converts a summer UTC time to Rome CEST minutes", () => {
    // June 12 10:00 UTC → 12:00 Rome (CEST = UTC+2) → 720 minutes
    const date = new Date(Date.UTC(2026, 5, 12, 10, 0, 0));
    assert.equal(getRomeNowMinutes(date), 720);
  });

  it("converts a winter UTC time to Rome CET minutes", () => {
    // Jan 12 10:00 UTC → 11:00 Rome (CET = UTC+1) → 660 minutes
    const date = new Date(Date.UTC(2026, 0, 12, 10, 0, 0));
    assert.equal(getRomeNowMinutes(date), 660);
  });

  it("handles Rome midnight (00:00 Rome = 22:00 UTC previous day in summer)", () => {
    // June 11 22:00 UTC → June 12 00:00 Rome (CEST) → 0 minutes
    const date = new Date(Date.UTC(2026, 5, 11, 22, 0, 0));
    assert.equal(getRomeNowMinutes(date), 0);
  });

  it("handles minutes component correctly", () => {
    // June 12 10:30 UTC → 12:30 Rome (CEST) → 750 minutes
    const date = new Date(Date.UTC(2026, 5, 12, 10, 30, 0));
    assert.equal(getRomeNowMinutes(date), 750);
  });
});

describe("isAfterReminderHour (default 18:00 Rome)", () => {
  it("returns true when Rome time is after 18:00", () => {
    // June 12: CEST = UTC+2. 17:01 UTC → 19:01 Rome → after 18:00
    const date = new Date(Date.UTC(2026, 5, 12, 17, 1, 0));
    assert.equal(isAfterReminderHour(date), true);
  });

  it("returns false when Rome time is before 18:00", () => {
    // June 12: 15:00 UTC → 17:00 Rome → before 18:00
    const date = new Date(Date.UTC(2026, 5, 12, 15, 0, 0));
    assert.equal(isAfterReminderHour(date), false);
  });

  it("returns false exactly at 18:00 Rome (strictly after, not equal)", () => {
    // June 12: 16:00 UTC → 18:00 Rome exactly → not strictly after
    const date = new Date(Date.UTC(2026, 5, 12, 16, 0, 0));
    assert.equal(isAfterReminderHour(date), false);
  });

  it("returns true at 18:01 Rome", () => {
    // June 12: 16:01 UTC → 18:01 Rome → strictly after
    const date = new Date(Date.UTC(2026, 5, 12, 16, 1, 0));
    assert.equal(isAfterReminderHour(date), true);
  });

  it("respects CET offset in winter", () => {
    // Jan 12: CET = UTC+1. 17:30 UTC → 18:30 Rome → after 18:00
    const date = new Date(Date.UTC(2026, 0, 12, 17, 30, 0));
    assert.equal(isAfterReminderHour(date), true);
  });

  it("returns false at 16:59 UTC in winter (17:59 Rome, before 18:00)", () => {
    // Jan 12: 16:59 UTC → 17:59 Rome (CET) → before 18:00
    const date = new Date(Date.UTC(2026, 0, 12, 16, 59, 0));
    assert.equal(isAfterReminderHour(date), false);
  });
});
