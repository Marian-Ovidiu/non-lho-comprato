"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void> | void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    // Safari iPhone/iPad
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export function InstallButton() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const updateInstalledState = () => {
      setInstalled(isStandaloneDisplay());
    };

    updateInstalledState();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setInstallable(true);
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setInstallable(false);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("focus", updateInstalledState);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("focus", updateInstalledState);
    };
  }, []);

  if (!installable || installed) {
    return null;
  }

  const handleInstall = async () => {
    const deferredPrompt = deferredPromptRef.current;

    if (!deferredPrompt) {
      return;
    }

    try {
      setInstallable(false);

      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      deferredPromptRef.current = null;

      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
    } catch (error) {
      deferredPromptRef.current = null;
      setInstallable(true);
      console.error("Errore durante l'installazione dell'app:", error);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          void handleInstall();
        }}
        className="gap-2 rounded-full border-border bg-surface text-foreground hover:bg-surface-muted hover:text-foreground"
      >
        <Download className="size-4" aria-hidden="true" />
        <span>Installa app</span>
      </Button>
      <p className="max-w-[18rem] text-xs leading-5 text-muted-text">
        Aggiungi Non l&apos;ho comprato alla schermata Home.
      </p>
    </div>
  );
}

