import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ImportedTransactionDraft } from "@/src/lib/imports/import-domain";
import {
  buildRawTransactionPayload,
  countTransactionStatuses,
  mapTransactionUpdatePayload,
  normalizeTransactionAmount,
  resolveCategoryIdForConfirmation,
  type ImportedTransactionRecord,
} from "@/src/lib/imports/transaction-payload";

function record(
  overrides: Partial<ImportedTransactionRecord> = {},
): ImportedTransactionRecord {
  return {
    id: "tx-1",
    workspaceId: "workspace-1",
    importBatchId: "batch-1",
    source: "bank_csv",
    sourceRowIndex: 0,
    externalId: null,
    fingerprint: "fp",
    date: null,
    description: "Spesa",
    merchantName: null,
    amount: "12.50",
    currency: "EUR",
    flow: "outgoing" as const,
    status: "pending",
    categoryIdSuggested: null,
    categoryIdConfirmed: null,
    entryId: null,
    incomeId: null,
    transferId: null,
    duplicateOfId: null,
    rawJson: null,
    errorMessage: null,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  };
}

function draft(
  overrides: Partial<ImportedTransactionDraft> = {},
): ImportedTransactionDraft {
  return {
    sourceRowIndex: 0,
    date: new Date("2026-07-01T00:00:00.000Z"),
    description: "Spesa",
    merchantName: null,
    amount: 12.5,
    currency: "EUR",
    flow: "outgoing" as const,
    raw: { descrizione: "Spesa" },
    status: "pending",
    ...overrides,
  };
}

describe("countTransactionStatuses", () => {
  it("counts every status and excludes errors from parsedCount", () => {
    const counts = countTransactionStatuses([
      record({ status: "pending" }),
      record({ status: "confirmed" }),
      record({ status: "ignored" }),
      record({ status: "duplicate" }),
      record({ status: "error" }),
      record({ status: "error" }),
    ]);

    assert.deepEqual(counts, {
      rowCount: 6,
      parsedCount: 4,
      confirmed: 1,
      ignored: 1,
      duplicate: 1,
      pending: 1,
      error: 2,
    });
  });
});

describe("normalizeTransactionAmount", () => {
  it("takes the absolute value of DB decimal strings and numbers", () => {
    assert.equal(normalizeTransactionAmount("12.50"), 12.5);
    assert.equal(normalizeTransactionAmount("-12.50"), 12.5);
    assert.equal(normalizeTransactionAmount(-3), 3);
    assert.equal(normalizeTransactionAmount("7,25"), 7.25);
  });

  it("falls back to zero on garbage", () => {
    assert.equal(normalizeTransactionAmount("abc"), 0);
    assert.equal(normalizeTransactionAmount(null), 0);
    assert.equal(normalizeTransactionAmount(Number.NaN), 0);
  });
});

describe("buildRawTransactionPayload", () => {
  it("builds a pending placeholder with a raw fingerprint", () => {
    const payload = buildRawTransactionPayload("batch-1", "workspace-1", 4, {
      descrizione: "Spesa",
    });

    assert.equal(payload.fingerprint, "raw:batch-1:4");
    assert.equal(payload.status, "pending");
    assert.equal(payload.importBatchId, "batch-1");
    assert.equal(payload.workspaceId, "workspace-1");
    assert.equal(payload.sourceRowIndex, 4);
    assert.equal(payload.amount, null);
  });
});

describe("mapTransactionUpdatePayload", () => {
  it("keeps the draft status when there is no duplicate", () => {
    const payload = mapTransactionUpdatePayload(draft(), "fp-1", null, "cat-1");

    assert.equal(payload.status, "pending");
    assert.equal(payload.fingerprint, "fp-1");
    assert.equal(payload.categoryIdSuggested, "cat-1");
    assert.equal(payload.amount, "12.50");
    assert.equal(payload.duplicateOfId, null);
  });

  it("marks duplicates but never downgrades an error", () => {
    assert.equal(
      mapTransactionUpdatePayload(draft(), "fp", "tx-0", null).status,
      "duplicate",
    );
    assert.equal(
      mapTransactionUpdatePayload(
        draft({ status: "error", errorMessage: "boom" }),
        "fp",
        "tx-0",
        null,
      ).status,
      "error",
    );
  });

  it("serializes a null amount as null", () => {
    const payload = mapTransactionUpdatePayload(
      draft({ amount: null }),
      "fp",
      null,
      null,
    );

    assert.equal(payload.amount, null);
  });
});

describe("resolveCategoryIdForConfirmation", () => {
  it("prefers the confirmed category, then the default, then null", () => {
    assert.equal(
      resolveCategoryIdForConfirmation(
        record({ categoryIdConfirmed: "cat-confirmed" }),
        "cat-default",
      ),
      "cat-confirmed",
    );
    assert.equal(
      resolveCategoryIdForConfirmation(record(), "cat-default"),
      "cat-default",
    );
    assert.equal(resolveCategoryIdForConfirmation(record(), ""), null);
  });
});
