export function parseMoneyString(raw?: string | number | null): number {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : Number.NaN;
  }

  if (!raw) {
    return Number.NaN;
  }

  const normalized = String(raw).trim().replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : Number.NaN;
}

export function moneyStringToInput(raw?: string | number | null): string {
  const value = parseMoneyString(raw);

  if (!Number.isFinite(value) || value < 0) {
    return "";
  }

  return value.toLocaleString("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function normalizeMoneyInput(value: string): string {
  return value
    .replace(/[^\d,.]/g, "")
    .replace(".", ",")
    .replace(/(,.*),/g, "$1")
    .replace(/^0+(\d)/, "$1");
}

/**
 * Come `normalizeMoneyInput`, ma tiene il meno in testa.
 *
 * Serve in un posto solo, ed è il saldo di partenza: un conto può cominciare
 * sotto zero, e un campo che rifiuta il segno costringe a dichiarare il falso.
 * Le spese restano sull'altra funzione, dove un importo negativo non esiste.
 */
export function normalizeSignedMoneyInput(value: string): string {
  const isNegative = value.trimStart().startsWith("-");

  return (isNegative ? "-" : "") + normalizeMoneyInput(value);
}

export function formatMoneyPreview(raw: string): string {
  const value = parseMoneyString(raw);

  if (!Number.isFinite(value) || value <= 0) {
    return "0,00";
  }

  return value.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatMoneyValue(value: number): string {
  if (!Number.isFinite(value)) {
    return "0,00";
  }

  return Math.abs(value).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function toHiddenMoneyValue(raw: string): string {
  const value = parseMoneyString(raw);

  if (!Number.isFinite(value) || value < 0) {
    return "";
  }

  return value.toFixed(2);
}

export function getMoneyDelta(
  amountSpentRaw: string,
  comparisonAmountRaw: string,
): number {
  const amountSpent = parseMoneyString(amountSpentRaw);
  const comparisonAmount = parseMoneyString(comparisonAmountRaw);

  if (!Number.isFinite(amountSpent) || !Number.isFinite(comparisonAmount)) {
    return 0;
  }

  return Number((comparisonAmount - amountSpent).toFixed(2));
}
