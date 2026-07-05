import { formatMoney } from "@/src/lib/formatters";
import { it } from "@/src/lib/i18n/it";
import { languageToLocale } from "@/src/lib/i18n";
import type { Translations } from "@/src/lib/i18n";
import { round2 } from "@/src/lib/money-number";

export type MonthlyStatsItem = {
  month: string;
  label: string;
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  netImpact: number;
  avoidedAmount: number;
  comparisonSaved: number;
  comparisonOverspent: number;
  grossPositiveImpact: number;
  largeComparisonImpact: number;
  ordinaryImpact: number;
  entriesCount: number;
};

export type CategoryStatsItem = {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  netImpact: number;
  avoidedAmount: number;
  comparisonSaved: number;
  comparisonOverspent: number;
  grossPositiveImpact: number;
  entriesCount: number;
  averageSaved: number;
};

export type StatsMonthlyCategoryRow = {
  categoryName: string;
  categorySlug: string;
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
};

type StatsInsightTone = "default" | "success" | "premium" | "warning";

export type StatsInsight = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: StatsInsightTone;
};

function formatSignedMoney(value: number, locale: string): string {
  const normalized = formatMoney(Math.abs(value), undefined, locale);
  if (value > 0) {
    return `+${normalized}`;
  }

  if (value < 0) {
    return `-${normalized}`;
  }

  return normalized;
}

function getCategoryTotals(
  grouped: Map<string, StatsMonthlyCategoryRow>,
  categoryId: string,
): StatsMonthlyCategoryRow | null {
  return grouped.get(categoryId) ?? null;
}

export function buildSavingCategoryInsight(
  monthlyStats: MonthlyStatsItem[],
  monthlyCategoryGrouped: Map<string, Map<string, StatsMonthlyCategoryRow>>,
  categoryStats: CategoryStatsItem[],
  tr: Translations = it,
): StatsInsight {
  const si = tr.statsInsights;
  const locale = languageToLocale(tr.language);
  const latestMonth = monthlyStats.at(-1);

  if (!latestMonth) {
    return {
      id: "best-savings-category",
      label: si.bestImpactTitle,
      value: si.underConstruction,
      detail:
        si.emptySavingDetail,
      tone: "default",
    };
  }

  const latestCategories = monthlyCategoryGrouped.get(latestMonth.month);
  if (!latestCategories || latestCategories.size === 0) {
    const fallback = [...categoryStats]
      .filter((category) => category.totalSaved > 0)
      .sort(
        (left, right) =>
          right.totalSaved - left.totalSaved ||
          right.entriesCount - left.entriesCount ||
          left.categoryName.localeCompare(right.categoryName, "it"),
      )[0];

    return {
      id: "best-savings-category",
      label: si.bestImpactTitle,
      value: fallback?.categoryName ?? si.underConstruction,
      detail: fallback
        ? si.savedSoFarInCategory(formatMoney(fallback.totalSaved, undefined, locale))
        : si.emptySavingDetailAlt,
      tone: "success",
    };
  }

  const currentCategory = [...latestCategories.entries()]
    .map(([categoryId, totals]) => ({ categoryId, ...totals }))
    .filter((category) => category.totalSaved > 0)
    .sort(
      (left, right) =>
        right.totalSaved - left.totalSaved ||
        right.entriesCount - left.entriesCount ||
        left.categoryName.localeCompare(right.categoryName, "it"),
    )[0];

  if (!currentCategory) {
    return {
      id: "best-savings-category",
      label: si.bestImpactTitle,
      value: si.noPositiveTitle,
      detail: si.noSavingsInMonth(latestMonth.label),
      tone: "default",
    };
  }

  const previousMonth = monthlyStats.at(-2);
  const previousCategory = previousMonth
    ? getCategoryTotals(
        monthlyCategoryGrouped.get(previousMonth.month) ?? new Map(),
        currentCategory.categoryId,
      )
    : null;
  const monthPart = si.inMonthPart(latestMonth.label);

  if (previousCategory) {
    const delta = round2(currentCategory.totalSaved - previousCategory.totalSaved);
    const deltaLabel =
      delta === 0 ? si.inLineWithLastMonth : si.deltaVsLastMonth(formatSignedMoney(delta, locale));

    return {
      id: "best-savings-category",
      label: si.bestImpactTitle,
      value: currentCategory.categoryName,
      detail: si.savedInCategoryWithDelta(formatMoney(currentCategory.totalSaved, undefined, locale), monthPart, deltaLabel),
      tone: "success",
    };
  }

  return {
    id: "best-savings-category",
    label: si.bestImpactTitle,
    value: currentCategory.categoryName,
    detail: si.savedInCategory(formatMoney(currentCategory.totalSaved, undefined, locale), monthPart),
    tone: "success",
  };
}

export function buildSpendingCategoryInsight(
  monthlyStats: MonthlyStatsItem[],
  monthlyCategoryGrouped: Map<string, Map<string, StatsMonthlyCategoryRow>>,
  categoryStats: CategoryStatsItem[],
  tr: Translations = it,
): StatsInsight {
  const si = tr.statsInsights;
  const locale = languageToLocale(tr.language);
  const latestMonth = monthlyStats.at(-1);

  if (!latestMonth) {
    return {
      id: "top-spending-category",
      label: si.topSpendingTitle,
      value: si.underConstruction,
      detail:
        si.emptySpendingDetail,
      tone: "default",
    };
  }

  const currentCategories = monthlyCategoryGrouped.get(latestMonth.month) ?? new Map();
  const currentCategory = [...currentCategories.values()].sort(
    (left, right) =>
      right.totalRealSpent - left.totalRealSpent ||
      right.entriesCount - left.entriesCount ||
      left.categoryName.localeCompare(right.categoryName, "it"),
  )[0];
  const fallback = [...categoryStats].sort(
    (left, right) =>
      right.totalRealSpent - left.totalRealSpent ||
      right.entriesCount - left.entriesCount ||
      left.categoryName.localeCompare(right.categoryName, "it"),
  )[0];
  const topCategory = currentCategory ?? fallback;

  if (!topCategory) {
    return {
      id: "top-spending-category",
      label: si.topSpendingTitle,
      value: si.underConstruction,
      detail: si.emptyCategoryDetail,
      tone: "default",
    };
  }

  return {
    id: "top-spending-category",
    label: si.topSpendingTitle,
    value: topCategory.categoryName,
    detail: si.spentInMonth(formatMoney(topCategory.totalRealSpent, undefined, locale), latestMonth.label),
    tone: "premium",
  };
}

export function buildSpendingTrendInsight(
  monthlyStats: MonthlyStatsItem[],
  tr: Translations = it,
): StatsInsight {
  const si = tr.statsInsights;
  const locale = languageToLocale(tr.language);
  const latestMonth = monthlyStats.at(-1);
  const previousMonth = monthlyStats.at(-2);

  if (!latestMonth || !previousMonth) {
    return {
      id: "month-trend",
      label: si.trendTitle,
      value: si.comparisonNotAvailable,
      detail:
        si.trendNeedsSecondMonth,
      tone: "default",
    };
  }

  const previousRealSpent = previousMonth.totalRealSpent;
  const currentRealSpent = latestMonth.totalRealSpent;
  const realSpentDelta = round2(currentRealSpent - previousRealSpent);

  if (realSpentDelta > 0) {
    return {
      id: "month-trend",
      label: si.trendTitle,
      value: si.trendUpValue,
      detail: si.trendUpDetail(formatMoney(realSpentDelta, undefined, locale)),
      tone: "warning",
    };
  }

  if (realSpentDelta < 0) {
    return {
      id: "month-trend",
      label: si.trendTitle,
      value: si.trendDownValue,
      detail: si.trendDownDetail(formatMoney(Math.abs(realSpentDelta), undefined, locale)),
      tone: "success",
    };
  }

  return {
    id: "month-trend",
    label: si.trendTitle,
    value: si.trendFlatValue,
    detail: si.trendFlatDetail,
    tone: "default",
  };
}
