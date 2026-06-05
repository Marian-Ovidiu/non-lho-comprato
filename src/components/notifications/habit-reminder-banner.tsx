"use client";

import { useEffect, useMemo, useSyncExternalStore, useState } from "react";
import { Bell, ExternalLink, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReminderOccurrence = {
  id: string;
  status: "pending" | "spent" | "avoided" | "skipped";
  habit: {
    name: string;
    isActive: boolean;
    reminderEnabled: boolean;
    reminderTime: string | null;
  };
};

type HabitReminderBannerProps = {
  occurrences: ReminderOccurrence[];
};

const STORAGE_PREFIX = "habit-reminder-active:";
const CHANGE_EVENT = "habit-reminder-active-change";

function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function getLocalDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseReminderMinutes(time: string | null | undefined): number | null {
  if (!time) {
    return null;
  }

  const match = time.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function getNowMinutes(date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

function getStorageKey(dateKey: string): string {
  return `${STORAGE_PREFIX}${dateKey}`;
}

function readActiveIdsSnapshot(dateKey: string): string {
  if (typeof window === "undefined") {
    return "";
  }

  const raw = window.localStorage.getItem(getStorageKey(dateKey));
  if (!raw) {
    return "";
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return "";
    }

    return parsed
      .filter((value): value is string => typeof value === "string")
      .join("|");
  } catch {
    return "";
  }
}

function parseActiveIdsSnapshot(snapshot: string): string[] {
  if (!snapshot) {
    return [];
  }

  return snapshot.split("|").filter(Boolean);
}

function writeActiveIds(dateKey: string, ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  const nextSnapshot = ids.join("|");
  if (readActiveIdsSnapshot(dateKey) === nextSnapshot) {
    return;
  }

  const key = getStorageKey(dateKey);

  if (ids.length === 0) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, JSON.stringify(ids));
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function acknowledge(occurrenceIds: string[], dateKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  for (const occurrenceId of occurrenceIds) {
    const storageKey = `${STORAGE_PREFIX}${dateKey}:${occurrenceId}`;
    window.sessionStorage.setItem(storageKey, "1");
    window.localStorage.setItem(storageKey, "1");
  }
}

function wasAcknowledged(occurrenceId: string, dateKey: string): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const storageKey = `${STORAGE_PREFIX}${dateKey}:${occurrenceId}`;
  return (
    window.sessionStorage.getItem(storageKey) === "1" ||
    window.localStorage.getItem(storageKey) === "1"
  );
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => listener();
  window.addEventListener(CHANGE_EVENT, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

export function HabitReminderBanner({ occurrences }: HabitReminderBannerProps) {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => {
      setTick(Date.now());
    };

    refresh();

    const intervalId = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const now = useMemo(() => new Date(tick), [tick]);
  const nowMinutes = useMemo(() => getNowMinutes(now), [now]);
  const dateKey = getLocalDateKey(now);
  const permissionGranted =
    isNotificationSupported() && Notification.permission === "granted";
  const dueReminders = useMemo(() => {
    return occurrences
      .filter((occurrence) => occurrence.status === "pending")
      .filter((occurrence) => occurrence.habit.isActive)
      .filter((occurrence) => occurrence.habit.reminderEnabled)
      .filter((occurrence) => {
        const reminderMinutes = parseReminderMinutes(occurrence.habit.reminderTime);
        return reminderMinutes !== null && reminderMinutes <= nowMinutes;
      })
      .filter((occurrence) => !wasAcknowledged(occurrence.id, dateKey));
  }, [dateKey, nowMinutes, occurrences]);

  const activeReminderSnapshot = useSyncExternalStore(
    subscribe,
    () => readActiveIdsSnapshot(dateKey),
    () => "",
  );
  const activeReminderIds = parseActiveIdsSnapshot(activeReminderSnapshot);
  const activeReminderKey = activeReminderSnapshot;

  useEffect(() => {
    if (dueReminders.length === 0) {
      if (activeReminderIds.length > 0) {
        writeActiveIds(dateKey, []);
      }
      return;
    }

    const reminderIds = dueReminders.map((item) => item.id);

    const reminderKey = reminderIds.join("|");

    if (permissionGranted) {
      const names = dueReminders.slice(0, 2).map((item) => item.habit.name);
      const extraCount = dueReminders.length - names.length;
      const body =
        dueReminders.length === 1
          ? `${names[0]} è in attesa di verifica.`
          : `${names.join(", ")}${extraCount > 0 ? ` e altre ${extraCount}` : ""} sono in attesa di verifica.`;

      const notification = new Notification("Controlla le abitudini di oggi", {
        body,
        tag: `habit-reminder-${dateKey}`,
      });

      notification.onclick = () => {
        window.focus();
        window.location.hash = "oggi";
        notification.close();
      };

      acknowledge(reminderIds, dateKey);
      if (activeReminderIds.length > 0) {
        writeActiveIds(dateKey, []);
      }
      return;
    }

    if (activeReminderIds.length === 0) {
      acknowledge(reminderIds, dateKey);
      writeActiveIds(dateKey, reminderIds);
      return;
    }

    if (activeReminderKey !== reminderKey) {
      acknowledge(reminderIds, dateKey);
      writeActiveIds(dateKey, reminderIds);
    }
  }, [activeReminderIds.length, activeReminderKey, dateKey, dueReminders, permissionGranted]);

  const visibleReminders = useMemo(() => {
    const visibleIds =
      activeReminderIds.length > 0
        ? activeReminderIds
        : !permissionGranted
          ? dueReminders.map((item) => item.id)
          : [];

    if (visibleIds.length === 0) {
      return [];
    }

    return occurrences.filter((occurrence) => visibleIds.includes(occurrence.id));
  }, [activeReminderIds, dueReminders, occurrences, permissionGranted]);

  if (visibleReminders.length === 0 || permissionGranted) {
    return null;
  }

  const title =
    visibleReminders.length === 1
      ? "Hai un promemoria per oggi"
      : `Hai ${visibleReminders.length} abitudini da controllare`;

  const description =
    visibleReminders.length === 1
      ? `${visibleReminders[0].habit.name} è in attesa di conferma.`
      : `${visibleReminders.slice(0, 2).map((item) => item.habit.name).join(", ")}${visibleReminders.length > 2 ? ` e altre ${visibleReminders.length - 2}` : ""} sono in attesa di conferma.`;

  return (
    <div
      role="region"
      aria-label="Promemoria abitudini"
      className={cn(
        "rounded-[14px] border border-border bg-surface p-4 shadow-sm",
        "dark:bg-surface-muted",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background">
          <Bell className="size-4 text-muted-text" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm leading-6 text-muted-text">
            {description} I promemoria funzionano quando l&apos;app è aperta o installata.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" className="h-9 rounded-full px-3">
              <Link href="#oggi">
                Vai a oggi
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-full px-3"
              onClick={() => {
                writeActiveIds(dateKey, []);
              }}
            >
              <X className="size-3.5" aria-hidden="true" />
              Chiudi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
