import type { CsvImportParsedRow, CsvImportRow } from "@/src/lib/imports/import-domain";

export type CsvDelimiter = "," | ";" | "\t";

export type ParseCsvTextOptions = {
  delimiter?: CsvDelimiter;
  maxRows?: number;
};

export type ParseCsvTextResult = {
  delimiter: CsvDelimiter;
  headers: string[];
  rows: CsvImportParsedRow[];
  rowCount: number;
};

const DELIMITERS: CsvDelimiter[] = [",", ";", "\t"];
const DEFAULT_MAX_ROWS = 1000;

function stripBom(text: string): string {
  return text.startsWith("\uFEFF") ? text.slice(1) : text;
}

function normalizeLineBreaks(text: string): string {
  return text.replace(/\r\n/gu, "\n").replace(/\r/gu, "\n");
}

function isBlankRow(values: string[]): boolean {
  return values.every((value) => value.trim() === "");
}

function parseDelimitedText(
  csvText: string,
  delimiter: CsvDelimiter,
): string[][] {
  const text = `${normalizeLineBreaks(stripBom(csvText))}\n`;
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? "";
    const next = text[index + 1] ?? "";

    if (inQuotes) {
      if (char === '"' && next === '"') {
        currentCell += '"';
        index += 1;
        continue;
      }

      if (char === '"') {
        inQuotes = false;
        continue;
      }

      currentCell += char;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === delimiter) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (char === "\n") {
      currentRow.push(currentCell);
      if (!isBlankRow(currentRow)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  return rows;
}

function countDelimiterOccurrences(
  line: string,
  delimiter: CsvDelimiter,
): number {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index] ?? "";
    const next = line[index + 1] ?? "";

    if (inQuotes) {
      if (char === '"' && next === '"') {
        index += 1;
        continue;
      }

      if (char === '"') {
        inQuotes = false;
      }

      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === delimiter) {
      count += 1;
    }
  }

  return count;
}

export function detectDelimiter(csvText: string): CsvDelimiter {
  const normalized = normalizeLineBreaks(stripBom(csvText));
  const sampleLines = normalized
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "")
    .slice(0, 10);

  if (sampleLines.length === 0) {
    return ",";
  }

  let bestDelimiter: CsvDelimiter = ",";
  let bestScore = -1;

  for (const delimiter of DELIMITERS) {
    const score = sampleLines.reduce(
      (total, line) => total + countDelimiterOccurrences(line, delimiter),
      0,
    );

    if (score > bestScore) {
      bestDelimiter = delimiter;
      bestScore = score;
    }
  }

  return bestDelimiter;
}

export function parseCsvText(
  csvText: string,
  options: ParseCsvTextOptions = {},
): ParseCsvTextResult {
  const delimiter = options.delimiter ?? detectDelimiter(csvText);
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
  const rows = parseDelimitedText(csvText, delimiter);

  if (rows.length === 0) {
    return {
      delimiter,
      headers: [],
      rows: [],
      rowCount: 0,
    };
  }

  const [headerRow, ...dataRows] = rows;
  const headers = (headerRow ?? []).map((header) => header.trim());
  const parsedRows: CsvImportParsedRow[] = [];

  dataRows.forEach((row, index) => {
    if (parsedRows.length >= maxRows) {
      throw new Error(`CSV import exceeds the max row limit of ${maxRows}.`);
    }

    const values: CsvImportRow = {};

    headers.forEach((header, headerIndex) => {
      values[header] = row[headerIndex] ?? "";
    });

    parsedRows.push({
      sourceRowIndex: index + 1,
      values,
    });
  });

  return {
    delimiter,
    headers,
    rows: parsedRows,
    rowCount: parsedRows.length,
  };
}
