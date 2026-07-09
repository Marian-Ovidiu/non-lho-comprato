import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countCalendarMonthsInclusive,
  countDayOfMonthOccurrences,
  getDateKey,
  isDateKey,
  parseWorkspaceDateKey,
  reanchorDateToTimezone,
} from "@/src/lib/workspace-dates";

const ROME = "Europe/Rome";
const NEW_YORK = "America/New_York";

describe("reanchorDateToTimezone", () => {
  const canonicalRome = parseWorkspaceDateKey("2026-01-15", ROME)!;
  // Legacy rows (pre-normalization) stored UTC midnight instead of local.
  const legacyUtcMidnight = new Date("2026-01-15T00:00:00.000Z");

  it("is a no-op for a canonical value that stays in the same timezone", () => {
    const result = reanchorDateToTimezone(canonicalRome, ROME, ROME);
    assert.equal(result?.getTime(), canonicalRome.getTime());
  });

  it("canonicalizes a legacy UTC-midnight row to the same local day", () => {
    const result = reanchorDateToTimezone(legacyUtcMidnight, ROME, ROME);
    assert.equal(getDateKey(result!, ROME), "2026-01-15");
    assert.equal(result?.getTime(), canonicalRome.getTime());
  });

  it("preserves the calendar day when moving to a negative-offset timezone", () => {
    const canonical = reanchorDateToTimezone(canonicalRome, ROME, NEW_YORK);
    const legacy = reanchorDateToTimezone(legacyUtcMidnight, ROME, NEW_YORK);

    // Both must still read as Jan 15 in New York (a naive re-bucket would push
    // the legacy row back to Jan 14).
    assert.equal(getDateKey(canonical!, NEW_YORK), "2026-01-15");
    assert.equal(getDateKey(legacy!, NEW_YORK), "2026-01-15");
    // And the result is the canonical New York midnight of that day.
    assert.equal(canonical?.getTime(), parseWorkspaceDateKey("2026-01-15", NEW_YORK)!.getTime());
    assert.equal(legacy?.getTime(), parseWorkspaceDateKey("2026-01-15", NEW_YORK)!.getTime());
  });
});

describe("isDateKey", () => {
  it("accepts calendar-day keys as sent by <input type=\"date\">", () => {
    assert.equal(isDateKey("2026-06-15"), true);
    assert.equal(isDateKey("2026-02-28"), true);
    assert.equal(isDateKey("2028-02-29"), true);
  });

  it("rejects everything that is not a valid day key", () => {
    assert.equal(isDateKey(""), false);
    assert.equal(isDateKey("banana"), false);
    assert.equal(isDateKey("15/06/2026"), false);
    assert.equal(isDateKey("2026-6-15"), false);
    assert.equal(isDateKey("2026-13-01"), false);
    assert.equal(isDateKey("2026-02-30"), false);
    assert.equal(isDateKey("2026-06-15T10:00"), false);
    assert.equal(isDateKey("2026-06-15T00:00:00.000Z"), false);
  });
});

describe("parseWorkspaceDateKey", () => {
  it("anchors the day to workspace-local midnight, not UTC midnight", () => {
    assert.equal(
      parseWorkspaceDateKey("2026-06-15", "Europe/Rome")?.toISOString(),
      "2026-06-14T22:00:00.000Z",
    );
    assert.equal(
      parseWorkspaceDateKey("2026-06-15", "America/New_York")?.toISOString(),
      "2026-06-15T04:00:00.000Z",
    );
    assert.equal(
      parseWorkspaceDateKey("2026-06-15", "UTC")?.toISOString(),
      "2026-06-15T00:00:00.000Z",
    );
  });

  it("follows the DST offset of the chosen day", () => {
    assert.equal(
      parseWorkspaceDateKey("2026-01-15", "Europe/Rome")?.toISOString(),
      "2026-01-14T23:00:00.000Z",
    );
    assert.equal(
      parseWorkspaceDateKey("2026-07-15", "Europe/Rome")?.toISOString(),
      "2026-07-14T22:00:00.000Z",
    );
  });

  it("round-trips with getDateKey for every supported offset direction", () => {
    const timeZones = [
      "Europe/Rome",
      "America/Los_Angeles",
      "Asia/Tokyo",
      "Pacific/Auckland",
      "UTC",
    ];
    const dateKeys = [
      "2026-01-01",
      "2026-03-29",
      "2026-06-30",
      "2026-10-25",
      "2026-12-31",
    ];

    for (const timeZone of timeZones) {
      for (const dateKey of dateKeys) {
        const instant = parseWorkspaceDateKey(dateKey, timeZone);
        assert.ok(instant, `${dateKey} in ${timeZone} should parse`);
        assert.equal(
          getDateKey(instant, timeZone),
          dateKey,
          `${dateKey} should round-trip in ${timeZone}`,
        );
      }
    }
  });

  it("returns null for invalid keys", () => {
    assert.equal(parseWorkspaceDateKey("", "Europe/Rome"), null);
    assert.equal(parseWorkspaceDateKey("2026-02-30", "Europe/Rome"), null);
    assert.equal(
      parseWorkspaceDateKey("2026-06-15T10:00", "Europe/Rome"),
      null,
    );
  });
});

describe("countDayOfMonthOccurrences", () => {
  it("counts one occurrence per month in a full window", () => {
    assert.equal(countDayOfMonthOccurrences("2025-07-01", "2026-07-02", 2), 12);
  });

  it("excludes the end date and includes the start date", () => {
    assert.equal(countDayOfMonthOccurrences("2026-06-15", "2026-07-15", 15), 1);
    assert.equal(countDayOfMonthOccurrences("2026-07-15", "2026-07-15", 15), 0);
  });

  it("skips months that do not contain the day", () => {
    // Only January, March, May, July, August, October, December have day 31.
    assert.equal(countDayOfMonthOccurrences("2026-01-01", "2027-01-01", 31), 7);
    assert.equal(countDayOfMonthOccurrences("2026-02-01", "2026-03-01", 30), 0);
  });

  it("counts leap-day occurrences only in leap years", () => {
    // 2027: 11 months with a day 29 (February has 28); 2028: all 12 (leap).
    assert.equal(countDayOfMonthOccurrences("2027-01-01", "2029-01-01", 29), 23);
    assert.equal(countDayOfMonthOccurrences("2028-02-01", "2028-03-01", 29), 1);
    assert.equal(countDayOfMonthOccurrences("2027-02-01", "2027-03-01", 29), 0);
  });

  it("returns zero for invalid input", () => {
    assert.equal(countDayOfMonthOccurrences("banana", "2026-07-01", 5), 0);
    assert.equal(countDayOfMonthOccurrences("2026-01-01", "2026-07-01", 0), 0);
    assert.equal(countDayOfMonthOccurrences("2026-01-01", "2026-07-01", 32), 0);
  });
});

describe("countCalendarMonthsInclusive", () => {
  it("counts both endpoints", () => {
    assert.equal(countCalendarMonthsInclusive("2026-01", "2026-07"), 7);
    assert.equal(countCalendarMonthsInclusive("2026-07", "2026-07"), 1);
  });

  it("spans year boundaries", () => {
    assert.equal(countCalendarMonthsInclusive("2025-12", "2026-01"), 2);
    assert.equal(countCalendarMonthsInclusive("2024-11", "2026-02"), 16);
  });

  it("returns zero for reversed ranges or invalid keys", () => {
    assert.equal(countCalendarMonthsInclusive("2026-07", "2026-01"), 0);
    assert.equal(countCalendarMonthsInclusive("banana", "2026-07"), 0);
    assert.equal(countCalendarMonthsInclusive("2026-01", "2026-13"), 0);
  });
});
