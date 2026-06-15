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

function parseDateKey(dateKey: string): DateParts | null {
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
  const offsetMillis =
    ((localParts.hour * 60 + localParts.minute) * 60 + localParts.second) * 1000;

  return new Date(utcMidnight.getTime() - offsetMillis);
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

export function formatDateLabel(dateKey: string): string {
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

  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatMonthLabel(monthKey: string): string {
  const parts = parseMonthKey(monthKey);

  if (!parts) {
    return monthKey;
  }

  const raw = new Intl.DateTimeFormat("it-IT", {
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
