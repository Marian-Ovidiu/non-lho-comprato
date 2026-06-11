"use client";

import { useSyncExternalStore } from "react";
import { Download, Share2 } from "lucide-react";

import { Label, Mono } from "@/components/crafted";
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
let lastSnapshotKey = "";
let lastSnapshot: PwaInstallSnapshot = {
  canPrompt: false,
  installed: false,
  ios: false,
};
const listeners = new Set<() => void>();

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice() {
  if (typeof window === "undefined") return false;

  const { userAgent, platform, maxTouchPoints } = window.navigator;
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1)
  );
}

function readSnapshot(): PwaInstallSnapshot {
  const installed = isStandaloneDisplay() || installationAcknowledged;
  const ios = isIosDevice();
  const canPrompt = deferredPrompt !== null && !installed && !ios;
  const snapshotKey = `${canPrompt ? 1 : 0}|${installed ? 1 : 0}|${ios ? 1 : 0}`;

  if (snapshotKey === lastSnapshotKey) return lastSnapshot;

  lastSnapshotKey = snapshotKey;
  lastSnapshot = { canPrompt, installed, ios };
  return lastSnapshot;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function ensureListeners() {
  if (initialized || typeof window === "undefined") return;

  initialized = true;

  const refresh = () => emit();

  const handleBeforeInstallPrompt = (event: Event) => {
    if (isStandaloneDisplay() || isIosDevice()) return;
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
  return () => listeners.delete(listener);
}

function usePwaInstallState() {
  return useSyncExternalStore(subscribe, readSnapshot, readSnapshot);
}

function shouldShowInstallSection(snapshot: PwaInstallSnapshot) {
  return !snapshot.installed && (snapshot.canPrompt || snapshot.ios);
}

async function promptInstall() {
  const promptEvent = deferredPrompt;
  if (!promptEvent) return;

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

function CraftedPwaInstallBody({
  snapshot,
}: {
  snapshot: PwaInstallSnapshot;
}) {
  const { canPrompt, ios } = snapshot;

  if (ios) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-ink-3">
          Apri il menu Condividi e scegli &ldquo;Aggiungi alla schermata Home&rdquo;.
        </p>
        <ol className="space-y-2 border-y border-line py-3">
          {[
            "Tocca Condividi",
            "Tocca Aggiungi alla schermata Home",
            "Conferma",
          ].map((step, index) => (
            <li key={step} className="flex items-start gap-3 text-sm">
              <Mono className="mt-0.5 size-5 shrink-0 text-center text-[11px] text-ink-3">
                {index + 1}
              </Mono>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="inline-flex items-center gap-2 text-xs text-ink-3">
          <Share2 className="size-3.5" aria-hidden="true" />
          Funziona da Safari su iPhone
        </p>
      </div>
    );
  }

  if (canPrompt) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-3">
          Aggiungi Non l&apos;ho comprato alla schermata Home.
        </p>
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="flex h-11 w-full items-center justify-center gap-2 border border-line text-[14px] font-semibold transition-opacity hover:opacity-80"
        >
          <Download className="size-4" aria-hidden="true" />
          Installa app
        </button>
      </div>
    );
  }

  return null;
}

export function CraftedPwaInstall() {
  const snapshot = usePwaInstallState();

  if (!shouldShowInstallSection(snapshot)) {
    return null;
  }

  return <CraftedPwaInstallBody snapshot={snapshot} />;
}

export function PwaInstallSection() {
  const snapshot = usePwaInstallState();

  if (!shouldShowInstallSection(snapshot)) {
    return null;
  }

  return (
    <div className="py-4">
      <Label className="mb-3 block">Installa app</Label>
      <CraftedPwaInstallBody snapshot={snapshot} />
    </div>
  );
}

export function InstallButton({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { canPrompt, installed, ios } = usePwaInstallState();

  if (installed || ios || !canPrompt) return null;

  return (
    <button
      type="button"
      onClick={() => void promptInstall()}
      className={cn(
        "inline-flex items-center gap-2 border border-line px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80",
        compact && "rounded-full px-3 py-1.5 text-xs",
        className,
      )}
    >
      <Download className="size-4" aria-hidden="true" />
      Installa app
    </button>
  );
}

export function PwaInstallContent() {
  return <CraftedPwaInstall />;
}
