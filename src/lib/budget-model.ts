import { round2 } from "@/src/lib/money-number";
export const BUDGET_PERIODS = ["weekly", "monthly"] as const;
export const BUDGET_SCOPES = ["workspace", "category"] as const;

export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];
export type BudgetScope = (typeof BUDGET_SCOPES)[number];

export type BudgetScopeInput = {
  scope?: unknown;
  period?: unknown;
  amount?: unknown;
  categoryId?: unknown;
  scopeKey?: unknown;
  currency?: unknown;
};

export type NormalizedBudgetScopeInput = {
  scope: BudgetScope | null;
  period: BudgetPeriod | null;
  amount: number | null;
  categoryId: string | null;
  scopeKey: string;
  requestedScopeKey: string | null;
  currency: string | null;
};

export type BudgetValidationErrors = Partial<{
  scope: string;
  period: string;
  amount: string;
  categoryId: string;
  scopeKey: string;
}>;

export type BudgetValidationResult =
  | {
      ok: true;
      value: NormalizedBudgetScopeInput & {
        scope: BudgetScope;
        period: BudgetPeriod;
        amount: number;
      };
    }
  | {
      ok: false;
      errors: BudgetValidationErrors;
    };

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeBudgetScope(value: unknown): BudgetScope | null {
  return value === "workspace" || value === "category" ? value : null;
}

function normalizeBudgetPeriod(value: unknown): BudgetPeriod | null {
  return value === "weekly" || value === "monthly" ? value : null;
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? round2(value) : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? round2(parsed) : null;
  }

  if (value && typeof value === "object" && "toString" in value) {
    const parsed = Number(String(value).replace(",", "."));
    return Number.isFinite(parsed) ? round2(parsed) : null;
  }

  return null;
}

export function buildBudgetScopeKey(
  scope: BudgetScope,
  categoryId?: string | null,
): string {
  if (scope === "workspace") {
    return "workspace";
  }

  return normalizeText(categoryId) ?? "";
}

export function normalizeBudgetScopeInput(
  input: BudgetScopeInput,
): NormalizedBudgetScopeInput {
  const scope = normalizeBudgetScope(input.scope);
  const period = normalizeBudgetPeriod(input.period);
  const categoryId = normalizeText(input.categoryId);
  const requestedScopeKey = normalizeText(input.scopeKey);
  const currency = normalizeText(input.currency)?.toUpperCase() ?? null;
  const amount = normalizeAmount(input.amount);

  return {
    scope,
    period,
    amount,
    categoryId,
    scopeKey: scope ? buildBudgetScopeKey(scope, categoryId) : requestedScopeKey ?? "",
    requestedScopeKey,
    currency,
  };
}

export function validateBudgetScopeInput(
  input: BudgetScopeInput,
): BudgetValidationResult {
  const normalized = normalizeBudgetScopeInput(input);
  const errors: BudgetValidationErrors = {};

  if (!normalized.scope) {
    errors.scope = "Lo scope deve essere workspace o category.";
  }

  if (!normalized.period) {
    errors.period = "Il periodo deve essere weekly o monthly.";
  }

  if (normalized.amount === null) {
    errors.amount = "L'importo è obbligatorio.";
  } else if (normalized.amount <= 0) {
    errors.amount = "L'importo deve essere maggiore di 0.";
  }

  if (normalized.scope === "workspace") {
    if (normalized.categoryId) {
      errors.categoryId = "Un budget workspace non può avere categoryId.";
    }

    if (normalized.scopeKey !== "workspace") {
      errors.scopeKey = "scopeKey deve essere 'workspace' per un budget workspace.";
    }
  }

  if (normalized.scope === "category") {
    if (!normalized.categoryId) {
      errors.categoryId = "Un budget category richiede categoryId.";
    } else if (normalized.scopeKey !== normalized.categoryId) {
      errors.scopeKey = "scopeKey deve corrispondere a categoryId.";
    }
  }

  if (
    normalized.requestedScopeKey &&
    normalized.requestedScopeKey !== normalized.scopeKey
  ) {
    errors.scopeKey = "scopeKey incoerente con scope e categoryId.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      ...normalized,
      scope: normalized.scope as BudgetScope,
      period: normalized.period as BudgetPeriod,
      amount: normalized.amount as number,
    },
  };
}
