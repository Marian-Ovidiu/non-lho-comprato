"use client";

import { useSyncExternalStore } from "react";

type DisplayModeSnapshot = {
  isStandalone: boolean;
  isBrowser: boolean;
};

const DEFAULT_SNAPSHOT: DisplayModeSnapshot = {
  isStandalone: false,
  isBrowser: true,
};

function readSnapshot(): DisplayModeSnapshot {
  if (typeof window === "undefined") {
    return DEFAULT_SNAPSHOT;
  }

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;

  return {
    isStandalone,
    isBrowser: !isStandalone,
  };
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("focus", listener);
  window.addEventListener("pageshow", listener);
  window.addEventListener("visibilitychange", listener);

  return () => {
    window.removeEventListener("focus", listener);
    window.removeEventListener("pageshow", listener);
    window.removeEventListener("visibilitychange", listener);
  };
}

export function useDisplayMode(): DisplayModeSnapshot {
  return useSyncExternalStore(subscribe, readSnapshot, () => DEFAULT_SNAPSHOT);
}
