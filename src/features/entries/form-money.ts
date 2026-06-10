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

export function getEntryFormText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getMoney(formData: FormData, name: string): {
  value: number;
  error?: string;
} {
  const parsed = parseEntryMoneyInput(getEntryFormText(formData, name));

  if (parsed.ok) {
    return { value: parsed.value };
  }

  if (parsed.reason === "empty") {
    return { value: Number.NaN, error: "Questo campo è obbligatorio" };
  }

  if (parsed.reason === "invalid") {
    return { value: Number.NaN, error: "Inserisci un numero valido" };
  }

  if (parsed.reason === "negative") {
    return {
      value: Number.NaN,
      error: "Il valore deve essere maggiore o uguale a 0",
    };
  }

  return { value: Number.NaN, error: "Inserisci un numero valido" };
}

function getOptionalMoney(formData: FormData, name: string): ParsedMoneyField {
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
      error: "Inserisci un numero valido",
    };
  }

  if (parsed.reason === "negative") {
    return {
      value: Number.NaN,
      provided: true,
      error: "Il valore deve essere maggiore o uguale a 0",
    };
  }

  return {
    value: Number.NaN,
    provided: true,
    error: "Inserisci un numero valido",
  };
}

function resolveAlternativeCost(
  formData: FormData,
  realCost: { value: number; error?: string },
): { value: number; error?: string } {
  const raw = getEntryFormText(formData, "alternativeCost");

  if (!raw) {
    if (realCost.error) {
      return { value: Number.NaN };
    }

    return { value: realCost.value };
  }

  return getMoney(formData, "alternativeCost");
}

function hasTrackerFirstMoneyFields(formData: FormData): boolean {
  return ["mode", "savingContext", "amountSpent", "comparisonAmount"].some(
    (name) => getEntryFormText(formData, name) !== "",
  );
}

function resolveLegacyEntryMoney(formData: FormData): ResolvedEntryMoney {
  const errors: Record<string, string> = {};
  const realCost = getMoney(formData, "realCost");
  const alternativeCost = resolveAlternativeCost(formData, realCost);

  if (realCost.error) {
    errors.realCost = realCost.error;
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

function resolveTrackerFirstEntryMoney(formData: FormData): ResolvedEntryMoney {
  const errors: Record<string, string> = {};
  const rawMode = getEntryFormText(formData, "mode");
  const rawSavingContext = getEntryFormText(formData, "savingContext");
  const amountSpent = getOptionalMoney(formData, "amountSpent");
  const comparisonAmount = getOptionalMoney(formData, "comparisonAmount");

  if (amountSpent.error) {
    errors.amountSpent = amountSpent.error;
  }

  if (comparisonAmount.error) {
    errors.comparisonAmount = comparisonAmount.error;
  }

  const mode: EntryMode = rawMode === "avoided" ? "avoided" : "spent";

  if (rawMode && rawMode !== "spent" && rawMode !== "avoided") {
    errors.mode = "Seleziona una modalita valida";
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
    errors.savingContext = "Seleziona un contesto valido";
  }

  if (mode === "avoided") {
    savingContext = "comparison";

    if (!comparisonAmount.provided) {
      errors.comparisonAmount = "Questo campo è obbligatorio";
    } else if (comparisonAmount.value <= 0) {
      errors.comparisonAmount = "L'importo deve essere maggiore di 0";
    }
  } else {
    if (!amountSpent.provided) {
      errors.amountSpent = "Questo campo è obbligatorio";
    } else if (amountSpent.value <= 0) {
      errors.amountSpent = "L'importo deve essere maggiore di 0";
    }

    if (savingContext === "comparison" && !comparisonAmount.provided) {
      errors.comparisonAmount = "Questo campo è obbligatorio";
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

export function resolveEntryMoneyFromForm(formData: FormData): ResolvedEntryMoney {
  if (hasTrackerFirstMoneyFields(formData)) {
    return resolveTrackerFirstEntryMoney(formData);
  }

  return resolveLegacyEntryMoney(formData);
}
