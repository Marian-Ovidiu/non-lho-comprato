import { getDaysInMonth } from "@/src/lib/workspace-dates";
import { round2 } from "@/src/lib/money-number";
import type { CraftedIconName } from "@/components/crafted";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { getTranslations, languageToLocale } from "@/src/lib/i18n";
import {
  getHabitTargetDisplayLabel,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";

export type HabitCadence = "mensile" | "annuale" | "settimanale" | "giornaliera";
export type HabitGroup = "abbonamenti" | "utenze" | "quotidiane";
export type HabitStatus = "attiva" | "pausa" | "da-rivedere";

export type HabitOccurrenceStatus = "pending" | "spent" | "avoided" | "skipped";

export type CraftedHabitTodayOccurrence = {
  occurrenceId: string;
  status: HabitOccurrenceStatus;
};

export type CraftedHabitView = {
  id: string;
  name: string;
  provider?: string;
  categoryId: string;
  activeDays: unknown;
  isActive: boolean;
  targetScope: string;
  targetUserId: string | null;
  reminderEnabled: boolean;
  reminderTime: string | null;
  icon: CraftedIconName;
  amount: number;
  cadence: HabitCadence;
  group: HabitGroup;
  status: HabitStatus;
  nextDate?: string;
  startedOn: string;
  usageNote?: string;
  who?: string;
  monthlyAmount: number;
  sharePercent: number;
  frequencyLabel: string;
  todayOccurrence: CraftedHabitTodayOccurrence | null;
};

export type CraftedUpcomingHabit = CraftedHabitView & {
  relativeLabel: string;
  shortDate: string;
};

export type CraftedHabitGroupSummary = {
  group: HabitGroup;
  label: string;
  hint: string;
  total: number;
  share: number;
};

export type CraftedHabitsProps = {
  habits: CraftedHabitView[];
  upcoming: CraftedUpcomingHabit[];
  groups: CraftedHabitGroupSummary[];
  reviewHabits: CraftedHabitView[];
  perMonth: number;
  perYear: number;
  activeCount: number;
  pausedCount: number;
  potentialYearlySavings: number;
  currencySymbol: string;
};

function getActiveDayIndices(activeDays: unknown): number[] {
  if (!Array.isArray(activeDays)) return [];
  return activeDays
    .map((value) => Number(value))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
}

function getMonthlyScheduleDay(activeDays: unknown): number | null {
  if (!activeDays || typeof activeDays !== "object" || Array.isArray(activeDays)) {
    return null;
  }

  const schedule = activeDays as { cadence?: unknown; day?: unknown };
  const day = Number(schedule.day);

  if (schedule.cadence !== "monthly" || !Number.isInteger(day)) {
    return null;
  }

  return Math.min(Math.max(day, 1), 31);
}

export function formatHabitFrequency(activeDays: unknown, language = "it") {
  const t = getTranslations(language);
  const monthlyDay = getMonthlyScheduleDay(activeDays);
  if (monthlyDay !== null) {
    return `Ogni mese · giorno ${monthlyDay}`;
  }

  const indices = getActiveDayIndices(activeDays);

  if (indices.length === 0 || indices.length === 7) {
    return t.habits.freqDaily;
  }

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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getHabitGroup(habit: {
  name: string;
  category: { name: string; slug: string };
}): HabitGroup {
  const text = normalize(`${habit.name} ${habit.category.name} ${habit.category.slug}`);

  if (
    /abbon|stream|spotify|netflix|prime|icloud|cloud|claude|chatgpt|post|palestra|gym|virgin|serviz/.test(
      text,
    )
  ) {
    return "abbonamenti";
  }

  if (/uten|casa|affitto|bollett|luce|gas|internet|fibra|wifi|telefono|condomin/.test(text)) {
    return "utenze";
  }

  return "quotidiane";
}

function getCadence(input: {
  amount: number;
  activeDays: unknown;
  group: HabitGroup;
  name: string;
}): HabitCadence {
  const text = normalize(input.name);
  if (getMonthlyScheduleDay(input.activeDays) !== null) {
    return "mensile";
  }

  if (/annuale|year|anno/.test(text)) {
    return "annuale";
  }

  if ((input.group === "abbonamenti" || input.group === "utenze") && input.amount >= 8) {
    return "mensile";
  }

  const activeDays = getActiveDayIndices(input.activeDays);
  if (activeDays.length === 0 || activeDays.length === 7) {
    return "giornaliera";
  }

  return "settimanale";
}

function getMonthlyAmount(input: {
  amount: number;
  cadence: HabitCadence;
  status: HabitStatus;
  activeDays?: unknown;
}) {
  if (input.status === "pausa") {
    return 0;
  }

  if (input.cadence === "mensile") {
    return input.amount;
  }

  if (input.cadence === "annuale") {
    return input.amount / 12;
  }

  if (input.cadence === "settimanale") {
    const activeDays = getActiveDayIndices(input.activeDays);
    const weeklyOccurrences = Math.max(1, activeDays.length);
    return (input.amount * weeklyOccurrences * 52) / 12;
  }

  return (input.amount * 365) / 12;
}

function getCadenceShort(cadence: HabitCadence) {
  if (cadence === "mensile") return "/mese";
  if (cadence === "annuale") return "/anno";
  if (cadence === "settimanale") return "/sett";
  return "/giorno";
}

function isoWeekday(date: Date) {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

function getUtcDateFromKey(dateKey: string) {
  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return new Date();
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function getUtcTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getHabitNextDate(
  activeDays: unknown,
  isActive: boolean,
  fromDateKey = getUtcTodayKey(),
) {
  if (!isActive) {
    return undefined;
  }

  const today = getUtcDateFromKey(fromDateKey);
  const monthlyDay = getMonthlyScheduleDay(activeDays);
  if (monthlyDay !== null) {
    for (let monthOffset = 0; monthOffset <= 1; monthOffset += 1) {
      const candidate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + monthOffset, 1),
      );
      const targetDay = Math.min(
        monthlyDay,
        getDaysInMonth(candidate.getUTCFullYear(), candidate.getUTCMonth() + 1),
      );
      candidate.setUTCDate(targetDay);

      if (candidate >= today) {
        return candidate.toISOString().slice(0, 10);
      }
    }
  }

  const activeSet = new Set(getActiveDayIndices(activeDays));
  const allDays = activeSet.size === 0 || activeSet.size === 7;

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(today);
    candidate.setUTCDate(candidate.getUTCDate() + offset);

    if (allDays || activeSet.has(isoWeekday(candidate))) {
      return candidate.toISOString().slice(0, 10);
    }
  }

  return undefined;
}

export function getHabitRelativeLabel(dateKey: string, fromDateKey = getUtcTodayKey()) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const today = getUtcDateFromKey(fromDateKey);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);

  if (diffDays === 0) return "oggi";
  if (diffDays === 1) return "domani";
  return `fra ${diffDays}g`;
}

export function getHabitShortDate(dateKey: string, language: string) {
  return new Intl.DateTimeFormat(languageToLocale(language), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${dateKey}T00:00:00.000Z`))
    .replace(".", "");
}

function buildUsageNote(stats?: {
  spentCount: number;
  avoidedCount: number;
  skippedCount: number;
  pendingCount: number;
  totalOccurrences: number;
}) {
  if (!stats || stats.totalOccurrences === 0) {
    return undefined;
  }

  if (stats.skippedCount > stats.spentCount) {
    return `saltata ${stats.skippedCount} volte`;
  }

  // Il conteggio delle evitate non compare più: la nota dice quante volte è
  // stata pagata, che è il dato che l'occorrenza produce davvero.
  if (stats.spentCount > 0) {
    return stats.spentCount === 1 ? "pagata 1 volta" : `pagata ${stats.spentCount} volte`;
  }

  return undefined;
}

function getStatus(input: {
  isActive: boolean;
  group: HabitGroup;
  monthlyAmount: number;
  stats?: {
    spentCount: number;
    avoidedCount: number;
    skippedCount: number;
    disciplineRatePercent: number;
    totalOccurrences: number;
  };
}): HabitStatus {
  if (!input.isActive) {
    return "pausa";
  }

  // "Da rivedere" si appoggiava alla disciplina, cioè alla quota di occorrenze
  // segnate come evitate: ora che non si possono più segnare quella quota è
  // sempre zero, e la regola avrebbe marcato ogni abbonamento sopra gli 8 euro.
  // Meglio nessun verdetto di un verdetto automatico su tutti.
  return "attiva";
}

function groupLabel(group: HabitGroup) {
  if (group === "abbonamenti") return "Abbonamenti";
  if (group === "utenze") return "Utenze & casa";
  return "Quotidiane";
}

function groupHint(group: HabitGroup) {
  if (group === "abbonamenti") return "servizi che si rinnovano";
  if (group === "utenze") return "casa e bollette";
  return "piccole ripetizioni";
}

export function buildCraftedHabitsProps({
  habits,
  habitStats,
  currencySymbol = "€",
  language = "it",
  members = [],
  currentUserId = null,
  todayDateKey,
  todayOccurrences = [],
}: {
  todayOccurrences?: Array<{
    id: string;
    habitId: string;
    status: HabitOccurrenceStatus;
  }>;
  habits: Array<{
    id: string;
    name: string;
    amount: number;
    activeDays: unknown;
    isActive: boolean;
    categoryId: string;
    targetScope: string;
    targetUserId: string | null;
    reminderEnabled: boolean;
    reminderTime: string | null;
    createdAt: string;
    category: {
      name: string;
      slug: string;
    };
  }>;
  habitStats: Array<{
    habitId: string;
    avoidedCount: number;
    spentCount: number;
    skippedCount: number;
    pendingCount: number;
    totalOccurrences: number;
    disciplineRatePercent: number;
    totalSaved: number;
  }>;
  currencySymbol?: string;
  language?: string;
  members?: WorkspaceMemberOption[];
  currentUserId?: string | null;
  todayDateKey?: string;
}): CraftedHabitsProps {
  const statsByHabitId = new Map(habitStats.map((item) => [item.habitId, item]));
  const occurrenceByHabitId = new Map(
    todayOccurrences.map((occurrence) => [
      occurrence.habitId,
      { occurrenceId: occurrence.id, status: occurrence.status },
    ]),
  );
  const currentDateKey = todayDateKey ?? getUtcTodayKey();

  const firstPass = habits.map((habit) => {
    const group = getHabitGroup(habit);
    const stats = statsByHabitId.get(habit.id);
    const pausedStatus: HabitStatus = habit.isActive ? "attiva" : "pausa";
    const cadence = getCadence({
      amount: habit.amount,
      activeDays: habit.activeDays,
      group,
      name: habit.name,
    });
    const monthlyBeforeReview = round2(
      getMonthlyAmount({
        amount: habit.amount,
        cadence,
        status: pausedStatus,
        activeDays: habit.activeDays,
      }),
    );
    const status = getStatus({
      isActive: habit.isActive,
      group,
      monthlyAmount: monthlyBeforeReview,
      stats,
    });
    const monthlyAmount = round2(
      getMonthlyAmount({
        amount: habit.amount,
        cadence,
        status,
        activeDays: habit.activeDays,
      }),
    );

    return {
      id: habit.id,
      name: habit.name,
      categoryId: habit.categoryId,
      activeDays: habit.activeDays,
      isActive: habit.isActive,
      targetScope: habit.targetScope,
      targetUserId: habit.targetUserId,
      reminderEnabled: habit.reminderEnabled,
      reminderTime: habit.reminderTime,
      icon: getCategoryCraftedIcon(habit.category),
      amount: habit.amount,
      cadence,
      cadenceShort: getCadenceShort(cadence),
      group,
      status,
      nextDate: getHabitNextDate(habit.activeDays, habit.isActive, currentDateKey),
      startedOn: habit.createdAt,
      usageNote: status === "da-rivedere" ? buildUsageNote(stats) ?? "poco segnale utile" : buildUsageNote(stats),
      who: getHabitTargetDisplayLabel({
        targetScope: habit.targetScope,
        targetUserId: habit.targetUserId,
        currentUserId,
        members,
      }).toLowerCase(),
      monthlyAmount,
      sharePercent: 0,
      frequencyLabel: formatHabitFrequency(habit.activeDays, language),
      todayOccurrence: occurrenceByHabitId.get(habit.id) ?? null,
    } satisfies CraftedHabitView & { cadenceShort: string };
  });

  const perMonth = round2(firstPass.reduce((sum, habit) => sum + habit.monthlyAmount, 0));
  const perYear = round2(perMonth * 12);
  const views: CraftedHabitView[] = firstPass.map((habit) => ({
    ...habit,
    sharePercent: perMonth > 0 ? round2((habit.monthlyAmount / perMonth) * 100) : 0,
  }));

  const groups = (["abbonamenti", "utenze", "quotidiane"] as const).map((group) => {
    const total = round2(
      views
        .filter((habit) => habit.group === group)
        .reduce((sum, habit) => sum + habit.monthlyAmount, 0),
    );

    return {
      group,
      label: groupLabel(group),
      hint: groupHint(group),
      total,
      share: perMonth > 0 ? round2((total / perMonth) * 100) : 0,
    };
  });

  const upcoming = views
    .filter((habit) => habit.status !== "pausa" && habit.nextDate)
    .map((habit) => ({
      ...habit,
      relativeLabel: getHabitRelativeLabel(habit.nextDate!, currentDateKey),
      shortDate: getHabitShortDate(habit.nextDate!, language),
    }))
    .filter((habit) => !habit.relativeLabel.startsWith("fra 8"))
    .sort((left, right) => left.nextDate!.localeCompare(right.nextDate!))
    .slice(0, 12);

  const reviewHabits = views.filter((habit) => habit.status === "da-rivedere");

  return {
    habits: views.sort(
      (left, right) =>
        left.group.localeCompare(right.group) ||
        (right.monthlyAmount - left.monthlyAmount) ||
        left.name.localeCompare(right.name, "it"),
    ),
    upcoming,
    groups,
    reviewHabits,
    perMonth,
    perYear,
    activeCount: views.filter((habit) => habit.status !== "pausa").length,
    pausedCount: views.filter((habit) => habit.status === "pausa").length,
    potentialYearlySavings: round2(
      reviewHabits.reduce((sum, habit) => sum + habit.monthlyAmount * 12, 0),
    ),
    currencySymbol,
  };
}
