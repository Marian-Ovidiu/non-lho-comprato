const ROME_TIME_ZONE = "Europe/Rome";
const STORAGE_PREFIX = "nlc_streak_celebration_seen_";

export function getStreakCelebrationDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getStorageKey() {
  return `${STORAGE_PREFIX}${getStreakCelebrationDateKey()}`;
}

export function shouldShowStreakCelebrationToday() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(getStorageKey()) !== "1";
  } catch {
    return false;
  }
}

export function markStreakCelebrationShownToday() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getStorageKey(), "1");
  } catch (error) {
    console.error("Failed to persist streak celebration state:", error);
  }
}
