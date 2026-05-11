"use client";

import { useSyncExternalStore } from "react";
import { Download, Share2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void> | void;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type PwaInstallSnapshot = {
  canPrompt: boolean;
  installed: boolean;
  ios: boolean;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installationAcknowledged = false;
let initialized = false;
const listeners = new Set<() => void>();

function isStandaloneDisplay() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function isIosDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  const { userAgent, platform, maxTouchPoints } = window.navigator;
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1)
  );
}

function readSnapshot(): PwaInstallSnapshot {
  const installed = isStandaloneDisplay() || installationAcknowledged;
  const ios = isIosDevice();

  return {
    canPrompt: deferredPrompt !== null && !installed && !ios,
    installed,
    ios,
  };
}

function emit() {
  listeners.forEach((listener) => listener());
}

function ensureListeners() {
  if (initialized || typeof window === "undefined") {
    return;
  }

  initialized = true;

  const refresh = () => {
    emit();
  };

  const handleBeforeInstallPrompt = (event: Event) => {
    if (isStandaloneDisplay() || isIosDevice()) {
      return;
    }

    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  };

  const handleAppInstalled = () => {
    installationAcknowledged = true;
    deferredPrompt = null;
    emit();
  };

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);
  window.addEventListener("focus", refresh);
  window.addEventListener("visibilitychange", refresh);
}

function subscribe(listener: () => void) {
  ensureListeners();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function usePwaInstallState() {
  return useSyncExternalStore(subscribe, readSnapshot, readSnapshot);
}

async function promptInstall() {
  const promptEvent = deferredPrompt;

  if (!promptEvent) {
    return;
  }

  try {
    deferredPrompt = null;
    emit();

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;

    if (choice.outcome === "accepted") {
      installationAcknowledged = true;
      emit();
    }
  } catch (error) {
    console.error("Errore durante l'installazione dell'app:", error);
  } finally {
    deferredPrompt = null;
    emit();
  }
}

type InstallButtonProps = {
  compact?: boolean;
  className?: string;
};

export function InstallButton({
  compact = false,
  className,
}: InstallButtonProps) {
  const { canPrompt, installed, ios } = usePwaInstallState();

  if (installed || ios || !canPrompt) {
    return null;
  }

  if (compact) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          void promptInstall();
        }}
        className={cn(
          "gap-2 rounded-full border-border bg-surface text-foreground hover:bg-surface-muted hover:text-foreground",
          className,
        )}
      >
        <Download className="size-4" aria-hidden="true" />
        <span>Installa app</span>
      </Button>
    );
  }

  return (
    <div className={cn("flex flex-col items-start gap-1.5", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          void promptInstall();
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

export function PwaInstallContent() {
  const { canPrompt, installed, ios } = usePwaInstallState();

  if (installed) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">App già installata</Badge>
        <p className="text-sm text-muted-text">
          La trovi già nella schermata Home.
        </p>
      </div>
    );
  }

  if (ios) {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-muted-text">
          Apri il menu Condividi e scegli “Aggiungi alla schermata Home”.
        </p>

        <ol className="space-y-2 text-sm text-foreground">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-foreground">
              1
            </span>
            <span>Tocca Condividi</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-foreground">
              2
            </span>
            <span>Tocca Aggiungi alla schermata Home</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-foreground">
              3
            </span>
            <span>Conferma</span>
          </li>
        </ol>

        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-muted-text">
          <Share2 className="size-3.5" aria-hidden="true" />
          Funziona da Safari su iPhone
        </p>
      </div>
    );
  }

  if (canPrompt) {
    return <InstallButton compact />;
  }

  return (
    <p className="text-sm leading-6 text-muted-text">
      Apri il sito in Chrome, Edge o Safari per vedere l&apos;opzione di
      installazione.
    </p>
  );
}
