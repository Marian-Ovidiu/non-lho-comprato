"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CELEBRATION_BLOCK_MS = 5500;
const ENTER_MS = 220;
const EXIT_MS = 180;
const COUNT_UP_MS = 1400;

type StreakCelebrationOverlayProps = {
  streakFrom: number;
  streakTo: number;
  onClose: () => void;
};

type OverlayPhase = "celebrating" | "confirm";

export function StreakCelebrationOverlay({
  streakFrom,
  streakTo,
  onClose,
}: StreakCelebrationOverlayProps) {
  const [phase, setPhase] = useState<OverlayPhase>("celebrating");
  const [displayedStreak, setDisplayedStreak] = useState(streakFrom);
  const [mounted, setMounted] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const openTimer = window.setTimeout(() => {
      setIsEntering(true);
    }, 0);

    return () => window.clearTimeout(openTimer);
  }, [mounted]);

  useEffect(() => {
    setPhase("celebrating");
    setDisplayedStreak(streakFrom);
    setIsExiting(false);

    const blockTimer = window.setTimeout(() => {
      setPhase("confirm");
    }, CELEBRATION_BLOCK_MS);

    return () => window.clearTimeout(blockTimer);
  }, [streakFrom, streakTo]);

  useEffect(() => {
    if (phase !== "celebrating") {
      return;
    }

    if (streakFrom === streakTo) {
      setDisplayedStreak(streakTo);
      return;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_UP_MS);
      const nextValue = Math.round(streakFrom + (streakTo - streakFrom) * progress);
      setDisplayedStreak(nextValue);

      if (progress < 1) {
        window.requestAnimationFrame(tick);
      }
    };

    const frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [phase, streakFrom, streakTo]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  function closeOverlay() {
    if (isExiting) {
      return;
    }

    setIsExiting(true);
    setIsEntering(false);

    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
    }

    exitTimerRef.current = window.setTimeout(() => {
      onClose();
    }, EXIT_MS);
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6",
        "bg-[radial-gradient(circle_at_center,rgba(212,180,131,0.18)_0%,rgba(9,9,11,0.74)_55%,rgba(9,9,11,0.9)_100%)]",
        "backdrop-blur-xl transition-[opacity,background-color,backdrop-filter] duration-200 ease-out motion-reduce:transition-none",
        isEntering ? "opacity-100" : "opacity-0",
        isExiting && "opacity-0",
      )}
      role="presentation"
      aria-hidden={phase === "celebrating"}
      onClick={closeOverlay}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="streak-celebration-title"
        className={cn(
          "flex w-full max-w-md flex-col items-center rounded-3xl border border-border/80 bg-surface/96 px-6 py-10 text-center shadow-[0_28px_90px_rgba(0,0,0,0.42)]",
          "transition-[transform,opacity,box-shadow,border-color] duration-200 ease-out motion-reduce:transition-none",
          isEntering ? "scale-100 opacity-100" : "scale-[0.97] opacity-0",
          isExiting && "scale-[0.985] opacity-0",
          phase === "confirm" && "border-premium-accent/30 shadow-[0_32px_100px_rgba(0,0,0,0.46)]",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {phase === "celebrating" ? (
          <>
            <div className="streak-flame-wrap mb-6 flex size-24 items-center justify-center rounded-full bg-premium-accent/15">
              <Flame
                className={cn(
                  "size-14 text-orange-500",
                  "streak-celebration-flame-pulse",
                )}
                aria-hidden="true"
              />
            </div>

            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-text">
              Giorni consecutivi
            </p>

            <p
              className={cn(
                "mt-2 text-6xl font-semibold tabular-nums tracking-tight text-foreground",
                displayedStreak === streakTo && streakTo > streakFrom
                  ? "streak-celebration-count-pop"
                  : null,
              )}
              aria-live="polite"
            >
              {displayedStreak}
            </p>

            <p className="mt-4 text-sm leading-6 text-muted-text">
              Il ritmo si aggiorna…
            </p>
          </>
        ) : (
          <>
            <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-premium-accent/15">
              <Flame
                className="size-8 text-orange-500"
                aria-hidden="true"
              />
            </div>

            <h2
              id="streak-celebration-title"
              className="text-xl font-semibold tracking-tight text-foreground"
            >
              Primo movimento di oggi
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted-text">
              {streakTo > 0
                ? `Hai tenuto il ritmo: ${streakTo} ${
                    streakTo === 1 ? "giorno consecutivo" : "giorni consecutivi"
                  }.`
                : "Hai aperto il quadro di oggi. Ogni giorno conta."}
            </p>

            <Button
              type="button"
              className="mt-8 h-11 w-full rounded-2xl"
              onClick={closeOverlay}
            >
              Continua
            </Button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
