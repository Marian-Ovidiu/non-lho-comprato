import type { CraftedIconName } from "@/components/crafted";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";

const weekdayOptions = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Gio" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sab" },
  { value: 7, label: "Dom" },
] as const;

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

function getActiveDayLabels(activeDays: unknown): string[] {
  if (!Array.isArray(activeDays)) {
    return [];
  }

  return weekdayOptions
    .filter((day) => activeDays.map((value) => Number(value)).includes(day.value))
    .map((day) => day.label);
}

export function formatHabitFrequency(activeDays: unknown) {
  const labels = getActiveDayLabels(activeDays);

  if (labels.length === 0 || labels.length === 7) {
    return "Ogni giorno";
  }

  if (labels.length === 5 && !labels.includes("Sab") && !labels.includes("Dom")) {
    return "Feriali";
  }

  if (labels.length === 1) {
    return `Ogni ${labels[0]!.toLowerCase()}`;
  }

  return labels.join(", ");
}

export function formatHabitSub(amount: number, activeDays: unknown) {
  const amountLabel = amount.toLocaleString("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return `${amountLabel}€ · ${formatHabitFrequency(activeDays).toLowerCase()}`;
}

export function buildHabitsNote(
  occurrences: Array<{ status: string; habit: { name: string } }>,
) {
  const avoided = occurrences
    .filter((occurrence) => occurrence.status === "avoided")
    .map((occurrence) => occurrence.habit.name.toLowerCase());

  if (avoided.length === 0) {
    return null;
  }

  if (avoided.length === 1) {
    return `${avoided[0]}, già evitata.`;
  }

  if (avoided.length === 2) {
    return `${avoided[0]} e ${avoided[1]}, già evitate.`;
  }

  return `${avoided.slice(0, -1).join(", ")} e ${avoided.at(-1)}, già evitate.`;
}

function getMonthLabel() {
  const label = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    timeZone: "Europe/Rome",
  }).format(new Date());

  return label.toLowerCase();
}

export function buildCraftedHabitsProps({
  todayOccurrences,
  habits,
  habitStats,
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
}): CraftedHabitsProps {
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
      sub: formatHabitSub(occurrence.habit.amount, occurrence.habit.activeDays),
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
          freq: formatHabitFrequency(habit.activeDays),
          icon: getCategoryCraftedIcon(habit.category),
          completionLabel:
            considered > 0
              ? `${considered} confermate · ${stats?.avoidedCount ?? 0} evitate`
              : "Nessuna conferma ancora",
          progressPercent: stats?.disciplineRatePercent ?? 0,
          monthImpact: stats?.totalSaved ?? 0,
        };
      }),
    avoidedToday,
    pendingToday,
    totalToday: todayOccurrences.length,
    habitsNote: buildHabitsNote(todayOccurrences),
    activeCount: habits.filter((habit) => habit.isActive).length,
    monthSaved: habitStats.reduce((sum, item) => sum + item.totalSaved, 0),
    monthLabel: getMonthLabel(),
  };
}
