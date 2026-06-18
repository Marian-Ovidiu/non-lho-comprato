import { createHash } from "node:crypto";

import {
  normalizeImportCurrency,
  normalizeImportDescription,
} from "@/src/lib/imports/import-domain";

export type ImportedTransactionFingerprintInput = {
  date: Date | string;
  description: string;
  amount: number;
  currency?: string | null;
};

function toUtcDateKey(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

export function createImportedTransactionFingerprint(
  input: ImportedTransactionFingerprintInput,
): string {
  const date =
    input.date instanceof Date ? input.date : new Date(String(input.date));
  const dateKey = Number.isNaN(date.getTime()) ? String(input.date).trim() : toUtcDateKey(date);
  const descriptionKey = normalizeImportDescription(input.description);
  const amountCents = roundToCents(Math.abs(input.amount));
  const currency = normalizeImportCurrency(input.currency);

  return createHash("sha256")
    .update(`${dateKey}|${descriptionKey}|${amountCents}|${currency}`)
    .digest("hex");
}

