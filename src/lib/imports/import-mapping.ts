import type {
  CsvImportAmountConvention,
  CsvImportColumnMapping,
  CsvImportDateFormat,
  CsvImportParsedRow,
  CsvImportRow,
  ImportedTransactionDraft,
  ImportedTransactionDraftStatus,
} from "@/src/lib/imports/import-domain";
import {
  normalizeHeader,
  normalizeImportCurrency,
  parseImportAmount,
  parseImportDate,
} from "@/src/lib/imports/import-domain";

export type CsvImportMappingValidationResult =
  | {
      ok: true;
      errors: Record<string, never>;
    }
  | {
      ok: false;
      errors: Record<string, string>;
    };

export type MapCsvRowToImportedTransactionDraftOptions = {
  sourceRowIndex?: number;
  defaultCurrency?: string;
};

function getRowValues(
  row: CsvImportRow | CsvImportParsedRow,
): { values: CsvImportRow; sourceRowIndex?: number } {
  if (
    typeof row === "object" &&
    row !== null &&
    "values" in row &&
    "sourceRowIndex" in row &&
    typeof row.sourceRowIndex === "number"
  ) {
    const parsedRow = row as CsvImportParsedRow;
    return {
      values: parsedRow.values,
      sourceRowIndex: parsedRow.sourceRowIndex,
    };
  }

  return { values: row as CsvImportRow };
}

function getFieldValue(row: CsvImportRow, field: string | null | undefined): string {
  if (!field) {
    return "";
  }

  return (row[field] ?? "").trim();
}

function isSupportedDateFormat(value: unknown): value is CsvImportDateFormat {
  return (
    value === "DD/MM/YYYY" ||
    value === "YYYY-MM-DD" ||
    value === "MM/DD/YYYY"
  );
}

function isSupportedAmountConvention(
  value: unknown,
): value is CsvImportAmountConvention {
  return value === "negative_is_expense" || value === "positive_is_expense";
}

export function validateCsvImportMapping(
  headers: string[],
  mapping: CsvImportColumnMapping,
): CsvImportMappingValidationResult {
  const errors: Record<string, string> = {};
  const normalizedHeaderSet = new Set(headers.map((header) => normalizeHeader(header)));

  if (!isSupportedDateFormat(mapping.dateFormat)) {
    errors.dateFormat = "Formato data non valido";
  }

  if (!isSupportedAmountConvention(mapping.amountConvention)) {
    errors.amountConvention = "Convenzione importo non valida";
  }

  const requiredFields: Array<[keyof CsvImportColumnMapping, string]> = [
    ["date", mapping.date],
    ["description", mapping.description],
    ["amount", mapping.amount],
  ];

  for (const [fieldName, value] of requiredFields) {
    const normalized = normalizeHeader(value ?? "");
    if (!normalized || !normalizedHeaderSet.has(normalized)) {
      errors[String(fieldName)] = "Colonna mancante nel CSV";
    }
  }

  const optionalFields: Array<[keyof CsvImportColumnMapping, string | null | undefined]> = [
    ["currency", mapping.currency],
    ["merchantName", mapping.merchantName],
  ];

  for (const [fieldName, value] of optionalFields) {
    if (!value) {
      continue;
    }

    const normalized = normalizeHeader(value);
    if (!normalizedHeaderSet.has(normalized)) {
      errors[String(fieldName)] = "Colonna mancante nel CSV";
    }
  }

  const hasErrors = Object.keys(errors).length > 0;

  return hasErrors ? { ok: false, errors } : { ok: true, errors: {} as Record<string, never> };
}

function resolveDraftStatus(
  parsedAmount: number | null,
  date: Date | null,
  description: string,
  amountConvention: CsvImportAmountConvention,
): ImportedTransactionDraftStatus {
  if (!date || !description || parsedAmount === null) {
    return "error";
  }

  if (amountConvention === "negative_is_expense" && parsedAmount > 0) {
    return "ignored";
  }

  if (amountConvention === "positive_is_expense" && parsedAmount < 0) {
    return "ignored";
  }

  return "pending";
}

export function mapCsvRowToImportedTransactionDraft(
  row: CsvImportRow | CsvImportParsedRow,
  mapping: CsvImportColumnMapping,
  options: MapCsvRowToImportedTransactionDraftOptions = {},
): ImportedTransactionDraft {
  const resolvedRow = getRowValues(row);
  const sourceRowIndex = resolvedRow.sourceRowIndex ?? options.sourceRowIndex ?? 0;

  const description = getFieldValue(resolvedRow.values, mapping.description);
  const merchantName = mapping.merchantName
    ? getFieldValue(resolvedRow.values, mapping.merchantName) || null
    : null;
  const rawCurrency = mapping.currency
    ? getFieldValue(resolvedRow.values, mapping.currency)
    : "";
  const currency = normalizeImportCurrency(rawCurrency, options.defaultCurrency);
  const rawAmount = getFieldValue(resolvedRow.values, mapping.amount);
  const parsedAmount = parseImportAmount(rawAmount);
  const date = parseImportDate(
    getFieldValue(resolvedRow.values, mapping.date),
    mapping.dateFormat,
  );
  const status = resolveDraftStatus(
    parsedAmount,
    date,
    description,
    mapping.amountConvention,
  );

  if (status === "error") {
    const missing: string[] = [];

    if (!description) {
      missing.push("description");
    }
    if (!date) {
      missing.push("date");
    }
    if (parsedAmount === null) {
      missing.push("amount");
    }

    return {
      sourceRowIndex,
      date,
      description,
      merchantName,
      amount: null,
      currency,
      raw: resolvedRow.values,
      status,
      errorMessage: missing.length > 0 ? `Dati mancanti o non validi: ${missing.join(", ")}` : "Riga non valida",
    };
  }

  if (status === "ignored") {
    return {
      sourceRowIndex,
      date,
      description,
      merchantName,
      amount: parsedAmount === null ? null : Math.abs(parsedAmount),
      currency,
      raw: resolvedRow.values,
      status,
    };
  }

  return {
    sourceRowIndex,
    date,
    description,
    merchantName,
    amount: parsedAmount === null ? null : Math.abs(parsedAmount),
    currency,
    raw: resolvedRow.values,
    status,
  };
}

export { normalizeHeader, normalizeImportCurrency, parseImportAmount, parseImportDate } from "@/src/lib/imports/import-domain";
