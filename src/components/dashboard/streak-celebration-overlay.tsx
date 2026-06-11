"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CraftedIcon, Serif } from "@/components/crafted";
import { celebrate } from "@/components/crafted/motion";
import { cn } from "@/lib/utils";

const ENTER_MS = 280;
const EXIT_MS = 200;
const COUNT_UP_MS = 1600;

type StreakCelebrationOverlayProps = {
  streakFrom: number;
  streakTo: number;
  onClose: () => void;
};

function getMilestoneLabel(days: number): string {
  if (days >= 30) return "un mese filato";
  if (days >= 21) return "tre settimane filate";
  if (days >= 14) return "due settimane filate";
  if (days >= 7) return "una settimana filata";
  if (days >= 3) return "tre giorni di fila";
  return "una nuova striscia";
}

export function StreakCelebrationOverlay({
  streakFrom,
  streakTo,
  onClose,
}: StreakCelebrationOverlayProps) {
  const [displayedStreak, setDisplayedStreak] = useState(streakFrom);
  const [mounted, setMounted] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [didPop, setDidPop] = useState(false);
  const didCelebrateRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);
  const flameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const t = window.setTimeout(() => setIsEntering(true), 16);
    return () => window.clearTimeout(t);
  }, [mounted]);

  useEffect(() => {
    const startFrame = window.requestAnimationFrame(() => {
      setDisplayedStreak(streakFrom);
      setDidPop(false);

      if (streakFrom === streakTo) {
        setDisplayedStreak(streakTo);
        return;
      }

      const start = performance.now();

      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / COUNT_UP_MS);
        setDisplayedStreak(Math.round(streakFrom + (streakTo - streakFrom) * progress));

        if (progress < 1) {
          window.requestAnimationFrame(tick);
        } else {
          setDidPop(true);
        }
      };

      window.requestAnimationFrame(tick);
    });

    return () => window.cancelAnimationFrame(startFrame);
  }, [streakFrom, streakTo]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isEntering || didCelebrateRef.current) {
      return;
    }

    didCelebrateRef.current = true;

    const frameId = window.requestAnimationFrame(() => {
      const rect = flameRef.current?.getBoundingClientRect();

      celebrate({
        x: rect ? rect.left + rect.width / 2 : undefined,
        y: rect ? rect.top + rect.height / 2 : undefined,
        count: streakTo >= 7 ? 24 : 18,
        spread: streakTo >= 7 ? 112 : 92,
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isEntering, streakTo]);

  function closeOverlay() {
    if (isExiting) return;
    setIsExiting(true);
    setIsEntering(false);
    exitTimerRef.current = window.setTimeout(onClose, EXIT_MS);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-celebration-title"
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6",
        "transition-opacity motion-reduce:transition-none",
        isEntering && !isExiting ? "opacity-100" : "opacity-0",
      )}
      style={{
        transitionDuration: isExiting ? `${EXIT_MS}ms` : `${ENTER_MS}ms`,
      }}
    >
      <div className="flex flex-col items-center text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
          Traguardo
        </p>

        <div ref={flameRef} className="my-8 text-accent">
          <CraftedIcon
            name="flame"
            size={72}
            className="streak-celebration-flame-pulse"
            aria-hidden="true"
          />
        </div>

        <Serif className="text-[22px] leading-[1.35] text-muted-foreground">
          {getMilestoneLabel(streakTo)}
        </Serif>

        <div className="mt-5 flex items-baseline gap-2">
          <span
            id="streak-celebration-title"
            aria-live="polite"
            className={cn(
              "font-num text-[64px] font-bold leading-none text-accent",
              didPop && "nlc-pop",
            )}
          >
            {displayedStreak}
          </span>
          <span className="text-[22px] font-semibold text-foreground">giorni</span>
        </div>

        <p className="mt-6 text-[14px] leading-[1.55] text-ink-3">
          Hai tenuto il ritmo. Ogni giorno conta.
        </p>
      </div>

      <button
        type="button"
        onClick={closeOverlay}
        className="mt-12 h-[52px] w-full max-w-xs rounded-2xl bg-accent text-[15px] font-bold text-accent-foreground transition-opacity active:opacity-90"
      >
        Continua
      </button>
    </div>,
    document.body,
  );
}
