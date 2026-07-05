export const DEFAULT_WORKSPACE_TIMEZONE = "Europe/Rome";

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function formatDateKey(parts: DateParts): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(
    2,
    "0",
  )}-${String(parts.day).padStart(2, "0")}`;
}

function formatMonthKey(parts: Pick<DateParts, "year" | "month">): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(
    2,
    "0",
  )}`;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function parseDateKey(dateKey: string): DateParts | null {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function parseMonthKey(monthKey: string): Pick<DateParts, "year" | "month"> | null {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

function getTimeZoneParts(
  date: Date,
  timeZone: string,
): DateParts & { hour: number; minute: number; second: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
    hour: Number(parts.find((part) => part.type === "hour")?.value),
    minute: Number(parts.find((part) => part.type === "minute")?.value),
    second: Number(parts.find((part) => part.type === "second")?.value),
  };
}

function getMidnightUtc(dateParts: DateParts, timeZone: string): Date {
  const utcMidnight = new Date(
    Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, 0, 0, 0, 0),
  );
  const localParts = getTimeZoneParts(utcMidnight, timeZone);
  // The offset must come from the full local date-time, not just the local
  // time of day: for UTC-negative zones the local calendar day at utcMidnight
  // is the previous one, which a time-only offset would miss by 24 hours.
  const localAsUtcMillis = Date.UTC(
    localParts.year,
    localParts.month - 1,
    localParts.day,
    localParts.hour,
    localParts.minute,
    localParts.second,
  );
  const offsetMillis = localAsUtcMillis - utcMidnight.getTime();

  return new Date(utcMidnight.getTime() - offsetMillis);
}

export function isDateKey(value: string): boolean {
  return parseDateKey(value) !== null;
}

/**
 * Parses a calendar-day key ("YYYY-MM-DD", as sent by <input type="date">)
 * into the canonical Entry.date instant: midnight of that day in the
 * workspace timezone. Returns null for anything that is not a valid day key.
 */
export function parseWorkspaceDateKey(
  dateKey: string,
  timeZone: string,
): Date | null {
  const parts = parseDateKey(dateKey);

  if (!parts) {
    return null;
  }

  return getMidnightUtc(parts, timeZone);
}

export function getDateParts(date: Date, timeZone: string): DateParts {
  const parts = getTimeZoneParts(date, timeZone);

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

export function getDateKey(date: Date, timeZone: string): string {
  const parts = getDateParts(date, timeZone);

  if (
    !Number.isFinite(parts.year) ||
    !Number.isFinite(parts.month) ||
    !Number.isFinite(parts.day)
  ) {
    return "";
  }

  return formatDateKey(parts);
}

export function getMonthKey(date: Date, timeZone: string): string {
  const dateKey = getDateKey(date, timeZone);

  if (!dateKey) {
    return "";
  }

  return dateKey.slice(0, 7);
}

export function getTodayDateKey(timeZone: string, now: Date = new Date()): string {
  return getDateKey(now, timeZone);
}

/** Use this in client components to get "today" in the user's browser timezone. */
export function getBrowserTodayDateKey(now: Date = new Date()): string {
  return getTodayDateKey(Intl.DateTimeFormat().resolvedOptions().timeZone, now);
}

export function normalizeMonthKey(
  timeZone: string,
  input?: string,
  now: Date = new Date(),
): string {
  return input && parseMonthKey(input) ? input : getMonthKey(now, timeZone);
}

export function getPreviousMonthKey(monthKey: string): string {
  const parts = parseMonthKey(monthKey);

  if (!parts) {
    return monthKey;
  }

  const previousMonth = new Date(Date.UTC(parts.year, parts.month - 2, 1));

  return formatMonthKey({
    year: previousMonth.getUTCFullYear(),
    month: previousMonth.getUTCMonth() + 1,
  });
}

export function getDayRangeForDate(date: Date, timeZone: string): { start: Date; end: Date } {
  const parts = getDateParts(date, timeZone);
  const start = getMidnightUtc(parts, timeZone);
  const nextDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  const endParts = {
    year: nextDay.getUTCFullYear(),
    month: nextDay.getUTCMonth() + 1,
    day: nextDay.getUTCDate(),
  };

  return {
    start,
    end: getMidnightUtc(endParts, timeZone),
  };
}

export function getDayRangeForDateKey(
  dateKey: string,
  timeZone: string,
): { start: Date; end: Date } {
  const parts = parseDateKey(dateKey);

  if (!parts) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  const start = getMidnightUtc(parts, timeZone);
  const nextDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));

  return {
    start,
    end: getMidnightUtc(
      {
        year: nextDay.getUTCFullYear(),
        month: nextDay.getUTCMonth() + 1,
        day: nextDay.getUTCDate(),
      },
      timeZone,
    ),
  };
}

export function getMonthRangeForMonthKey(
  monthKey: string,
  timeZone: string,
): { start: Date; end: Date } {
  const parts = parseMonthKey(monthKey);

  if (!parts) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  const nextMonth = new Date(Date.UTC(parts.year, parts.month, 1));

  return {
    start: getMidnightUtc({ year: parts.year, month: parts.month, day: 1 }, timeZone),
    end: getMidnightUtc(
      {
        year: nextMonth.getUTCFullYear(),
        month: nextMonth.getUTCMonth() + 1,
        day: 1,
      },
      timeZone,
    ),
  };
}

/**
 * Counts the calendar months from fromMonthKey to toMonthKey, inclusive on
 * both ends ("2026-01" → "2026-07" = 7). Months without activity count too,
 * so averages over the result are not inflated. Returns 0 for invalid keys
 * or when the range is reversed.
 */
export function countCalendarMonthsInclusive(
  fromMonthKey: string,
  toMonthKey: string,
): number {
  const from = parseMonthKey(fromMonthKey);
  const to = parseMonthKey(toMonthKey);

  if (!from || !to) {
    return 0;
  }

  const months = (to.year - from.year) * 12 + (to.month - from.month) + 1;

  return months > 0 ? months : 0;
}

/**
 * Counts how many times a given day-of-month occurs in [fromDateKey,
 * toDateKeyExclusive). Months too short for the day (e.g. the 31st in
 * February) contribute no occurrence.
 */
export function countDayOfMonthOccurrences(
  fromDateKey: string,
  toDateKeyExclusive: string,
  dayOfMonth: number,
): number {
  const from = parseDateKey(fromDateKey);
  const to = parseDateKey(toDateKeyExclusive);

  if (!from || !to || !Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    return 0;
  }

  let count = 0;
  const cursor = new Date(Date.UTC(from.year, from.month - 1, 1));
  const end = Date.UTC(to.year, to.month - 1, 1);

  while (cursor.getTime() <= end) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    if (dayOfMonth <= daysInMonth) {
      const candidate = formatDateKey({ year, month, day: dayOfMonth });

      if (candidate >= fromDateKey && candidate < toDateKeyExclusive) {
        count += 1;
      }
    }

    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return count;
}

export function getIsoWeekday(date: Date, timeZone: string): number {
  const parts = getDateParts(date, timeZone);
  const utcWeekday = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  ).getUTCDay();

  return ((utcWeekday + 6) % 7) + 1;
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return "";
  }

  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() + deltaDays);

  return `${String(shifted.getUTCFullYear()).padStart(4, "0")}-${String(
    shifted.getUTCMonth() + 1,
  ).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

export function isNextCalendarDay(previousDateKey: string, nextDateKey: string): boolean {
  return shiftDateKey(previousDateKey, 1) === nextDateKey;
}

export function formatDateLabel(dateKey: string, locale = "it-IT"): string {
  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return dateKey;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatMonthLabel(monthKey: string, locale = "it-IT"): string {
  const parts = parseMonthKey(monthKey);

  if (!parts) {
    return monthKey;
  }

  const raw = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, 1)));

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function buildStreakResult(dateKeys: Iterable<string>): {
  currentStreak: number;
  bestStreak: number;
  streakDates: string[];
} {
  const streakDates = Array.from(
    new Set(
      Array.from(dateKeys).filter(
        (dateKey) => typeof dateKey === "string" && dateKey.length > 0,
      ),
    ),
  ).sort((left, right) => left.localeCompare(right));

  if (streakDates.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      streakDates: [],
    };
  }

  const segments: string[][] = [];
  let currentSegment = [streakDates[0]];

  for (let index = 1; index < streakDates.length; index += 1) {
    const currentDate = streakDates[index];
    const previousDate = currentSegment[currentSegment.length - 1];

    if (isNextCalendarDay(previousDate, currentDate)) {
      currentSegment.push(currentDate);
      continue;
    }

    segments.push(currentSegment);
    currentSegment = [currentDate];
  }

  segments.push(currentSegment);

  const bestSegment = segments.reduce((longest, segment) =>
    segment.length > longest.length ? segment : longest,
  );
  const latestSegment = segments[segments.length - 1];

  return {
    currentStreak: latestSegment.length,
    bestStreak: bestSegment.length,
    streakDates: latestSegment,
  };
}
