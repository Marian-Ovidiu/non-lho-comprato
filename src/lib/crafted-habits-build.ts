import type { CraftedIconName } from "@/components/crafted";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { getTranslations, languageToLocale } from "@/src/lib/i18n";

export type CraftedTodayHabit = {
  id: string;
  habitId: string;
  name: string;
  sub: string;
  icon: CraftedIconName;
  status: "pending" | "spent" | "avoided" | "skipped";
};

export type CraftedAllHabit = {
  id: string;
  name: string;
  freq: string;
  icon: CraftedIconName;
  completionLabel: string;
  progressPercent: number;
  monthImpact: number;
};

export type CraftedHabitsProps = {
  today: CraftedTodayHabit[];
  all: CraftedAllHabit[];
  avoidedToday: number;
  pendingToday: number;
  totalToday: number;
  habitsNote: string | null;
  activeCount: number;
  monthSaved: number;
  monthLabel: string;
};

function getActiveDayIndices(activeDays: unknown): number[] {
  if (!Array.isArray(activeDays)) return [];
  return activeDays.map((value) => Number(value)).filter((n) => n >= 1 && n <= 7);
}

export function formatHabitFrequency(activeDays: unknown, language = "it") {
  const t = getTranslations(language);
  const indices = getActiveDayIndices(activeDays);

  if (indices.length === 0 || indices.length === 7) {
    return t.habits.freqDaily;
  }

  // Mon–Fri only (indices 1–5, no 6=Sat, no 7=Sun)
  if (indices.length === 5 && !indices.includes(6) && !indices.includes(7)) {
    return t.habits.freqWeekdays;
  }

  if (indices.length === 1) {
    const label = t.habitCard.weekdays[indices[0]! - 1] ?? String(indices[0]);
    return t.habits.freqOnce(label);
  }

  return indices.map((i) => t.habitCard.weekdays[i - 1]).filter(Boolean).join(", ");
}

export function formatHabitSub(
  amount: number,
  activeDays: unknown,
  currencySymbol = "€",
  language = "it",
) {
  const locale = languageToLocale(language);
  const amountLabel = amount.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return `${amountLabel}${currencySymbol} · ${formatHabitFrequency(activeDays, language).toLowerCase()}`;
}

export function buildHabitsNote(
  occurrences: Array<{ status: string; habit: { name: string } }>,
  language = "it",
) {
  const t = getTranslations(language);
  const avoided = occurrences
    .filter((occurrence) => occurrence.status === "avoided")
    .map((occurrence) => occurrence.habit.name.toLowerCase());

  if (avoided.length === 0) {
    return null;
  }

  if (avoided.length === 1) {
    return t.habits.avoidedNoteOne(avoided[0]!);
  }

  if (avoided.length === 2) {
    return t.habits.avoidedNoteTwo(avoided[0]!, avoided[1]!);
  }

  return t.habits.avoidedNoteMany(avoided.slice(0, -1).join(", "), avoided.at(-1)!);
}

function getMonthLabel(language: string) {
  const label = new Intl.DateTimeFormat(languageToLocale(language), {
    month: "long",
    timeZone: "Europe/Rome",
  }).format(new Date());

  return label.toLowerCase();
}

export function buildCraftedHabitsProps({
  todayOccurrences,
  habits,
  habitStats,
  currencySymbol = "€",
  language = "it",
}: {
  todayOccurrences: Array<{
    id: string;
    habitId: string;
    status: "pending" | "spent" | "avoided" | "skipped";
    habit: {
      name: string;
      amount: number;
      activeDays: unknown;
      isActive: boolean;
      category: {
        name: string;
        slug: string;
      };
    };
  }>;
  habits: Array<{
    id: string;
    name: string;
    amount: number;
    activeDays: unknown;
    isActive: boolean;
    category: {
      name: string;
      slug: string;
    };
  }>;
  habitStats: Array<{
    habitId: string;
    avoidedCount: number;
    spentCount: number;
    disciplineRatePercent: number;
    totalSaved: number;
  }>;
  currencySymbol?: string;
  language?: string;
}): CraftedHabitsProps {
  const t = getTranslations(language);
  const statsByHabitId = new Map(habitStats.map((item) => [item.habitId, item]));
  const avoidedToday = todayOccurrences.filter(
    (occurrence) => occurrence.status === "avoided",
  ).length;
  const pendingToday = todayOccurrences.filter(
    (occurrence) => occurrence.status === "pending",
  ).length;

  return {
    today: todayOccurrences.map((occurrence) => ({
      id: occurrence.id,
      habitId: occurrence.habitId,
      name: occurrence.habit.name,
      sub: formatHabitSub(occurrence.habit.amount, occurrence.habit.activeDays, currencySymbol, language),
      icon: getCategoryCraftedIcon(occurrence.habit.category),
      status: occurrence.status,
    })),
    all: habits
      .filter((habit) => habit.isActive)
      .map((habit) => {
        const stats = statsByHabitId.get(habit.id);
        const considered = (stats?.avoidedCount ?? 0) + (stats?.spentCount ?? 0);

        return {
          id: habit.id,
          name: habit.name,
          freq: formatHabitFrequency(habit.activeDays, language),
          icon: getCategoryCraftedIcon(habit.category),
          completionLabel:
            considered > 0
              ? t.habits.completionStats(considered, stats?.avoidedCount ?? 0)
              : t.habits.completionNone,
          progressPercent: stats?.disciplineRatePercent ?? 0,
          monthImpact: stats?.totalSaved ?? 0,
        };
      }),
    avoidedToday,
    pendingToday,
    totalToday: todayOccurrences.length,
    habitsNote: buildHabitsNote(todayOccurrences, language),
    activeCount: habits.filter((habit) => habit.isActive).length,
    monthSaved: habitStats.reduce((sum, item) => sum + item.totalSaved, 0),
    monthLabel: getMonthLabel(language),
  };
}
