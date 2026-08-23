import { round2 } from "@/src/lib/money-number";
export type CsvImportDateFormat = "DD/MM/YYYY" | "YYYY-MM-DD" | "MM/DD/YYYY";

export type CsvImportAmountConvention =
  | "negative_is_expense"
  | "positive_is_expense";

export type CsvImportColumnMapping = {
  date: string;
  description: string;
  amount: string;
  currency?: string | null;
  merchantName?: string | null;
  dateFormat: CsvImportDateFormat;
  amountConvention: CsvImportAmountConvention;
};

export type ImportedTransactionDraftStatus =
  | "pending"
  | "ignored"
  | "error";

export type CsvImportRow = Record<string, string>;

export type CsvImportParsedRow = {
  sourceRowIndex: number;
  values: CsvImportRow;
};

export type ImportedTransactionFlowValue = "outgoing" | "incoming";

export type ImportedTransactionDraft = {
  sourceRowIndex: number;
  date: Date | null;
  description: string;
  merchantName: string | null;
  /** Sempre positivo. Il verso lo dice `flow`, non il segno. */
  amount: number | null;
  currency: string;
  raw: CsvImportRow;
  /**
   * Da che parte vanno i soldi, deciso dal segno letto nel CSV e dalla
   * convenzione dichiarata nella mappatura. Va registrato qui perché l'importo
   * viene salvato in valore assoluto: dopo, il segno non c'è più.
   */
  flow: ImportedTransactionFlowValue;
  status: ImportedTransactionDraftStatus;
  errorMessage?: string;
};

export function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeImportCurrency(
  currency?: string | null,
  fallback = "EUR",
): string {
  const normalized = (currency ?? "").trim().toUpperCase();

  if (!normalized) {
    return fallback;
  }

  if (normalized === "€") {
    return "EUR";
  }

  if (/^[A-Z]{3}$/u.test(normalized)) {
    return normalized;
  }

  return fallback;
}

export function normalizeImportDescription(description: string): string {
  return description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function parseImportDate(
  value: string,
  format: CsvImportDateFormat,
): Date | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const matchers: Record<
    CsvImportDateFormat,
    RegExp
  > = {
    "DD/MM/YYYY": /^(\d{2})[/-](\d{2})[/-](\d{4})$/u,
    "YYYY-MM-DD": /^(\d{4})[/-](\d{2})[/-](\d{2})$/u,
    "MM/DD/YYYY": /^(\d{2})[/-](\d{2})[/-](\d{4})$/u,
  };

  const match = trimmed.match(matchers[format]);

  if (!match) {
    return null;
  }

  let year: number;
  let month: number;
  let day: number;

  if (format === "YYYY-MM-DD") {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else if (format === "MM/DD/YYYY") {
    month = Number(match[1]);
    day = Number(match[2]);
    year = Number(match[3]);
  } else {
    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3]);
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function normalizeSingleSeparatorAmount(
  value: string,
  separator: "," | ".",
): string | null {
  const parts = value.split(separator);

  if (parts.length === 1) {
    return value;
  }

  const first = parts[0] ?? "";
  const last = parts.at(-1) ?? "";
  const middle = parts.slice(1, -1);

  if (middle.length === 0) {
    if (/^\d{1,2}$/.test(last)) {
      return `${first}.${last}`;
    }

    if (/^\d{3}$/.test(last)) {
      return `${first}${last}`;
    }

    return `${first}.${last}`;
  }

  if (parts.every((part, index) => index === 0 || /^\d{3}$/.test(part))) {
    return parts.join("");
  }

  return `${first}${middle.join("")}.${last}`;
}

export function parseImportAmount(value: string): number | null {
  const cleaned = value
    .replace(/[\u00A0\s€]/gu, "")
    .replace(/[^\d,.\-+]/gu, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  const sign = cleaned.startsWith("-") ? -1 : 1;
  const unsigned = cleaned.replace(/^[+-]/u, "");

  const commaCount = (unsigned.match(/,/gu) ?? []).length;
  const dotCount = (unsigned.match(/\./gu) ?? []).length;

  let normalized = unsigned;

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = unsigned.lastIndexOf(",");
    const lastDot = unsigned.lastIndexOf(".");
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    const thousandsPattern =
      thousandsSeparator === "," ? /,/gu : /\./gu;
    normalized = unsigned.replace(thousandsPattern, "").replace(decimalSeparator, ".");
  } else if (commaCount > 0) {
    const formatted = normalizeSingleSeparatorAmount(unsigned, ",");
    if (!formatted) {
      return null;
    }
    normalized = formatted;
  } else if (dotCount > 0) {
    const formatted = normalizeSingleSeparatorAmount(unsigned, ".");
    if (!formatted) {
      return null;
    }
    normalized = formatted;
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return round2(amount * sign);
}
