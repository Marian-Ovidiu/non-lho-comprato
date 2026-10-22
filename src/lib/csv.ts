// Cells opened in Excel/Sheets execute as formulas when they start with one of
// these characters, so user text (titles, notes, names) written by one member
// could attack another member's spreadsheet. Plain numbers such as "-10.00"
// are exempt: a leading minus on a numeric cell is data, not a formula.
const CSV_FORMULA_TRIGGER_PATTERN = /^[=+\-@\t\r]/u;
const CSV_PLAIN_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/u;

function neutralizeCsvFormulaValue(value: string): string {
  if (
    CSV_FORMULA_TRIGGER_PATTERN.test(value) &&
    !CSV_PLAIN_NUMBER_PATTERN.test(value)
  ) {
    return `'${value}`;
  }

  return value;
}

function escapeCsvValue(value: string): string {
  const neutralized = neutralizeCsvFormulaValue(value);

  if (
    /[",\r\n]/.test(neutralized) ||
    neutralized.startsWith(" ") ||
    neutralized.endsWith(" ")
  ) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }

  return neutralized;
}

export function csvLine(values: Array<string | number | boolean>): string {
  return `${values.map((value) => escapeCsvValue(String(value))).join(",")}\n`;
}
