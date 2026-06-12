import { subDays } from "date-fns";

import type { CraftedDashboardProps } from "@/src/components/dashboard/crafted-dashboard";
import {
  buildFeaturedGoalNote,
  buildSecondaryGoalNote,
} from "@/src/lib/crafted-goals-build";
import { getGoalCraftedIcon } from "@/src/lib/goal-crafted-icon";
import { getRomeDateKey } from "@/src/lib/rome-dates";

type CategoryStatsItem = {
  categoryName: string;
  categorySlug: string;
  totalRealSpent: number;
  totalSaved: number;
  entriesCount: number;
};

type MonthlyStatsItem = {
  month: string;
  totalRealSpent: number;
  totalSaved: number;
  entriesCount: number;
};

type GoalRow = {
  id: string;
  title: string;
  progressAmount: number;
  targetAmount: number;
  progressPercent: number;
  remainingAmount: number;
  isActive: boolean;
  isCompleted: boolean;
  createdAt: string;
};

type HabitOccurrence = {
  status: string;
  habit: {
    name: string;
  };
};

const CATEGORY_TONES: CraftedDashboardProps["categories"][number]["tone"][] = [
  "accent",
  "foreground",
  "green",
  "muted",
];

function getMonthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    timeZone: "Europe/Rome",
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildStreakWeek(streakDates: string[]) {
  const activeDates = new Set(streakDates);
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const day = subDays(today, 6 - index);
    return activeDates.has(getRomeDateKey(day));
  });
}

function buildHabitsNote(habits: HabitOccurrence[]) {
  const avoided = habits
    .filter((occurrence) => occurrence.status === "avoided")
    .map((occurrence) => occurrence.habit.name.toLowerCase());

  if (avoided.length === 0) {
    return null;
  }

  if (avoided.length === 1) {
    return `${avoided[0]}, evitata.`;
  }

  if (avoided.length === 2) {
    return `${avoided[0]} e ${avoided[1]}, evitate.`;
  }

  return `${avoided.slice(0, -1).join(", ")} e ${avoided.at(-1)}, evitate.`;
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
  monthSaved: number;
  monthLargeComparisonImpact: number;
  spentToday: number;
  entriesTodayCount: number;
  entriesCountMonth: number;
  monthlyStats: MonthlyStatsItem[];
  categoryStats: CategoryStatsItem[];
  currentStreak: number;
  streakDates: string[];
  todayHabits: HabitOccurrence[];
  goals: GoalRow[];
  recentEntries: CraftedDashboardProps["recentEntries"];
  reflection: CraftedDashboardProps["reflection"];
  emptyState: CraftedDashboardProps["emptyState"];
  coupleBalance: CraftedDashboardProps["coupleBalance"];
}): CraftedDashboardProps {
  const now = new Date();
  const monthLabel = getMonthLabel(now);
  const monthTrend = input.monthlyStats.slice(-6).map((item) => item.totalRealSpent);
  const previousMonth = input.monthlyStats.at(-2);
  const currentMonth = input.monthlyStats.at(-1);
  const monthDelta =
    previousMonth && currentMonth
      ? round2(currentMonth.totalRealSpent - previousMonth.totalRealSpent)
      : null;

  return {
    monthLabel,
    monthRealSpent: input.monthRealSpent,
    monthSaved: input.monthSaved,
    monthLargeComparisonImpact: input.monthLargeComparisonImpact,
    monthDelta,
    monthTrend,
    spentToday: input.spentToday,
    entriesTodayCount: input.entriesTodayCount,
    entriesCountMonth: input.entriesCountMonth,
    categories: buildCraftedCategories(input.categoryStats),
    currentStreak: input.currentStreak,
    streakWeek: buildStreakWeek(input.streakDates),
    habitsTotal: input.todayHabits.length,
    habitsAvoided: input.todayHabits.filter(
      (occurrence) => occurrence.status === "avoided",
    ).length,
    habitsNote: buildHabitsNote(input.todayHabits),
    goals: input.goals.slice(0, 2).map((goal, index) => ({
      id: goal.id,
      title: goal.title,
      progressAmount: goal.progressAmount,
      targetAmount: goal.targetAmount,
      progressPercent: goal.progressPercent,
      note:
        index === 0
          ? buildFeaturedGoalNote(goal)
          : buildSecondaryGoalNote(goal),
      icon: getGoalCraftedIcon(goal.title),
    })),
    recentEntries: input.recentEntries,
    reflection: input.reflection,
    emptyState: input.emptyState,
    coupleBalance: input.coupleBalance,
  };
}
