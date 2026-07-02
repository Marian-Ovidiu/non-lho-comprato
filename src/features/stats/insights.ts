import { formatMoney } from "@/src/lib/formatters";
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

function formatSignedMoney(value: number): string {
  const normalized = formatMoney(Math.abs(value));
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
): StatsInsight {
  const latestMonth = monthlyStats.at(-1);

  if (!latestMonth) {
    return {
      id: "best-savings-category",
      label: "Miglior impatto positivo",
      value: "In costruzione",
      detail:
        "Appena ci saranno non comprati o confronti positivi, qui comparirà la categoria più protetta.",
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
      label: "Miglior impatto positivo",
      value: fallback?.categoryName ?? "In costruzione",
      detail: fallback
        ? `${formatMoney(fallback.totalSaved)} di impatto netto positivo finora in questa categoria.`
        : "Appena compariranno dati positivi, qui vedrai la categoria più protetta.",
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
      label: "Miglior impatto positivo",
      value: "Nessun dato positivo",
      detail: `Nel mese di ${latestMonth.label} non ci sono ancora non comprati o confronti positivi.`,
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
  const monthPart = `nel mese di ${latestMonth.label}`;

  if (previousCategory) {
    const delta = round2(currentCategory.totalSaved - previousCategory.totalSaved);
    const deltaLabel =
      delta === 0 ? "in linea con il mese scorso" : `${formatSignedMoney(delta)} rispetto al mese scorso`;

    return {
      id: "best-savings-category",
      label: "Miglior impatto positivo",
      value: currentCategory.categoryName,
      detail: `${formatMoney(currentCategory.totalSaved)} di impatto netto positivo ${monthPart}. ${deltaLabel}.`,
      tone: "success",
    };
  }

  return {
    id: "best-savings-category",
    label: "Miglior impatto positivo",
    value: currentCategory.categoryName,
    detail: `${formatMoney(currentCategory.totalSaved)} di impatto netto positivo ${monthPart}.`,
    tone: "success",
  };
}

export function buildSpendingCategoryInsight(
  monthlyStats: MonthlyStatsItem[],
  monthlyCategoryGrouped: Map<string, Map<string, StatsMonthlyCategoryRow>>,
  categoryStats: CategoryStatsItem[],
): StatsInsight {
  const latestMonth = monthlyStats.at(-1);

  if (!latestMonth) {
    return {
      id: "top-spending-category",
      label: "Categoria dove spendi di più",
      value: "In costruzione",
      detail:
        "Appena ci saranno movimenti, qui comparirà la categoria con più spesa reale.",
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
      label: "Categoria dove spendi di più",
      value: "In costruzione",
      detail: "Appena compariranno dati, qui vedrai la categoria principale.",
      tone: "default",
    };
  }

  return {
    id: "top-spending-category",
    label: "Categoria dove spendi di più",
    value: topCategory.categoryName,
    detail: `${formatMoney(topCategory.totalRealSpent)} spesi nel mese di ${latestMonth.label}.`,
    tone: "premium",
  };
}

export function buildSpendingTrendInsight(monthlyStats: MonthlyStatsItem[]): StatsInsight {
  const latestMonth = monthlyStats.at(-1);
  const previousMonth = monthlyStats.at(-2);

  if (!latestMonth || !previousMonth) {
    return {
      id: "month-trend",
      label: "Spesa mese su mese",
      value: "Confronto non ancora disponibile",
      detail:
        "Serve almeno un secondo mese con dati per leggere se la spesa sale o scende.",
      tone: "default",
    };
  }

  const previousRealSpent = previousMonth.totalRealSpent;
  const currentRealSpent = latestMonth.totalRealSpent;
  const realSpentDelta = round2(currentRealSpent - previousRealSpent);

  if (realSpentDelta > 0) {
    return {
      id: "month-trend",
      label: "Spesa mese su mese",
      value: "Spesa in salita",
      detail: `${formatMoney(realSpentDelta)} in più rispetto al mese scorso.`,
      tone: "warning",
    };
  }

  if (realSpentDelta < 0) {
    return {
      id: "month-trend",
      label: "Spesa mese su mese",
      value: "Spesa in discesa",
      detail: `${formatMoney(Math.abs(realSpentDelta))} in meno rispetto al mese scorso.`,
      tone: "success",
    };
  }

  return {
    id: "month-trend",
    label: "Spesa mese su mese",
    value: "Spesa stabile",
    detail: "La spesa reale è in linea con il mese scorso.",
    tone: "default",
  };
}
