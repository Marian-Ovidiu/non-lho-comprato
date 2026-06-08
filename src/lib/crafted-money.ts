export function splitCraftedAmount(value: number) {
  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  const [whole, decimals] = formatted.split(",");

  return {
    whole,
    decimals: decimals ?? "00",
  };
}

export function formatCraftedCompact(value: number) {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCraftedEntryAmount(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "0,00";
  }

  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}
