const DEFAULT_LOCALE = "it-IT";

export function splitCraftedAmount(value: number, locale = DEFAULT_LOCALE) {
  const parts = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).formatToParts(Math.abs(value));

  const whole = parts
    .filter((part) => part.type === "integer" || part.type === "group")
    .map((part) => part.value)
    .join("");
  const decimals = parts.find((part) => part.type === "fraction")?.value;

  return {
    whole: whole || "0",
    decimals: decimals ?? "00",
  };
}

export function formatCraftedCompact(value: number, locale = DEFAULT_LOCALE) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCraftedEntryAmount(value: unknown, locale = DEFAULT_LOCALE) {
  const amount = Number(value);

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? Math.abs(amount) : 0);
}
