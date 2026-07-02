/**
 * Shared numeric helpers for money values. Single source of truth for the
 * round2/toMoneyNumber pair that used to be copy-pasted per module.
 */

/** Rounds to 2 decimals, normalizing -0 to 0. */
export function round2(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;

  return Object.is(rounded, -0) ? 0 : rounded;
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
