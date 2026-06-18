import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createImportedTransactionFingerprint } from "@/src/lib/imports/import-fingerprint";

describe("createImportedTransactionFingerprint", () => {
  it("is stable across description spacing and case", () => {
    const first = createImportedTransactionFingerprint({
      date: new Date("2026-06-18T00:00:00.000Z"),
      description: "  Spesa  Supermercato ",
      amount: 12.34,
      currency: "eur",
    });

    const second = createImportedTransactionFingerprint({
      date: new Date("2026-06-18T15:20:00.000Z"),
      description: "spesa supermercato",
      amount: 12.34,
      currency: "EUR",
    });

    assert.equal(first, second);
  });

  it("changes when the amount changes", () => {
    const base = {
      date: new Date("2026-06-18T00:00:00.000Z"),
      description: "Coffee",
      currency: "EUR",
    };

    const first = createImportedTransactionFingerprint({
      ...base,
      amount: 2.5,
    });
    const second = createImportedTransactionFingerprint({
      ...base,
      amount: 2.51,
    });

    assert.notEqual(first, second);
  });
});

