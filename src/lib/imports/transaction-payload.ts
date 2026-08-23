import type { Prisma } from "@/src/lib/generated/prisma/client";

import { calculateEntryMoney } from "@/src/lib/entry-domain";
import {
  decryptJsonValue,
  decryptOptionalText,
  encryptJsonValue,
  encryptOptionalText,
} from "@/src/lib/field-encryption";
import type {
  CsvImportRow,
  ImportedTransactionDraft,
  ImportedTransactionFlowValue,
} from "@/src/lib/imports/import-domain";
import { toMoneyNumber } from "@/src/lib/money-number";

export type ImportedTransactionStatus =
  | "pending"
  | "confirmed"
  | "ignored"
  | "duplicate"
  | "error";

export type ImportedTransactionRecord = {
  id: string;
  workspaceId: string;
  importBatchId: string;
  source: "bank_csv";
  sourceRowIndex: number;
  externalId: string | null;
  fingerprint: string;
  date: Date | null;
  description: string;
  merchantName: string | null;
  amount: Prisma.Decimal | string | number | null;
  currency: string | null;
  flow: ImportedTransactionFlowValue;
  status: ImportedTransactionStatus;
  categoryIdSuggested: string | null;
  categoryIdConfirmed: string | null;
  entryId: string | null;
  incomeId: string | null;
  transferId: string | null;
  duplicateOfId: string | null;
  rawJson: Prisma.JsonValue | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toDecimalString(value: number): string {
  return value.toFixed(2);
}

export function countTransactionStatuses(
  transactions: ImportedTransactionRecord[],
) {
  return transactions.reduce(
    (acc, transaction) => {
      acc.rowCount += 1;
      acc.parsedCount += transaction.status === "error" ? 0 : 1;
      acc.confirmed += transaction.status === "confirmed" ? 1 : 0;
      acc.ignored += transaction.status === "ignored" ? 1 : 0;
      acc.duplicate += transaction.status === "duplicate" ? 1 : 0;
      acc.pending += transaction.status === "pending" ? 1 : 0;
      acc.error += transaction.status === "error" ? 1 : 0;
      return acc;
    },
    {
      rowCount: 0,
      parsedCount: 0,
      confirmed: 0,
      ignored: 0,
      duplicate: 0,
      pending: 0,
      error: 0,
    },
  );
}

export function decryptImportedTransactionRecord(
  transaction: ImportedTransactionRecord,
): ImportedTransactionRecord {
  return {
    ...transaction,
    description: decryptOptionalText(transaction.description) ?? "",
    merchantName: decryptOptionalText(transaction.merchantName),
    rawJson: decryptJsonValue<Prisma.JsonValue>(transaction.rawJson),
  };
}

export function decryptImportedTransactionRecords(
  transactions: ImportedTransactionRecord[],
): ImportedTransactionRecord[] {
  return transactions.map(decryptImportedTransactionRecord);
}

export function buildRawTransactionPayload(
  batchId: string,
  workspaceId: string,
  sourceRowIndex: number,
  rawJson: CsvImportRow,
): Record<string, unknown> {
  return {
    workspaceId,
    importBatchId: batchId,
    source: "bank_csv",
    sourceRowIndex,
    externalId: null,
    fingerprint: `raw:${batchId}:${sourceRowIndex}`,
    date: null,
    description: "",
    merchantName: null,
    amount: null,
    currency: null,
    status: "pending",
    categoryIdSuggested: null,
    categoryIdConfirmed: null,
    entryId: null,
    duplicateOfId: null,
    rawJson: encryptJsonValue(rawJson),
    errorMessage: null,
  };
}

/// Amounts arrive here as DB decimal strings or numbers; the sign is dropped
/// because imported bank rows are always recorded as spending.
export function normalizeTransactionAmount(value: unknown): number {
  return Math.abs(toMoneyNumber(value));
}

export function buildEntryMoney(amount: unknown) {
  const normalized = normalizeTransactionAmount(amount);
  return calculateEntryMoney({
    mode: "spent",
    savingContext: "none",
    amountSpent: normalized,
  });
}

export function mapTransactionUpdatePayload(
  draft: ImportedTransactionDraft,
  fingerprint: string,
  duplicateOfId: string | null,
  categoryIdSuggested: string | null,
): Record<string, unknown> {
  return {
    date: draft.date,
    description: encryptOptionalText(draft.description) ?? "",
    merchantName: encryptOptionalText(draft.merchantName),
    amount: draft.amount === null ? null : toDecimalString(draft.amount),
    currency: draft.currency,
    /* Il verso va scritto qui perche' l'importo qui sopra e' gia' assoluto:
       superato questo punto, il segno letto nel CSV non esiste piu'. */
    flow: draft.flow,
    categoryIdSuggested,
    status:
      draft.status === "error"
        ? "error"
        : duplicateOfId
          ? "duplicate"
          : draft.status,
    fingerprint,
    duplicateOfId,
    errorMessage: draft.errorMessage ?? null,
    rawJson: encryptJsonValue(draft.raw),
  };
}

export function resolveCategoryIdForConfirmation(
  transaction: ImportedTransactionRecord,
  defaultCategoryId: string,
): string | null {
  return transaction.categoryIdConfirmed || defaultCategoryId || null;
}
