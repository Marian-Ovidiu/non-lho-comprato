/**
 * Shared numeric helpers for money values. Single source of truth for the
 * round2/toMoneyNumber pair that used to be copy-pasted per module.
 */

/**
 * Normalizes a user-typed money string to a plain dot-decimal string, or
 * null when it is not a number. Handles both locale formats ("1.234,56" and
 * "1,234.56") plus currency symbols/spaces; a single ambiguous separator is
 * read as decimal ("1,234" → "1.234").
 */
export function normalizeMoneyInputString(raw: string): string | null {
  const cleaned = raw.replace(/[^\d,.-]/g, "").trim();

  if (!cleaned) {
    return null;
  }

  const normalized =
    cleaned.includes(",") && cleaned.includes(".")
      ? cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "")
      : cleaned.replace(",", ".");

  if (
    !/^[-+]?\d*(\.\d+)?$/.test(normalized) ||
    normalized === "+" ||
    normalized === "-" ||
    normalized === "." ||
    normalized === "-."
  ) {
    return null;
  }

  return normalized;
}

/** Rounds to 2 decimals, normalizing -0 to 0. */
export function round2(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;

  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Splits a money total into `parts` shares that each carry 2 decimals and sum
 * back exactly to round2(total). A leftover cent from an uneven division is
 * allocated deterministically to the first shares (largest-remainder), so
 * 10.00 across 3 people becomes [3.34, 3.33, 3.33] and never 9.99. Returns an
 * empty array when `parts` is not a positive integer.
 */
export function splitAmount(total: number, parts: number): number[] {
  if (!Number.isFinite(total) || !Number.isInteger(parts) || parts <= 0) {
    return [];
  }

  const totalCents = Math.round(round2(total) * 100);
  const sign = totalCents < 0 ? -1 : 1;
  const absCents = Math.abs(totalCents);
  const base = Math.floor(absCents / parts);
  const remainder = absCents - base * parts;

  return Array.from({ length: parts }, (_, index) => {
    const cents = base + (index < remainder ? 1 : 0);
    return round2((sign * cents) / 100);
  });
}

/**
 * Converts a decimal-like value (number, bigint, numeric string with "." or
 * ",", Prisma.Decimal) to a finite number, falling back to 0. For validation
 * paths that must distinguish invalid input, use a NaN-returning parser
 * instead (see entry-domain/formatters).
 */
export function toMoneyNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === "object") {
    const decimal = value as { toString?: () => string };

    if (typeof decimal.toString === "function") {
      const parsed = Number(decimal.toString().replace(",", "."));
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  return 0;
}
