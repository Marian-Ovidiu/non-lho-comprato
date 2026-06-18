import {
  DEFAULT_WORKSPACE_TIMEZONE,
  getDateKey,
  getDayRangeForDateKey,
  getIsoWeekday,
  getMonthKey,
  getMonthRangeForMonthKey,
  shiftDateKey,
} from "@/src/lib/workspace-dates";

import type { BudgetPeriod } from "@/src/lib/budget-model";

export type BudgetPeriodRange = {
  start: Date;
  end: Date;
};

function clampFraction(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

export function getBudgetPeriodRange(
  period: BudgetPeriod,
  timeZone = DEFAULT_WORKSPACE_TIMEZONE,
  now: Date = new Date(),
): BudgetPeriodRange {
  if (period === "monthly") {
    const monthKey = getMonthKey(now, timeZone);
    return getMonthRangeForMonthKey(monthKey, timeZone);
  }

  const dateKey = getDateKey(now, timeZone);
  const weekStartDateKey = shiftDateKey(dateKey, 1 - getIsoWeekday(now, timeZone));
  const nextWeekStartDateKey = shiftDateKey(weekStartDateKey, 7);

  return {
    start: getDayRangeForDateKey(weekStartDateKey, timeZone).start,
    end: getDayRangeForDateKey(nextWeekStartDateKey, timeZone).start,
  };
}

export function getBudgetElapsedFraction(
  periodStart: Date,
  periodEnd: Date,
  now: Date = new Date(),
): number {
  const startMs = periodStart.getTime();
  const endMs = periodEnd.getTime();
  const nowMs = now.getTime();

  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    !Number.isFinite(nowMs) ||
    endMs <= startMs
  ) {
    return 0;
  }

  const clampedNowMs = Math.min(Math.max(nowMs, startMs), endMs);
  const fraction = (clampedNowMs - startMs) / (endMs - startMs);

  return clampFraction(fraction);
}
