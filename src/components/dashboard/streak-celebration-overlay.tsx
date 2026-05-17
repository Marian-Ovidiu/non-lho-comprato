"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CELEBRATION_BLOCK_MS = 5500;
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

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    setPhase("celebrating");
    setDisplayedStreak(streakFrom);

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

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/70 p-6 backdrop-blur-md"
      role="presentation"
      aria-hidden={phase === "celebrating"}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="streak-celebration-title"
        className={cn(
          "flex w-full max-w-md flex-col items-center rounded-3xl border border-border/80 bg-surface px-6 py-10 text-center shadow-2xl",
          phase === "confirm" && "border-premium-accent/30",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {phase === "celebrating" ? (
          <>
            <div className="streak-flame-wrap mb-6 flex size-24 items-center justify-center rounded-full bg-premium-accent/15">
              <Flame
                className="streak-flame-icon size-14 text-orange-500"
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
                  ? "streak-count-pop"
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
              onClick={onClose}
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
