export type EntryMode = "spent" | "avoided";
export type EntrySavingContext = "none" | "comparison";

export type EntryMoneyParseResult =
  | {
      ok: true;
      value: number;
    }
  | {
      ok: false;
      reason: "empty" | "invalid" | "negative";
    };

export type EntryMoneyLike = {
  realCost?: unknown;
  alternativeCost?: unknown;
  savedAmount?: unknown;
  mode?: unknown;
  savingContext?: unknown;
};

export type EntryMoneyInput = {
  mode?: EntryMode;
  savingContext?: EntrySavingContext;
  amountSpent?: unknown;
  comparisonAmount?: unknown;
};

export type EntryMoneyResult = {
  mode: EntryMode;
  savingContext: EntrySavingContext;
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  amountSpent: number;
  comparisonAmount: number;
  savingImpact: number;
};

export type EntryMoneyView = EntryMoneyResult;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
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

export function parseEntryMoneyInput(value: unknown): EntryMoneyParseResult {
  if (value === null || value === undefined) {
    return { ok: false, reason: "empty" };
  }

  if (typeof value === "string" && value.trim() === "") {
    return { ok: false, reason: "empty" };
  }

  const amount = toFiniteNumber(value);

  if (!Number.isFinite(amount)) {
    return { ok: false, reason: "invalid" };
  }

  if (amount < 0) {
    return { ok: false, reason: "negative" };
  }

  return { ok: true, value: round2(amount) };
}

function normalizeMoney(value: unknown): number {
  const parsed = parseEntryMoneyInput(value);

  if (!parsed.ok) {
    return 0;
  }

  return parsed.value;
}

function normalizeImpact(value: unknown): number {
  const amount = toFiniteNumber(value);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return round2(amount);
}

function isEntryMode(value: unknown): value is EntryMode {
  return value === "spent" || value === "avoided";
}

function isEntrySavingContext(value: unknown): value is EntrySavingContext {
  return value === "none" || value === "comparison";
}

function requireEntryMoney(value: unknown, fieldName: string): number {
  const parsed = parseEntryMoneyInput(value);

  if (!parsed.ok) {
    throw new Error(`Invalid entry money value for ${fieldName}`);
  }

  return parsed.value;
}

export function calculateEntrySavedAmount(
  realCost: unknown,
  alternativeCost: unknown,
): number {
  const real = requireEntryMoney(realCost, "realCost");
  const alternative = requireEntryMoney(alternativeCost, "alternativeCost");

  return round2(alternative - real);
}

export function inferEntryMode(entry: EntryMoneyLike): EntryMode {
  if (isEntryMode(entry.mode)) {
    return entry.mode;
  }

  const realCost = normalizeMoney(entry.realCost);
  const alternativeCost = normalizeMoney(entry.alternativeCost);
  const savedAmount = normalizeImpact(entry.savedAmount);

  if (realCost === 0 && alternativeCost > 0 && savedAmount > 0) {
    return "avoided";
  }

  return "spent";
}

export function inferEntrySavingContext(
  entry: EntryMoneyLike,
): EntrySavingContext {
  if (isEntrySavingContext(entry.savingContext)) {
    return entry.savingContext;
  }

  const realCost = normalizeMoney(entry.realCost);
  const alternativeCost = normalizeMoney(entry.alternativeCost);

  return alternativeCost !== realCost ? "comparison" : "none";
}

export function calculateEntryMoney(input: EntryMoneyInput): EntryMoneyResult {
  const mode = input.mode === "avoided" ? "avoided" : "spent";
  const requestedSavingContext =
    input.savingContext === "comparison" ? "comparison" : "none";

  if (mode === "avoided") {
    const comparisonAmount = requireEntryMoney(
      input.comparisonAmount,
      "comparisonAmount",
    );

    return {
      mode,
      savingContext: "comparison",
      realCost: 0,
      alternativeCost: comparisonAmount,
      savedAmount: comparisonAmount,
      amountSpent: 0,
      comparisonAmount,
      savingImpact: comparisonAmount,
    };
  }

  const amountSpent = requireEntryMoney(input.amountSpent, "amountSpent");

  if (requestedSavingContext === "comparison") {
    const comparisonAmount = requireEntryMoney(
      input.comparisonAmount,
      "comparisonAmount",
    );
    const savedAmount = calculateEntrySavedAmount(amountSpent, comparisonAmount);

    return {
      mode,
      savingContext: "comparison",
      realCost: amountSpent,
      alternativeCost: comparisonAmount,
      savedAmount,
      amountSpent,
      comparisonAmount,
      savingImpact: savedAmount,
    };
  }

  return {
    mode,
    savingContext: "none",
    realCost: amountSpent,
    alternativeCost: amountSpent,
    savedAmount: 0,
    amountSpent,
    comparisonAmount: amountSpent,
    savingImpact: 0,
  };
}

export function toEntryMoneyView(entry: EntryMoneyLike): EntryMoneyView {
  const realCost = normalizeMoney(entry.realCost);
  const alternativeCost = normalizeMoney(entry.alternativeCost);
  const savedAmount = normalizeImpact(entry.savedAmount);

  return {
    mode: inferEntryMode(entry),
    savingContext: inferEntrySavingContext(entry),
    realCost,
    alternativeCost,
    savedAmount,
    amountSpent: realCost,
    comparisonAmount: alternativeCost,
    savingImpact: savedAmount,
  };
}

export function isAvoidedEntry(entry: EntryMoneyLike): boolean {
  return inferEntryMode(entry) === "avoided";
}

export function isComparedEntry(entry: EntryMoneyLike): boolean {
  return inferEntrySavingContext(entry) === "comparison";
}
