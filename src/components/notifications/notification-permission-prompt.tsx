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
  const [hasInteracted, setHasInteracted] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (hasInteracted) {
      return;
    }

    const markInteracted = () => {
      setHasInteracted(true);
      if (isNotificationSupported() && Notification.permission === "default") {
        setVisible(true);
      }
    };

    window.addEventListener("pointerdown", markInteracted, { once: true });
    window.addEventListener("keydown", markInteracted, { once: true });

    return () => {
      window.removeEventListener("pointerdown", markInteracted);
      window.removeEventListener("keydown", markInteracted);
    };
  }, [hasInteracted]);

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
        isNotificationSupported() &&
          Notification.permission === "default" &&
          hasInteracted,
      );
    }
  }, [hasInteracted]);

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
          Vuoi ricevere un promemoria quando serve?
        </p>
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0 rounded-xl px-3 text-xs"
          disabled={requesting}
          onClick={() => void handleRequest()}
        >
          {requesting ? "Attendi…" : "Attiva"}
        </Button>
      </div>
    </div>
  );
}
