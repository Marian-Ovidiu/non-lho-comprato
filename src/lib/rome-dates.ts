export const ROME_TIME_ZONE = "Europe/Rome";

type RomeDateParts = {
  year: number;
  month: number;
  day: number;
};

function formatDateKey(parts: RomeDateParts): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(
    2,
    "0",
  )}-${String(parts.day).padStart(2, "0")}`;
}

function formatMonthKey(parts: Pick<RomeDateParts, "year" | "month">): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(
    2,
    "0",
  )}`;
}

function parseRomeDateKey(dateKey: string): RomeDateParts | null {
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

function parseRomeMonthKey(monthKey: string): Pick<RomeDateParts, "year" | "month"> | null {
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

function getTimeZoneParts(date: Date, timeZone: string): RomeDateParts & {
  hour: number;
  minute: number;
  second: number;
} {
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

function getRomeMidnightUtc(dateParts: RomeDateParts): Date {
  const utcMidnight = new Date(
    Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, 0, 0, 0, 0),
  );
  const localParts = getTimeZoneParts(utcMidnight, ROME_TIME_ZONE);
  const offsetMillis =
    ((localParts.hour * 60 + localParts.minute) * 60 + localParts.second) * 1000;

  return new Date(utcMidnight.getTime() - offsetMillis);
}

export function getRomeDateParts(date: Date): RomeDateParts {
  const parts = getTimeZoneParts(date, ROME_TIME_ZONE);

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

export function getRomeDateKey(date: Date): string {
  const parts = getRomeDateParts(date);

  if (
    !Number.isFinite(parts.year) ||
    !Number.isFinite(parts.month) ||
    !Number.isFinite(parts.day)
  ) {
    return "";
  }

  return formatDateKey(parts);
}

export function getRomeMonthKey(date: Date): string {
  const dateKey = getRomeDateKey(date);

  if (!dateKey) {
    return "";
  }

  return dateKey.slice(0, 7);
}

export function getRomeTodayDateKey(now: Date = new Date()): string {
  return getRomeDateKey(now);
}

export function normalizeRomeMonthKey(
  input?: string,
  now: Date = new Date(),
): string {
  return input && parseRomeMonthKey(input) ? input : getRomeMonthKey(now);
}

export function getPreviousRomeMonthKey(monthKey: string): string {
  const parts = parseRomeMonthKey(monthKey);

  if (!parts) {
    return monthKey;
  }

  const previousMonth = new Date(Date.UTC(parts.year, parts.month - 2, 1));

  return formatMonthKey({
    year: previousMonth.getUTCFullYear(),
    month: previousMonth.getUTCMonth() + 1,
  });
}

export function getRomeDayRangeForDate(date: Date): { start: Date; end: Date } {
  const parts = getRomeDateParts(date);
  const start = getRomeMidnightUtc(parts);
  const nextDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  const endParts = {
    year: nextDay.getUTCFullYear(),
    month: nextDay.getUTCMonth() + 1,
    day: nextDay.getUTCDate(),
  };

  return {
    start,
    end: getRomeMidnightUtc(endParts),
  };
}

export function getRomeDayRangeForDateKey(dateKey: string): {
  start: Date;
  end: Date;
} {
  const parts = parseRomeDateKey(dateKey);

  if (!parts) {
    throw new Error(`Invalid Rome date key: ${dateKey}`);
  }

  const start = getRomeMidnightUtc(parts);
  const nextDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));

  return {
    start,
    end: getRomeMidnightUtc({
      year: nextDay.getUTCFullYear(),
      month: nextDay.getUTCMonth() + 1,
      day: nextDay.getUTCDate(),
    }),
  };
}

export function getRomeMonthRangeForMonthKey(monthKey: string): {
  start: Date;
  end: Date;
} {
  const parts = parseRomeMonthKey(monthKey);

  if (!parts) {
    throw new Error(`Invalid Rome month key: ${monthKey}`);
  }

  const nextMonth = new Date(Date.UTC(parts.year, parts.month, 1));

  return {
    start: getRomeMidnightUtc({
      year: parts.year,
      month: parts.month,
      day: 1,
    }),
    end: getRomeMidnightUtc({
      year: nextMonth.getUTCFullYear(),
      month: nextMonth.getUTCMonth() + 1,
      day: 1,
    }),
  };
}

export function getRomeIsoWeekday(date: Date): number {
  const parts = getRomeDateParts(date);
  const utcWeekday = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  ).getUTCDay();

  return ((utcWeekday + 6) % 7) + 1;
}

function shiftDateKey(dateKey: string, deltaDays: number): string {
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

export function shiftRomeDateKey(
  dateKey: string,
  deltaDays: number,
): string {
  return shiftDateKey(dateKey, deltaDays);
}

export function isNextRomeCalendarDay(
  previousDateKey: string,
  nextDateKey: string,
): boolean {
  return shiftDateKey(previousDateKey, 1) === nextDateKey;
}

export function formatRomeDateLabel(dateKey: string): string {
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

export function formatRomeMonthLabel(monthKey: string): string {
  const parts = parseRomeMonthKey(monthKey);

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

export function buildRomeStreakResult(dateKeys: Iterable<string>): {
  currentStreak: number;
  bestStreak: number;
  streakDates: string[];
} {
  const streakDates = Array.from(
    new Set(
      Array.from(dateKeys).filter((dateKey) => typeof dateKey === "string" && dateKey.length > 0),
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

    if (isNextRomeCalendarDay(previousDate, currentDate)) {
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
