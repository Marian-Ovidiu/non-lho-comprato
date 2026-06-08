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
  totalSaved: number;
  entriesCount: number;
};

export type CraftedCategoryRow = {
  categoryId: string;
  name: string;
  slug: string;
  saved: number;
  pct: number;
  tone: "accent" | "foreground" | "green" | "muted";
};

export type CraftedStatsQueen = {
  name: string;
  slug: string;
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

function parseLeadingMoney(detail: string): number | null {
  const match = detail.match(/^([\d.]+,\d{2})\s*€/);
  if (!match?.[1]) {
    return null;
  }

  const parsed = Number(match[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
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
  const totalSaved = categories.reduce((sum, category) => sum + category.totalSaved, 0);

  return categories.map((category, index) => ({
    categoryId: category.categoryId,
    name: category.categoryName,
    slug: category.categorySlug,
    saved: category.totalSaved,
    pct:
      totalSaved > 0
        ? Math.round((category.totalSaved / totalSaved) * 100)
        : 0,
    tone: CATEGORY_TONES[index % CATEGORY_TONES.length] ?? "muted",
  }));
}

export function buildCraftedStatsQueen({
  insights,
  categoryStats,
  periodTotalSaved,
}: {
  insights: StatsInsight[];
  categoryStats: CraftedStatsCategoryItem[];
  periodTotalSaved: number;
}): CraftedStatsQueen | null {
  const insight = insights.find((item) => item.id === "best-savings-category");
  const fallback = categoryStats[0];

  if (!insight?.value && !fallback) {
    return null;
  }

  const name = insight?.value ?? fallback!.categoryName;
  const matchedCategory = categoryStats.find(
    (category) => category.categoryName === name,
  );
  const saved =
    (insight?.detail ? parseLeadingMoney(insight.detail) : null) ??
    matchedCategory?.totalSaved ??
    fallback?.totalSaved ??
    0;
  const entriesCount = matchedCategory?.entriesCount ?? fallback?.entriesCount ?? 0;
  const pct =
    periodTotalSaved > 0 ? Math.round((saved / periodTotalSaved) * 100) : 0;

  return {
    name,
    slug: matchedCategory?.categorySlug ?? fallback?.categorySlug ?? "altro",
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

  const periodTotalSaved = monthlyStats.at(-1)?.totalSaved ?? overview.totalSaved;

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
      periodTotalSaved,
    }),
    categories: buildCraftedCategoryRows(categoryStats),
  };
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
      label: `Tenuti a ${currentMonthLabel.split(" ")[0]?.toLowerCase() ?? currentMonthLabel.toLowerCase()}`,
      amount: latestMonth?.totalSaved ?? 0,
      entriesCount: latestMonth?.entriesCount ?? 0,
    };
  }

  if (period === "year") {
    const yearMonths = monthlyStats.filter((month) => month.month.startsWith(currentYear));
    const amount = round2(yearMonths.reduce((sum, month) => sum + month.totalSaved, 0));
    const entriesCount = yearMonths.reduce((sum, month) => sum + month.entriesCount, 0);

    return {
      label: `Tenuti nel ${currentYear}`,
      amount,
      entriesCount,
    };
  }

  return {
    label: "Tenuti in totale",
    amount: overview.totalSaved,
    entriesCount: overview.entriesCount,
  };
}

export function getAverageMonthlySaved(monthlyStats: CraftedStatsMonthlyItem[]) {
  if (monthlyStats.length === 0) {
    return 0;
  }

  const total = monthlyStats.reduce((sum, month) => sum + month.totalSaved, 0);
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
  const average = getAverageMonthlySaved(previousMonths);

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
  const maxSaved = Math.max(...last12.map((month) => month.totalSaved), 1);
  const activeMonth = last12.at(-1)?.month;

  return last12.map((month) => ({
    month: month.month,
    initial: getMonthInitial(month.label),
    totalSaved: month.totalSaved,
    heightPct: (month.totalSaved / maxSaved) * 100,
    isActive: month.month === activeMonth,
  }));
}

export function getMaxChartSaved(monthlyStats: CraftedStatsMonthlyItem[]) {
  const last12 = [...monthlyStats]
    .sort((left, right) => left.month.localeCompare(right.month))
    .slice(-12);

  return Math.max(...last12.map((month) => month.totalSaved), 0);
}
