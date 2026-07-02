import type { BudgetPeriod } from "@/src/lib/budget-model";
import type { BudgetSummaryView } from "@/src/lib/budget-summary";
import { getCurrencySymbol } from "@/src/lib/workspace-currency";

export type BudgetAlertKind = "over_budget" | "pace_risk" | "low_runway";

export type BudgetAlertLevel = "warning" | "danger";

export type BudgetAlert = {
  id: string;
  kind: BudgetAlertKind;
  level: BudgetAlertLevel;
  budgetId: string;
  scope: BudgetSummaryView["scope"];
  period: BudgetPeriod;
  title: string;
  subtitle: string;
  categoryName: string | null;
  message: string;
  detail: string;
  spentAmount: number;
  remainingAmount: number;
  spentPercentage: number;
  timeProgressPercentage: number;
  dailyRemainingAmount: number;
  projectedSpendAtPeriodEnd: number;
  daysRemaining: number;
  ctaHref?: string;
};

export type BudgetAlertSelection = {
  primaryAlerts: BudgetAlert[];
  pageAlerts: BudgetAlert[];
  hasAlerts: boolean;
};

export type BudgetAlertSelectionOptions = {
  maxPrimaryAlerts?: number;
};

const DEFAULT_MAX_PRIMARY_ALERTS = 2;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const ALERT_CTA_HREF = "/budget#gestione-budget";

const KIND_ORDER: Record<BudgetAlertKind, number> = {
  over_budget: 0,
  pace_risk: 1,
  low_runway: 2,
};

const LEVEL_ORDER: Record<BudgetAlertLevel, number> = {
  danger: 0,
  warning: 1,
};

const SCOPE_ORDER: Record<BudgetAlert["scope"], number> = {
  workspace: 0,
  category: 1,
};

type IndexedBudgetAlert = BudgetAlert & {
  sourceIndex: number;
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toFiniteNumber(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrencyAmount(amount: number, currency: string | null): string {
  const normalizedCurrency = currency ?? "EUR";
  const symbol = getCurrencySymbol(normalizedCurrency);
  const rounded = round2(Math.abs(amount));
  const isInteger = Number.isInteger(rounded);
  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rounded);

  return `${formatted}${symbol}`;
}

function getPeriodDescriptor(period: BudgetPeriod): string {
  return period === "monthly" ? "mensile" : "settimanale";
}

function getKindLabel(kind: BudgetAlertKind): string {
  if (kind === "over_budget") {
    return "Budget superato";
  }

  if (kind === "pace_risk") {
    return "Ritmo troppo alto";
  }

  return "Poco margine rimasto";
}

function getAlertMessage(summary: BudgetSummaryView, kind: BudgetAlertKind): string {
  if (kind === "over_budget") {
    const overAmount = Math.max(
      0,
      round2(summary.spentAmount - summary.budgetAmount),
      round2(Math.abs(summary.remainingAmount)),
    );
    const scopeDescriptor =
      summary.scope === "workspace"
        ? "totale"
        : summary.category?.name
          ? `di ${summary.category.name}`
          : "di questa categoria";

    return `Hai superato il budget ${getPeriodDescriptor(summary.period)} ${scopeDescriptor} di ${formatCurrencyAmount(overAmount, summary.currency)}.`;
  }

  if (kind === "pace_risk") {
    return "Stai usando il budget più velocemente del previsto.";
  }

  return `Ti restano circa ${formatCurrencyAmount(summary.dailyRemainingAmount, summary.currency)} al giorno fino a fine periodo.`;
}

function getAlertDetail(summary: BudgetSummaryView, kind: BudgetAlertKind, daysRemaining: number): string {
  if (kind === "over_budget") {
    return `Speso ${formatCurrencyAmount(summary.spentAmount, summary.currency)} su ${formatCurrencyAmount(summary.budgetAmount, summary.currency)}.`;
  }

  if (kind === "pace_risk") {
    return `Spesa proiettata a fine periodo: ${formatCurrencyAmount(summary.projectedSpendAtPeriodEnd, summary.currency)}.`;
  }

  return `Restano circa ${daysRemaining.toFixed(1)} giorni nel periodo.`;
}

function getDaysRemaining(summary: BudgetSummaryView): number {
  const periodMs = summary.periodEnd.getTime() - summary.periodStart.getTime();
  if (!Number.isFinite(periodMs) || periodMs <= 0) {
    return 0;
  }

  const clampedTimeProgress = Math.min(Math.max(summary.timeProgressPercentage, 0), 100);
  const remainingFraction = 1 - clampedTimeProgress / 100;
  return round2((periodMs * remainingFraction) / DAY_IN_MS);
}

function getAlertLevel(kind: BudgetAlertKind, summary: BudgetSummaryView): BudgetAlertLevel {
  if (kind === "pace_risk") {
    return summary.status === "danger" ? "danger" : "warning";
  }

  return kind === "over_budget" ? "danger" : "warning";
}

function getAlertKind(summary: BudgetSummaryView): BudgetAlertKind | null {
  if (
    summary.remainingAmount < 0 ||
    summary.spentAmount > summary.budgetAmount
  ) {
    return "over_budget";
  }

  if (summary.status === "warning" || summary.status === "danger") {
    return "pace_risk";
  }

  const daysRemaining = getDaysRemaining(summary);
  if (
    summary.remainingAmount > 0 &&
    summary.dailyRemainingAmount <= 5 &&
    daysRemaining >= 3
  ) {
    return "low_runway";
  }

  return null;
}

function compareBudgetAlerts(
  left: IndexedBudgetAlert,
  right: IndexedBudgetAlert,
): number {
  const leftLevel = LEVEL_ORDER[left.level];
  const rightLevel = LEVEL_ORDER[right.level];
  if (leftLevel !== rightLevel) {
    return leftLevel - rightLevel;
  }

  const leftKind = KIND_ORDER[left.kind];
  const rightKind = KIND_ORDER[right.kind];
  if (leftKind !== rightKind) {
    return leftKind - rightKind;
  }

  const leftScope = SCOPE_ORDER[left.scope];
  const rightScope = SCOPE_ORDER[right.scope];
  if (leftScope !== rightScope) {
    return leftScope - rightScope;
  }

  if (left.remainingAmount !== right.remainingAmount) {
    return left.remainingAmount - right.remainingAmount;
  }

  if (left.spentPercentage !== right.spentPercentage) {
    return right.spentPercentage - left.spentPercentage;
  }

  return left.sourceIndex - right.sourceIndex;
}

function toIndexedBudgetAlert(
  summary: BudgetSummaryView,
  kind: BudgetAlertKind,
  sourceIndex: number,
): IndexedBudgetAlert {
  const daysRemaining = getDaysRemaining(summary);

  return {
    id: `budget-alert:${summary.id}:${kind}`,
    kind,
    level: getAlertLevel(kind, summary),
    budgetId: summary.id,
    scope: summary.scope,
    period: summary.period,
    title: getKindLabel(kind),
    subtitle: summary.subtitle,
    categoryName: summary.category?.name ?? null,
    message: getAlertMessage(summary, kind),
    detail: getAlertDetail(summary, kind, daysRemaining),
    spentAmount: round2(toFiniteNumber(summary.spentAmount)),
    remainingAmount: round2(toFiniteNumber(summary.remainingAmount)),
    spentPercentage: round2(toFiniteNumber(summary.spentPercentage)),
    timeProgressPercentage: round2(toFiniteNumber(summary.timeProgressPercentage)),
    dailyRemainingAmount: round2(toFiniteNumber(summary.dailyRemainingAmount)),
    projectedSpendAtPeriodEnd: round2(
      toFiniteNumber(summary.projectedSpendAtPeriodEnd),
    ),
    daysRemaining,
    ctaHref: ALERT_CTA_HREF,
    sourceIndex,
  };
}

export function createBudgetAlertFromSummary(
  summary: BudgetSummaryView,
): BudgetAlert | null {
  const kind = getAlertKind(summary);
  if (!kind) {
    return null;
  }

  return toIndexedBudgetAlert(summary, kind, 0);
}

export function createBudgetAlertsFromSummaries(
  summaries: ReadonlyArray<BudgetSummaryView>,
): BudgetAlert[] {
  const alerts: IndexedBudgetAlert[] = [];
  const seenBudgetIds = new Set<string>();

  summaries.forEach((summary, index) => {
    if (seenBudgetIds.has(summary.id)) {
      return;
    }

    seenBudgetIds.add(summary.id);

    const kind = getAlertKind(summary);
    if (!kind) {
      return;
    }

    alerts.push(toIndexedBudgetAlert(summary, kind, index));
  });

  return alerts.sort(compareBudgetAlerts);
}

export function selectBudgetAlertSelection(
  summaries: ReadonlyArray<BudgetSummaryView>,
  options: BudgetAlertSelectionOptions = {},
): BudgetAlertSelection {
  const pageAlerts = createBudgetAlertsFromSummaries(summaries);
  const maxPrimaryAlerts = Math.max(
    0,
    Math.floor(options.maxPrimaryAlerts ?? DEFAULT_MAX_PRIMARY_ALERTS),
  );

  return {
    primaryAlerts: pageAlerts.slice(0, maxPrimaryAlerts),
    pageAlerts,
    hasAlerts: pageAlerts.length > 0,
  };
}
