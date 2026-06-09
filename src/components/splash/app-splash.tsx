"use client";

import { useEffect, useState } from "react";

import { FlameSplash } from "@/src/components/brand/flame-splash";
import { clearSplashBootstrapShell } from "@/src/lib/splash";

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

  useEffect(() => {
    clearSplashBootstrapShell();
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), minDuration);
    const t2 = setTimeout(() => {
      setGone(true);
      onDone?.();
    }, minDuration + fadeDuration);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [fadeDuration, minDuration, onDone]);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9999] transition-opacity ease-out"
      style={{
        opacity: leaving ? 0 : 1,
        transitionDuration: `${fadeDuration}ms`,
      }}
    >
      <FlameSplash />
    </div>
  );
}
