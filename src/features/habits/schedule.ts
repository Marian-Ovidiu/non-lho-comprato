import { it } from "@/src/lib/i18n/it";
import type { Translations } from "@/src/lib/i18n";
import {
  getDateParts,
  getDaysInMonth,
  getIsoWeekday,
} from "@/src/lib/workspace-dates";

/**
 * Persisted shape of Habit.activeDays: ISO weekdays (1-7) for weekly habits,
 * or a monthly cadence with a day of month. Stored as Json, so every reader
 * must treat it as unknown and validate.
 */
export type HabitSchedule =
  | number[]
  | {
      cadence: "monthly";
      day: number;
    };

function getFormText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeActiveDays(values: number[]): number[] {
  return Array.from(new Set(values))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7)
    .sort((a, b) => a - b);
}

export function isMonthlyHabitSchedule(
  value: unknown,
): value is { cadence: "monthly"; day: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const schedule = value as { cadence?: unknown; day?: unknown };
  return schedule.cadence === "monthly" && Number.isInteger(Number(schedule.day));
}

export function isHabitScheduledForDate(
  schedule: unknown,
  date: Date,
  timeZone: string,
): boolean {
  if (isMonthlyHabitSchedule(schedule)) {
    const parts = getDateParts(date, timeZone);
    const targetDay = Math.min(
      Math.max(1, Number(schedule.day)),
      getDaysInMonth(parts.year, parts.month),
    );

    return parts.day === targetDay;
  }

  if (!Array.isArray(schedule)) {
    return false;
  }

  const activeDays = normalizeActiveDays(
    schedule.map((value) => Number(value)).filter(Number.isFinite),
  );

  return activeDays.includes(getIsoWeekday(date, timeZone));
}

export function parseActiveDays(
  formData: FormData,
  m: Translations["habitActions"] = it.habitActions,
): {
  value: HabitSchedule;
  error?: string;
} {
  const recurrenceType = getFormText(formData, "recurrenceType") || "weekly";

  if (recurrenceType === "monthly") {
    const day = Number(getFormText(formData, "activeDayOfMonth"));

    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return {
        value: [],
        error: m.scheduleDayOfMonth,
      };
    }

    return {
      value: {
        cadence: "monthly",
        day,
      },
    };
  }

  const rawValues = formData.getAll("activeDays");
  const collected: number[] = [];

  for (const rawValue of rawValues) {
    if (typeof rawValue !== "string") {
      continue;
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          collected.push(
            ...parsed.map((item) => Number(item)).filter(Number.isFinite),
          );
          continue;
        }
      } catch {
        // Fall back to the generic split logic below.
      }
    }

    const tokens = trimmed.split(/[\s,]+/);
    for (const token of tokens) {
      if (!token) {
        continue;
      }

      const day = Number(token);
      if (!Number.isFinite(day)) {
        return {
          value: [],
          error: m.scheduleInvalid,
        };
      }

      collected.push(day);
    }
  }

  const activeDays = normalizeActiveDays(collected);

  if (!activeDays.length) {
    return {
      value: [],
      error: m.scheduleAtLeastOneDay,
    };
  }

  return { value: activeDays };
}
