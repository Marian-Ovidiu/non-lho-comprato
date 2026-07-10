import { it } from "@/src/lib/i18n/it";
import type { Translations } from "@/src/lib/i18n";
import {
  calculateEntryMoney,
  calculateEntrySavedAmount,
  parseEntryMoneyInput,
  toEntryMoneyView,
  type EntryMode,
  type EntryMoneyResult,
  type EntrySavingContext,
} from "@/src/lib/entry-domain";

type ParsedMoneyField = {
  value: number;
  provided: boolean;
  error?: string;
};

export type ResolvedEntryMoney = {
  usesTrackerFields: boolean;
  money?: EntryMoneyResult;
  errors: Record<string, string>;
};

export type ResolveEntryMoneyOptions = {
  /**
   * NLC only records real spending: a saving exists when a real cost is lower
   * than a concrete alternative. New entries must therefore have realCost > 0,
   * which makes "avoided" unreachable by construction.
   *
   * Entries already stored as avoided predate that rule — habits still generate
   * them — so updating one must keep working. Callers pass this flag only after
   * reading `mode` from the stored row, never from the submitted form, so a
   * "spent" entry can never be converted into an avoided one.
   */
  allowExistingAvoided?: boolean;
};

export function getEntryFormText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getMoney(
  formData: FormData,
  name: string,
  v: Translations["validation"] = it.validation,
): {
  value: number;
  error?: string;
} {
  const parsed = parseEntryMoneyInput(getEntryFormText(formData, name));

  if (parsed.ok) {
    return { value: parsed.value };
  }

  if (parsed.reason === "empty") {
    return { value: Number.NaN, error: v.required };
  }

  if (parsed.reason === "invalid") {
    return { value: Number.NaN, error: v.invalidNumber };
  }

  if (parsed.reason === "negative") {
    return {
      value: Number.NaN,
      error: v.nonNegative,
    };
  }

  if (parsed.reason === "too_large") {
    return {
      value: Number.NaN,
      error: v.amountTooLarge,
    };
  }

  return { value: Number.NaN, error: v.invalidNumber };
}

function getOptionalMoney(
  formData: FormData,
  name: string,
  v: Translations["validation"] = it.validation,
): ParsedMoneyField {
  const parsed = parseEntryMoneyInput(getEntryFormText(formData, name));

  if (parsed.ok) {
    return {
      value: parsed.value,
      provided: true,
    };
  }

  if (parsed.reason === "empty") {
    return {
      value: Number.NaN,
      provided: false,
    };
  }

  if (parsed.reason === "invalid") {
    return {
      value: Number.NaN,
      provided: true,
      error: v.invalidNumber,
    };
  }

  if (parsed.reason === "negative") {
    return {
      value: Number.NaN,
      provided: true,
      error: v.nonNegative,
    };
  }

  if (parsed.reason === "too_large") {
    return {
      value: Number.NaN,
      provided: true,
      error: v.amountTooLarge,
    };
  }

  return {
    value: Number.NaN,
    provided: true,
    error: v.invalidNumber,
  };
}

function resolveAlternativeCost(
  formData: FormData,
  realCost: { value: number; error?: string },
  v: Translations["validation"] = it.validation,
): { value: number; error?: string } {
  const raw = getEntryFormText(formData, "alternativeCost");

  if (!raw) {
    if (realCost.error) {
      return { value: Number.NaN };
    }

    return { value: realCost.value };
  }

  return getMoney(formData, "alternativeCost", v);
}

function hasTrackerFirstMoneyFields(formData: FormData): boolean {
  return ["mode", "savingContext", "amountSpent", "comparisonAmount"].some(
    (name) => getEntryFormText(formData, name) !== "",
  );
}

function resolveLegacyEntryMoney(
  formData: FormData,
  tr: Translations = it,
  options: ResolveEntryMoneyOptions = {},
): ResolvedEntryMoney {
  const errors: Record<string, string> = {};
  const realCost = getMoney(formData, "realCost", tr.validation);
  const alternativeCost = resolveAlternativeCost(formData, realCost, tr.validation);

  if (realCost.error) {
    errors.realCost = realCost.error;
  } else if (!options.allowExistingAvoided && realCost.value <= 0) {
    // Without this guard `toEntryMoneyView` would infer mode "avoided" from a
    // zero real cost paired with a positive alternative.
    errors.realCost = tr.validation.amountPositive;
  }

  if (alternativeCost.error) {
    errors.alternativeCost = alternativeCost.error;
  }

  if (Object.keys(errors).length > 0) {
    return {
      usesTrackerFields: false,
      errors,
    };
  }

  const savedAmount = calculateEntrySavedAmount(
    realCost.value,
    alternativeCost.value,
  );

  return {
    usesTrackerFields: false,
    money: toEntryMoneyView({
      realCost: realCost.value,
      alternativeCost: alternativeCost.value,
      savedAmount,
    }),
    errors,
  };
}

function resolveTrackerFirstEntryMoney(
  formData: FormData,
  tr: Translations = it,
  options: ResolveEntryMoneyOptions = {},
): ResolvedEntryMoney {
  const errors: Record<string, string> = {};
  const rawMode = getEntryFormText(formData, "mode");
  const rawSavingContext = getEntryFormText(formData, "savingContext");
  const amountSpent = getOptionalMoney(formData, "amountSpent", tr.validation);
  const comparisonAmount = getOptionalMoney(formData, "comparisonAmount", tr.validation);

  if (amountSpent.error) {
    errors.amountSpent = amountSpent.error;
  }

  if (comparisonAmount.error) {
    errors.comparisonAmount = comparisonAmount.error;
  }

  const mode: EntryMode = rawMode === "avoided" ? "avoided" : "spent";

  if (rawMode && rawMode !== "spent" && rawMode !== "avoided") {
    errors.mode = tr.validation.selectValidMode;
  }

  // A new movement always has a real cost. Only an entry already stored as
  // avoided may be re-saved as such, so history stays editable.
  const keepsExistingAvoided =
    mode === "avoided" && options.allowExistingAvoided === true;

  if (mode === "avoided" && !keepsExistingAvoided) {
    errors.mode = tr.validation.selectValidMode;
  }

  let savingContext: EntrySavingContext =
    rawSavingContext === "comparison" ? "comparison" : "none";

  if (!rawSavingContext && mode === "spent" && comparisonAmount.provided) {
    savingContext = "comparison";
  }

  if (
    rawSavingContext &&
    rawSavingContext !== "none" &&
    rawSavingContext !== "comparison"
  ) {
    errors.savingContext = tr.validation.selectValidContext;
  }

  if (keepsExistingAvoided) {
    // A stored avoided entry spends nothing: the only money field is the amount
    // the user would have spent (comparisonAmount).
    if (!comparisonAmount.provided) {
      errors.comparisonAmount = tr.validation.required;
    } else if (comparisonAmount.value <= 0) {
      errors.comparisonAmount = tr.validation.amountPositive;
    }
  } else if (mode === "spent") {
    if (!amountSpent.provided) {
      errors.amountSpent = tr.validation.required;
    } else if (amountSpent.value <= 0) {
      errors.amountSpent = tr.validation.amountPositive;
    }

    if (savingContext === "comparison" && !comparisonAmount.provided) {
      errors.comparisonAmount = tr.validation.required;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      usesTrackerFields: true,
      errors,
    };
  }

  return {
    usesTrackerFields: true,
    money: calculateEntryMoney({
      mode,
      savingContext,
      amountSpent: amountSpent.provided ? amountSpent.value : undefined,
      comparisonAmount: comparisonAmount.provided
        ? comparisonAmount.value
        : undefined,
    }),
    errors,
  };
}

export function resolveEntryMoneyFromForm(
  formData: FormData,
  tr: Translations = it,
  options: ResolveEntryMoneyOptions = {},
): ResolvedEntryMoney {
  if (hasTrackerFirstMoneyFields(formData)) {
    return resolveTrackerFirstEntryMoney(formData, tr, options);
  }

  return resolveLegacyEntryMoney(formData, tr, options);
}
