import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getRomeDateKey, getRomeMonthKey } from "@/src/lib/rome-dates";

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
