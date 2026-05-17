const ROME_TIME_ZONE = "Europe/Rome";
export const LAST_NOTIFICATION_DATE_KEY = "lastNotificationDate";

export function getRomeTodayDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getLastNotificationDate(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(LAST_NOTIFICATION_DATE_KEY);
  } catch {
    return null;
  }
}

export function setLastNotificationDate(dateKey: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LAST_NOTIFICATION_DATE_KEY, dateKey);
  } catch (error) {
    console.error("Failed to persist daily reminder date:", error);
  }
}

export function wasNotificationSentToday(date = new Date()): boolean {
  return getLastNotificationDate() === getRomeTodayDateKey(date);
}

export function markNotificationSentToday(date = new Date()): void {
  setLastNotificationDate(getRomeTodayDateKey(date));
}
