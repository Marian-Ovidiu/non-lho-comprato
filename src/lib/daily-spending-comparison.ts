import { getDaysInMonth } from "@/src/lib/workspace-dates";
import { round2, toMoneyNumber as toNumber } from "@/src/lib/money-number";
import { getDateKey, getDateParts } from "@/src/lib/workspace-dates";

export type DailySpendingEntry = {
  date: Date;
  realCost: unknown;
};

export type DailySpendingAggregateRow = {
  dateKey: string;
  totalRealSpent: number;
  entriesCount: number;
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

function formatMonthLabel(year: number, monthIndex: number): string {
  const raw = new Intl.DateTimeFormat("it-IT", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));

  const normalized = raw.replace(/\./g, "").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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

function parseMonthKey(monthKey: string): { year: number; month: number } | null {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }

  if (month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

function aggregateDailyTotals(
  entries: readonly DailySpendingEntry[],
  timeZone: string,
): {
  dayTotals: Map<string, number>;
  dayEntryCounts: Map<string, number>;
} {
  const dayTotals = new Map<string, number>();
  const dayEntryCounts = new Map<string, number>();

  for (const entry of entries) {
    const dateKey = getDateKey(entry.date, timeZone);
    if (!dateKey) {
      continue;
    }

    const amount = toNumber(entry.realCost);
    dayTotals.set(dateKey, round2((dayTotals.get(dateKey) ?? 0) + amount));
    dayEntryCounts.set(dateKey, (dayEntryCounts.get(dateKey) ?? 0) + 1);
  }

  return { dayTotals, dayEntryCounts };
}

function aggregateDailyRows(
  rows: readonly DailySpendingAggregateRow[],
): {
  dayTotals: Map<string, number>;
  dayEntryCounts: Map<string, number>;
} {
  const dayTotals = new Map<string, number>();
  const dayEntryCounts = new Map<string, number>();

  for (const row of rows) {
    dayTotals.set(
      row.dateKey,
      round2((dayTotals.get(row.dateKey) ?? 0) + row.totalRealSpent),
    );
    dayEntryCounts.set(
      row.dateKey,
      (dayEntryCounts.get(row.dateKey) ?? 0) + row.entriesCount,
    );
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
    todayKey: string;
    todayMonthKey: string;
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
    const isFuture =
      monthKey > options.todayMonthKey ||
      (monthKey === options.todayMonthKey && dateKey > options.todayKey);

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
  dayLimit: number,
): number | null {
  if (!previousMonth) {
    return null;
  }

  let currentSum = 0;
  let previousSum = 0;

  for (const cell of currentMonth.days) {
    if (!cell.dateKey || cell.day > dayLimit) {
      continue;
    }

    currentSum = round2(currentSum + cell.totalRealSpent);
  }

  for (const cell of previousMonth.days) {
    if (!cell.dateKey || cell.day > dayLimit) {
      continue;
    }

    previousSum = round2(previousSum + cell.totalRealSpent);
  }

  return round2(currentSum - previousSum);
}

function buildDailySpendingComparisonFromTotals(
  totals: {
    dayTotals: Map<string, number>;
    dayEntryCounts: Map<string, number>;
  },
  timeZone: string,
  now: Date = new Date(),
  selectedMonthKey?: string,
): DailySpendingComparison {
  const todayParts = getDateParts(now, timeZone);
  const todayKey = getDateKey(now, timeZone);
  const todayMonthKey = buildMonthKey(todayParts.year, todayParts.month);
  const { dayTotals, dayEntryCounts } = totals;

  const selectedMonthParts = selectedMonthKey
    ? parseMonthKey(selectedMonthKey)
    : null;
  const currentMonthParts = selectedMonthParts ?? {
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
      todayKey,
      todayMonthKey,
    },
  );

  const previousMonth = hasEntriesInMonth(dayEntryCounts, previousMonthKey)
    ? buildMonthRow(
        previousMonthParts.year,
        previousMonthParts.month,
        dayTotals,
        dayEntryCounts,
        {
          todayKey,
          todayMonthKey,
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
      currentMonth.monthKey === todayMonthKey ? todayParts.day : 31,
    ),
  };
}

export function buildDailySpendingComparison(
  entries: readonly DailySpendingEntry[],
  timeZone: string,
  now: Date = new Date(),
  selectedMonthKey?: string,
): DailySpendingComparison {
  return buildDailySpendingComparisonFromTotals(
    aggregateDailyTotals(entries, timeZone),
    timeZone,
    now,
    selectedMonthKey,
  );
}

export function buildDailySpendingComparisonFromRows(
  rows: readonly DailySpendingAggregateRow[],
  timeZone: string,
  now: Date = new Date(),
  selectedMonthKey?: string,
): DailySpendingComparison {
  return buildDailySpendingComparisonFromTotals(
    aggregateDailyRows(rows),
    timeZone,
    now,
    selectedMonthKey,
  );
}
