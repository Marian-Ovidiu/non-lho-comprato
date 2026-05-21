function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  if (value && typeof value === "object" && "toString" in value) {
    const parsed = Number(String(value).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}

export function calculateSavedAmount(
  realCost: unknown,
  alternativeCost: unknown,
): number {
  const real = toNumber(realCost);
  const alternative = toNumber(alternativeCost);

  if (!Number.isFinite(real) || !Number.isFinite(alternative)) {
    return 0;
  }

  if (real <= 0) {
    return 0;
  }

  return round2(alternative - real);
}

export function calculateSavedPercentage(
  realCost: unknown,
  alternativeCost: unknown,
): number {
  const real = toNumber(realCost);
  const alternative = toNumber(alternativeCost);

  if (!Number.isFinite(real) || !Number.isFinite(alternative)) {
    return 0;
  }

  if (real <= 0) {
    return 0;
  }

  if (alternative === 0) {
    return 0;
  }

  return round2(((alternative - real) / alternative) * 100);
}
