import { getCurrencySymbol } from "@/src/lib/workspace-currency";

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

export function formatMoney(value: unknown, currency = "EUR"): string {
  const amount = toNumber(value);
  const symbol = getCurrencySymbol(currency);

  if (!Number.isFinite(amount)) {
    return `0,00 ${symbol}`;
  }

  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} ${symbol}`;
}

export function formatDate(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(date);
}
