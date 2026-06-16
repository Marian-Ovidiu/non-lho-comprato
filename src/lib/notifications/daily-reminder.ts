import {
  getLocalTodayDateKey,
  markNotificationSentToday,
  wasNotificationSentToday,
} from "@/src/lib/notifications/daily-reminder-storage";

const REMINDER_HOUR = 18;
const REMINDER_MINUTE = 0;

const DAILY_REMINDER_TITLE = "Non l'ho comprato";
const DAILY_REMINDER_BODY =
  "Non hai ancora registrato movimenti oggi. Apri l'app e tieni traccia.";
const DAILY_REMINDER_ICON = "/icons/icon-192.png";

function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function getLocalHourMinute(date = new Date()): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return {
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? 0),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? 0),
  };
}

/** Current local time expressed as total minutes since midnight. */
export function getLocalNowMinutes(date = new Date()): number {
  const { hour, minute } = getLocalHourMinute(date);
  return hour * 60 + minute;
}

/** True when local Rome time is strictly after 18:00. */
export function isAfterReminderHour(
  date = new Date(),
  hour = REMINDER_HOUR,
  minute = REMINDER_MINUTE,
): boolean {
  const { hour: currentHour, minute: currentMinute } = getLocalHourMinute(date);
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const reminderTotalMinutes = hour * 60 + minute;

  return currentTotalMinutes > reminderTotalMinutes;
}

export function shouldTriggerDailyReminder({
  hasTodayEntries,
  now = new Date(),
}: {
  hasTodayEntries: boolean;
  now?: Date;
}): boolean {
  if (hasTodayEntries) {
    return false;
  }

  if (!isAfterReminderHour(now)) {
    return false;
  }

  if (wasNotificationSentToday(now)) {
    return false;
  }

  return true;
}

export async function showDailyReminderNotification(now = new Date()): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  const tag = `nlc-daily-reminder-${getLocalTodayDateKey(now)}`;
  const options = {
    body: DAILY_REMINDER_BODY,
    icon: DAILY_REMINDER_ICON,
    tag,
    data: { url: "/" },
  };

  // Prefer service-worker-backed notification: works on installed Android PWA and iOS 16.4+ PWA.
  // Guard with controller check to avoid a hanging .ready promise when no SW controls the page.
  if (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    navigator.serviceWorker.controller !== null
  ) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(DAILY_REMINDER_TITLE, options);
      return true;
    } catch (error) {
      console.error("SW notification failed, falling back to direct API:", error);
    }
  }

  // Direct Notification API fallback (desktop browsers; does not work on iOS).
  try {
    new Notification(DAILY_REMINDER_TITLE, options);
    return true;
  } catch (error) {
    console.error("Failed to show daily reminder notification:", error);
    return false;
  }
}

/**
 * Runs the daily reminder flow on app open.
 * `resolveHasTodayEntries` returns `null` when the check should be skipped (e.g. logged out).
 */
export async function runDailyReminderOnOpen(
  resolveHasTodayEntries: () => Promise<boolean | null>,
  now = new Date(),
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return;
  }

  if (wasNotificationSentToday(now)) {
    return;
  }

  if (!isAfterReminderHour(now)) {
    return;
  }

  const hasTodayEntries = await resolveHasTodayEntries();

  if (hasTodayEntries === null) {
    return;
  }

  if (!shouldTriggerDailyReminder({ hasTodayEntries, now })) {
    return;
  }

  const notified = await showDailyReminderNotification(now);
  if (notified) {
    markNotificationSentToday(now);
  }
}
