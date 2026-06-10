import type { StatsInsight } from "@/src/actions/stats";
import type { StatsOverview } from "@/src/lib/stats-overview";
import type { DailySpendingComparison } from "@/src/lib/daily-spending-comparison";
import { getRomeDateKey } from "@/src/lib/rome-dates";

export type CraftedStatsPeriod = "month" | "year" | "all";

export type CraftedStatsMonthlyItem = {
  month: string;
  label: string;
  totalSaved: number;
  totalRealSpent: number;
  totalAlternativeCost: number;
  entriesCount: number;
};

export type CraftedStatsCategoryItem = {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
};

export type CraftedCategoryRow = {
  categoryId: string;
  name: string;
  slug: string;
  spent: number;
  saved: number;
  pct: number;
  tone: "accent" | "foreground" | "green" | "muted";
};

export type CraftedStatsQueen = {
  name: string;
  slug: string;
  spent: number;
  saved: number;
  pct: number;
  entriesCount: number;
};

export type CraftedStatsProps = {
  monthlyStats: CraftedStatsMonthlyItem[];
  categoryStats: CraftedStatsCategoryItem[];
  overview: StatsOverview;
  insights: StatsInsight[];
  dailySpendingComparison: DailySpendingComparison;
  currentMonthLabel: string;
  queen: CraftedStatsQueen | null;
  categories: CraftedCategoryRow[];
};

const CATEGORY_TONES: CraftedCategoryRow["tone"][] = [
  "accent",
  "foreground",
  "green",
  "muted",
];

const CATEGORY_TONE_CLASS: Record<CraftedCategoryRow["tone"], string> = {
  accent: "bg-accent",
  foreground: "bg-foreground",
  green: "bg-green",
  muted: "bg-ink-3",
};

export { CATEGORY_TONE_CLASS };

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getCurrentYearKey() {
  return getRomeDateKey(new Date()).slice(0, 4);
}

function getMonthInitial(label: string) {
  const month = label.split(" ")[0] ?? label;
  return month.charAt(0).toUpperCase();
}

export function buildCraftedCategoryRows(
  categories: CraftedStatsCategoryItem[],
): CraftedCategoryRow[] {
  const totalSpent = categories.reduce(
    (sum, category) => sum + category.totalRealSpent,
    0,
  );

  return categories.map((category, index) => ({
    categoryId: category.categoryId,
    name: category.categoryName,
    slug: category.categorySlug,
    spent: category.totalRealSpent,
    saved: category.totalSaved,
    pct:
      totalSpent > 0
        ? Math.round((category.totalRealSpent / totalSpent) * 100)
        : 0,
    tone: CATEGORY_TONES[index % CATEGORY_TONES.length] ?? "muted",
  }));
}

export function buildCraftedStatsQueen({
  insights,
  categoryStats,
  periodTotalSpent,
}: {
  insights: StatsInsight[];
  categoryStats: CraftedStatsCategoryItem[];
  periodTotalSpent: number;
}): CraftedStatsQueen | null {
  const insight = insights.find((item) => item.id === "top-spending-category");
  const fallback = categoryStats[0];

  if (!insight?.value && !fallback) {
    return null;
  }

  const name = insight?.value ?? fallback!.categoryName;
  const matchedCategory = categoryStats.find(
    (category) => category.categoryName === name,
  );
  const spent = matchedCategory?.totalRealSpent ?? fallback?.totalRealSpent ?? 0;
  const saved = matchedCategory?.totalSaved ?? fallback?.totalSaved ?? 0;
  const entriesCount = matchedCategory?.entriesCount ?? fallback?.entriesCount ?? 0;
  const pct =
    periodTotalSpent > 0 ? Math.round((spent / periodTotalSpent) * 100) : 0;

  return {
    name,
    slug: matchedCategory?.categorySlug ?? fallback?.categorySlug ?? "altro",
    spent,
    saved,
    pct,
    entriesCount,
  };
}

export function buildCraftedStatsProps({
  overview,
  monthlyStats,
  categoryStats,
  insights,
  dailySpendingComparison,
}: {
  overview: StatsOverview;
  monthlyStats: CraftedStatsMonthlyItem[];
  categoryStats: CraftedStatsCategoryItem[];
  insights: StatsInsight[];
  dailySpendingComparison: DailySpendingComparison;
}): CraftedStatsProps {
  const currentMonthLabel =
    monthlyStats.at(-1)?.label ??
    dailySpendingComparison.currentMonth.label;

  const periodTotalSpent =
    monthlyStats.at(-1)?.totalRealSpent ?? overview.totalRealSpent;

  return {
    overview,
    monthlyStats,
    categoryStats,
    insights,
    dailySpendingComparison,
    currentMonthLabel,
    queen: buildCraftedStatsQueen({
      insights,
      categoryStats,
      periodTotalSpent,
    }),
    categories: buildCraftedCategoryRows(categoryStats),
  };
}

export type CraftedPeriodOverview = {
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
  averageSavedPerEntry: number;
  savingRatePercent: number;
};

function computePeriodOverview(
  totalRealSpent: number,
  totalAlternativeCost: number,
  totalSaved: number,
  entriesCount: number,
): CraftedPeriodOverview {
  return {
    totalRealSpent,
    totalAlternativeCost,
    totalSaved,
    entriesCount,
    averageSavedPerEntry:
      entriesCount === 0 ? 0 : round2(totalSaved / entriesCount),
    savingRatePercent:
      totalAlternativeCost === 0
        ? 0
        : round2((totalSaved / totalAlternativeCost) * 100),
  };
}

export function getPeriodOverview({
  period,
  monthlyStats,
  overview,
}: {
  period: CraftedStatsPeriod;
  monthlyStats: CraftedStatsMonthlyItem[];
  overview: StatsOverview;
}): CraftedPeriodOverview {
  const currentYear = getCurrentYearKey();
  const latestMonth = monthlyStats.at(-1);

  if (period === "month") {
    return computePeriodOverview(
      latestMonth?.totalRealSpent ?? 0,
      latestMonth?.totalAlternativeCost ?? 0,
      latestMonth?.totalSaved ?? 0,
      latestMonth?.entriesCount ?? 0,
    );
  }

  if (period === "year") {
    const yearMonths = monthlyStats.filter((month) =>
      month.month.startsWith(currentYear),
    );

    return computePeriodOverview(
      round2(yearMonths.reduce((sum, month) => sum + month.totalRealSpent, 0)),
      round2(
        yearMonths.reduce((sum, month) => sum + month.totalAlternativeCost, 0),
      ),
      round2(yearMonths.reduce((sum, month) => sum + month.totalSaved, 0)),
      yearMonths.reduce((sum, month) => sum + month.entriesCount, 0),
    );
  }

  return computePeriodOverview(
    overview.totalRealSpent,
    overview.totalAlternativeCost,
    overview.totalSaved,
    overview.entriesCount,
  );
}

export function getPeriodHero({
  period,
  monthlyStats,
  overview,
  currentMonthLabel,
}: {
  period: CraftedStatsPeriod;
  monthlyStats: CraftedStatsMonthlyItem[];
  overview: StatsOverview;
  currentMonthLabel: string;
}) {
  const currentYear = getCurrentYearKey();
  const latestMonth = monthlyStats.at(-1);

  if (period === "month") {
    return {
      label: `Speso a ${currentMonthLabel.split(" ")[0]?.toLowerCase() ?? currentMonthLabel.toLowerCase()}`,
      amount: latestMonth?.totalRealSpent ?? 0,
      entriesCount: latestMonth?.entriesCount ?? 0,
    };
  }

  if (period === "year") {
    const yearMonths = monthlyStats.filter((month) => month.month.startsWith(currentYear));
    const amount = round2(
      yearMonths.reduce((sum, month) => sum + month.totalRealSpent, 0),
    );
    const entriesCount = yearMonths.reduce((sum, month) => sum + month.entriesCount, 0);

    return {
      label: `Speso nel ${currentYear}`,
      amount,
      entriesCount,
    };
  }

  return {
    label: "Speso in totale",
    amount: overview.totalRealSpent,
    entriesCount: overview.entriesCount,
  };
}

export function getAverageMonthlySpent(monthlyStats: CraftedStatsMonthlyItem[]) {
  if (monthlyStats.length === 0) {
    return 0;
  }

  const total = monthlyStats.reduce((sum, month) => sum + month.totalRealSpent, 0);
  return round2(total / monthlyStats.length);
}

export function getTrendAboveAverage({
  period,
  monthlyStats,
  heroAmount,
}: {
  period: CraftedStatsPeriod;
  monthlyStats: CraftedStatsMonthlyItem[];
  heroAmount: number;
}) {
  if (period !== "month" || monthlyStats.length < 2) {
    return null;
  }

  const previousMonths = monthlyStats.slice(0, -1);
  const average = getAverageMonthlySpent(previousMonths);

  if (average <= 0) {
    return null;
  }

  return Math.round(((heroAmount - average) / average) * 100);
}

export function getActiveDays(dailySpendingComparison: DailySpendingComparison) {
  return dailySpendingComparison.currentMonth.days.filter(
    (day) => !day.isFuture && day.entriesCount > 0,
  ).length;
}

export function getMonthChartData(monthlyStats: CraftedStatsMonthlyItem[]) {
  const last12 = [...monthlyStats]
    .sort((left, right) => left.month.localeCompare(right.month))
    .slice(-12);
  const maxSpent = Math.max(...last12.map((month) => month.totalRealSpent), 1);
  const activeMonth = last12.at(-1)?.month;

  return last12.map((month) => ({
    month: month.month,
    initial: getMonthInitial(month.label),
    totalRealSpent: month.totalRealSpent,
    totalSaved: month.totalSaved,
    heightPct: (month.totalRealSpent / maxSpent) * 100,
    isActive: month.month === activeMonth,
  }));
}

export function getMaxChartSpent(monthlyStats: CraftedStatsMonthlyItem[]) {
  const last12 = [...monthlyStats]
    .sort((left, right) => left.month.localeCompare(right.month))
    .slice(-12);

  return Math.max(...last12.map((month) => month.totalRealSpent), 0);
}
