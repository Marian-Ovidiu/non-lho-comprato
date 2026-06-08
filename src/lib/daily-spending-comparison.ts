import { getRomeDateKey, getRomeDateParts } from "@/src/lib/rome-dates";

type DecimalLike = {
  toString?: () => string;
};

export type DailySpendingEntry = {
  date: Date;
  realCost: unknown;
};

export type DailySpendingCell = {
  day: number;
  dateKey: string | null;
  totalRealSpent: number;
  entriesCount: number;
  isFuture: boolean;
  isToday: boolean;
};

export type DailySpendingMonthRow = {
  monthKey: string;
  label: string;
  days: DailySpendingCell[];
  totalRealSpent: number;
};

export type DailySpendingComparison = {
  currentMonth: DailySpendingMonthRow;
  previousMonth: DailySpendingMonthRow | null;
  maxDailySpent: number;
  monthToDateDelta: number | null;
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === "object") {
    const decimal = value as DecimalLike;
    if (typeof decimal.toString === "function") {
      const parsed = Number(decimal.toString().replace(",", "."));
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  return 0;
}

function formatMonthLabel(year: number, monthIndex: number): string {
  const raw = new Intl.DateTimeFormat("it-IT", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));

  const normalized = raw.replace(/\./g, "").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }

  return { year, month: month - 1 };
}

function buildMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function aggregateDailyTotals(entries: readonly DailySpendingEntry[]): {
  dayTotals: Map<string, number>;
  dayEntryCounts: Map<string, number>;
} {
  const dayTotals = new Map<string, number>();
  const dayEntryCounts = new Map<string, number>();

  for (const entry of entries) {
    const dateKey = getRomeDateKey(entry.date);
    if (!dateKey) {
      continue;
    }

    const amount = toNumber(entry.realCost);
    dayTotals.set(dateKey, round2((dayTotals.get(dateKey) ?? 0) + amount));
    dayEntryCounts.set(dateKey, (dayEntryCounts.get(dateKey) ?? 0) + 1);
  }

  return { dayTotals, dayEntryCounts };
}

function hasEntriesInMonth(
  dayEntryCounts: Map<string, number>,
  monthKey: string,
): boolean {
  for (const dateKey of dayEntryCounts.keys()) {
    if (dateKey.startsWith(`${monthKey}-`)) {
      return true;
    }
  }

  return false;
}

function buildMonthRow(
  year: number,
  month: number,
  dayTotals: Map<string, number>,
  dayEntryCounts: Map<string, number>,
  options: {
    isCurrentMonth: boolean;
    todayKey: string;
  },
): DailySpendingMonthRow {
  const monthKey = buildMonthKey(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const days: DailySpendingCell[] = [];
  let totalRealSpent = 0;

  for (let day = 1; day <= 31; day += 1) {
    if (day > daysInMonth) {
      days.push({
        day,
        dateKey: null,
        totalRealSpent: 0,
        entriesCount: 0,
        isFuture: false,
        isToday: false,
      });
      continue;
    }

    const dateKey = `${monthKey}-${String(day).padStart(2, "0")}`;
    const totalRealSpentForDay = dayTotals.get(dateKey) ?? 0;
    const entriesCount = dayEntryCounts.get(dateKey) ?? 0;
    const isToday = dateKey === options.todayKey;
    const isFuture = options.isCurrentMonth && dateKey > options.todayKey;

    totalRealSpent = round2(totalRealSpent + totalRealSpentForDay);

    days.push({
      day,
      dateKey,
      totalRealSpent: totalRealSpentForDay,
      entriesCount,
      isFuture,
      isToday,
    });
  }

  return {
    monthKey,
    label: formatMonthLabel(year, month - 1),
    days,
    totalRealSpent,
  };
}

function computeMaxDailySpent(rows: DailySpendingMonthRow[]): number {
  let max = 0;

  for (const row of rows) {
    for (const cell of row.days) {
      if (cell.totalRealSpent > max) {
        max = cell.totalRealSpent;
      }
    }
  }

  return max > 0 ? max : 1;
}

function computeMonthToDateDelta(
  currentMonth: DailySpendingMonthRow,
  previousMonth: DailySpendingMonthRow | null,
  todayDay: number,
): number | null {
  if (!previousMonth) {
    return null;
  }

  const todayCell = currentMonth.days.find((cell) => cell.isToday);
  if (!todayCell?.dateKey) {
    return null;
  }

  let currentSum = 0;
  let previousSum = 0;

  for (const cell of currentMonth.days) {
    if (!cell.dateKey || cell.day > todayDay) {
      continue;
    }

    currentSum = round2(currentSum + cell.totalRealSpent);
  }

  for (const cell of previousMonth.days) {
    if (!cell.dateKey || cell.day > todayDay) {
      continue;
    }

    previousSum = round2(previousSum + cell.totalRealSpent);
  }

  return round2(currentSum - previousSum);
}

export function buildDailySpendingComparison(
  entries: readonly DailySpendingEntry[],
  now: Date = new Date(),
): DailySpendingComparison {
  const todayParts = getRomeDateParts(now);
  const todayKey = getRomeDateKey(now);
  const { dayTotals, dayEntryCounts } = aggregateDailyTotals(entries);

  const currentMonthParts = {
    year: todayParts.year,
    month: todayParts.month,
  };
  const previousMonthParts = getPreviousMonth(
    currentMonthParts.year,
    currentMonthParts.month,
  );
  const previousMonthKey = buildMonthKey(
    previousMonthParts.year,
    previousMonthParts.month,
  );

  const currentMonth = buildMonthRow(
    currentMonthParts.year,
    currentMonthParts.month,
    dayTotals,
    dayEntryCounts,
    {
      isCurrentMonth: true,
      todayKey,
    },
  );

  const previousMonth = hasEntriesInMonth(dayEntryCounts, previousMonthKey)
    ? buildMonthRow(
        previousMonthParts.year,
        previousMonthParts.month,
        dayTotals,
        dayEntryCounts,
        {
          isCurrentMonth: false,
          todayKey,
        },
      )
    : null;

  const rowsForMax = previousMonth
    ? [currentMonth, previousMonth]
    : [currentMonth];

  return {
    currentMonth,
    previousMonth,
    maxDailySpent: computeMaxDailySpent(rowsForMax),
    monthToDateDelta: computeMonthToDateDelta(
      currentMonth,
      previousMonth,
      todayParts.day,
    ),
  };
}
