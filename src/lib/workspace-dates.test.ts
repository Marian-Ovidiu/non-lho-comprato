import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getDateKey,
  isDateKey,
  parseWorkspaceDateKey,
} from "@/src/lib/workspace-dates";

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
