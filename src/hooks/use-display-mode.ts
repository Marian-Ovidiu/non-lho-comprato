"use client";

import { useSyncExternalStore } from "react";

function readStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
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

export function useDisplayMode() {
  const isStandalone = useSyncExternalStore(
    subscribe,
    readStandaloneMode,
    () => false,
  );

  return {
    isStandalone,
    isBrowser: !isStandalone,
  };
}
