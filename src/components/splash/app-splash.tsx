"use client";

import { useEffect, useLayoutEffect, useState } from "react";

import { FlameSplash } from "@/src/components/brand/flame-splash";
import {
  clearSplashBootstrapShell,
  getSplashElapsedMs,
} from "@/src/lib/splash";

type AppSplashProps = {
  minDuration?: number;
  fadeDuration?: number;
  onDone?: () => void;
};

export function AppSplash({
  minDuration = 1400,
  fadeDuration = 400,
  onDone,
}: AppSplashProps) {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useLayoutEffect(() => {
    // Hand off from the static bootstrap shell only after FlameSplash is in the DOM.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        clearSplashBootstrapShell();
      });
    });
  }, []);

  useEffect(() => {
    const elapsed = getSplashElapsedMs();
    const remaining = Math.max(minDuration - elapsed, 320);

    const t1 = window.setTimeout(() => setLeaving(true), remaining);
    const t2 = window.setTimeout(() => {
      setGone(true);
      onDone?.();
    }, remaining + fadeDuration);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [fadeDuration, minDuration, onDone]);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[10000] transition-opacity ease-out"
      style={{
        opacity: leaving ? 0 : 1,
        transitionDuration: `${fadeDuration}ms`,
      }}
    >
      <FlameSplash />
    </div>
  );
}
