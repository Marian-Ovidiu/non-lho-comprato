const ROME_TIME_ZONE = "Europe/Rome";

type RomeDateParts = {
  year: number;
  month: number;
  day: number;
};

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

  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(
    2,
    "0",
  )}-${String(parts.day).padStart(2, "0")}`;
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

export function isNextRomeCalendarDay(
  previousDateKey: string,
  nextDateKey: string,
): boolean {
  return shiftDateKey(previousDateKey, 1) === nextDateKey;
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
