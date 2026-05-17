"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function NotificationPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!isNotificationSupported()) {
      return;
    }

    if (Notification.permission === "default") {
      setVisible(true);
    }
  }, []);

  const handleRequest = useCallback(async () => {
    if (!isNotificationSupported()) {
      return;
    }

    setRequesting(true);
    try {
      await Notification.requestPermission();
    } finally {
      setRequesting(false);
      setVisible(
        isNotificationSupported() && Notification.permission === "default",
      );
    }
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Richiesta permesso notifiche"
      className={cn(
        "fixed inset-x-0 z-50 flex justify-center px-4",
        "bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] md:bottom-6",
      )}
    >
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5 shadow-lg dark:bg-surface-muted">
        <Bell
          className="size-4 shrink-0 text-muted-text"
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 text-sm text-foreground">
          Vuoi ricevere notifiche da Non l&apos;ho comprato?
        </p>
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0 rounded-xl px-3 text-xs"
          disabled={requesting}
          onClick={() => void handleRequest()}
        >
          {requesting ? "Attendi…" : "Abilita"}
        </Button>
      </div>
    </div>
  );
}
