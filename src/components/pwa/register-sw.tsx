"use client";

import { useEffect } from "react";

import { NotificationPermissionPrompt } from "@/src/components/notifications/notification-permission-prompt";

export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        console.error("Errore nella registrazione del service worker:", error);
      }
    };

    void registerServiceWorker();
  }, []);

  return <NotificationPermissionPrompt />;
}
