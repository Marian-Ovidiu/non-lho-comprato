import {
  getRomeTodayDateKey,
  markNotificationSentToday,
  wasNotificationSentToday,
} from "@/src/lib/notifications/daily-reminder-storage";

const ROME_TIME_ZONE = "Europe/Rome";
const REMINDER_HOUR = 18;
const REMINDER_MINUTE = 0;

const DAILY_REMINDER_TITLE = "Non l'ho comprato";
const DAILY_REMINDER_BODY =
  "Non hai ancora registrato movimenti oggi. Apri l'app e tieni traccia.";
const DAILY_REMINDER_ICON = "/icons/icon-192.png";

function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function getRomeHourMinute(date = new Date()): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ROME_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return {
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? 0),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? 0),
  };
}

/** True when local Rome time is strictly after 18:00. */
export function isAfterReminderHour(
  date = new Date(),
  hour = REMINDER_HOUR,
  minute = REMINDER_MINUTE,
): boolean {
  const { hour: currentHour, minute: currentMinute } = getRomeHourMinute(date);
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

export function showDailyReminderNotification(now = new Date()): boolean {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  try {
    const tag = `nlc-daily-reminder-${getRomeTodayDateKey(now)}`;

    new Notification(DAILY_REMINDER_TITLE, {
      body: DAILY_REMINDER_BODY,
      icon: DAILY_REMINDER_ICON,
      tag,
    });

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

  if (showDailyReminderNotification(now)) {
    markNotificationSentToday(now);
  }
}
