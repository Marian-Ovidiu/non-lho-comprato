import { round2 } from "@/src/lib/money-number";

import type { CraftedDashboardProps } from "@/src/components/dashboard/crafted-dashboard";
import type {
  CategoryStatsItem as StatsCategoryStatsItem,
  MonthlyStatsItem as StatsMonthlyStatsItem,
} from "@/src/features/stats/insights";
import { languageToLocale } from "@/src/lib/i18n";
import type { BudgetDashboardSelection } from "@/src/lib/budget-summary";

type CategoryStatsItem = Pick<
  StatsCategoryStatsItem,
  "categoryName" | "categorySlug" | "totalRealSpent" | "totalSaved" | "entriesCount"
>;

type MonthlyStatsItem = Pick<
  StatsMonthlyStatsItem,
  "month" | "totalRealSpent" | "totalSaved" | "entriesCount"
>;

type HabitOccurrence = {
  status: string;
  habit: {
    name: string;
  };
};

type UpcomingHabitPayment = CraftedDashboardProps["nextHabitPayment"];
type DailyPaceComparison = CraftedDashboardProps["dailyPaceComparison"];

const CATEGORY_TONES: CraftedDashboardProps["categories"][number]["tone"][] = [
  "accent",
  "foreground",
  "green",
  "muted",
];

function getMonthLabel(date: Date, timeZone: string, language: string) {
  const label = new Intl.DateTimeFormat(languageToLocale(language), {
    month: "long",
    timeZone,
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function buildCraftedCategories(
  categoryStats: CategoryStatsItem[],
): CraftedDashboardProps["categories"] {
  const ranked = [...categoryStats]
    .filter((item) => item.totalRealSpent > 0)
    .sort(
      (left, right) =>
        right.totalRealSpent - left.totalRealSpent ||
        right.entriesCount - left.entriesCount ||
        right.totalSaved - left.totalSaved,
    )
    .slice(0, 4);

  const totalSpent = ranked.reduce((sum, item) => sum + item.totalRealSpent, 0);

  if (totalSpent <= 0) {
    return [];
  }

  return ranked.map((item, index) => ({
    name: item.categoryName,
    slug: item.categorySlug,
    count: item.entriesCount,
    spent: round2(item.totalRealSpent),
    saved: round2(item.totalSaved),
    pct: Math.max(1, Math.round((item.totalRealSpent / totalSpent) * 100)),
    tone: CATEGORY_TONES[index] ?? "muted",
  }));
}

export function buildCraftedDashboardProps(input: {
  monthRealSpent: number;
  monthFixedSpent: number;
  monthCurrentSpent: number;
  monthFixedItems: CraftedDashboardProps["monthFixedItems"];
  monthPreviousCurrentSpent: number | null;
  shortcuts: CraftedDashboardProps["shortcuts"];
  spentToday: number;
  entriesTodayCount: number;
  monthlyStats: MonthlyStatsItem[];
  categoryStats: CategoryStatsItem[];
  currentStreak: number;
  todayHabits: HabitOccurrence[];
  nextHabitPayment: UpcomingHabitPayment;
  dailyPaceComparison: DailyPaceComparison;
  reflection: CraftedDashboardProps["reflection"];
  emptyState: CraftedDashboardProps["emptyState"];
  coupleBalance: CraftedDashboardProps["coupleBalance"];
  budgetDashboardState: BudgetDashboardSelection;
  timeZone: string;
  currency: string;
  language: string;
}): CraftedDashboardProps {
  const now = new Date();
  const monthLabel = getMonthLabel(now, input.timeZone, input.language);
  // Il confronto col mese scorso gira sulla spesa corrente: sui totali
  // misurerebbe soprattutto in che giorno è caduto l'affitto.
  const monthDelta =
    input.monthPreviousCurrentSpent !== null
      ? round2(input.monthCurrentSpent - input.monthPreviousCurrentSpent)
      : null;

  return {
    monthLabel,
    monthRealSpent: input.monthRealSpent,
    monthFixedSpent: input.monthFixedSpent,
    monthCurrentSpent: input.monthCurrentSpent,
    monthFixedItems: input.monthFixedItems,
    shortcuts: input.shortcuts,
    monthDelta,
    spentToday: input.spentToday,
    entriesTodayCount: input.entriesTodayCount,
    categories: buildCraftedCategories(input.categoryStats),
    currentStreak: input.currentStreak,
    habitsTotal: input.todayHabits.length,
    habitsDone: input.todayHabits.filter(
      (occurrence) => occurrence.status !== "pending",
    ).length,
    nextHabitPayment: input.nextHabitPayment,
    dailyPaceComparison: input.dailyPaceComparison,
    reflection: input.reflection,
    emptyState: input.emptyState,
    coupleBalance: input.coupleBalance,
    budgetDashboardState: input.budgetDashboardState,
  };
}
