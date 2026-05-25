"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

const SPARKLES = [
  { top: 80, left: "12%", fontSize: 28, opacity: 0.35 },
  { top: 140, right: "10%", fontSize: 22, opacity: 0.4 },
  { top: "38%", left: "6%", fontSize: 18, opacity: 0.28 },
  { top: "42%", right: "8%", fontSize: 24, opacity: 0.32 },
  { bottom: "28%", left: "14%", fontSize: 16, opacity: 0.3 },
  { bottom: "22%", right: "12%", fontSize: 20, opacity: 0.38 },
] as const;

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
    if (!mounted) return;
    const t = window.setTimeout(() => setIsEntering(true), 16);
    return () => window.clearTimeout(t);
  }, [mounted]);

  useEffect(() => {
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

    const frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [streakFrom, streakTo]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    };
  }, []);

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
      style={{
        background:
          "radial-gradient(circle at 50% 30%, rgba(255,138,61,0.16) 0%, transparent 55%), var(--background)",
        transitionDuration: isExiting ? `${EXIT_MS}ms` : `${ENTER_MS}ms`,
      }}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center px-6",
        "transition-opacity motion-reduce:transition-none",
        isEntering && !isExiting ? "opacity-100" : "opacity-0",
      )}
    >
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{ position: "absolute", color: "var(--warm)", ...s }}
        >
          ✦
        </span>
      ))}

      <div className="flex flex-col items-center text-center">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: "var(--warm)" }}
        >
          Traguardo
        </p>

        <div
          className="nlc-flame my-8"
          aria-hidden="true"
          style={{
            fontSize: 96,
            lineHeight: 1,
            filter: "drop-shadow(0 0 40px rgba(255,138,61,0.7))",
          }}
        >
          🔥
        </div>

        <p className="font-serif italic text-[22px] leading-[1.35] text-foreground">
          {getMilestoneLabel(streakTo)}
        </p>

        <div className="mt-5 flex items-baseline gap-2">
          <span
            id="streak-celebration-title"
            aria-live="polite"
            className={cn(
              "font-num text-[64px] font-bold leading-none",
              didPop && "nlc-pop",
            )}
            style={{ color: "var(--warm)" }}
          >
            {displayedStreak}
          </span>
          <span className="text-[22px] font-semibold text-foreground">giorni</span>
        </div>

        <p className="mt-6 text-[14px] leading-[1.55] text-muted-foreground">
          Hai tenuto il ritmo. Ogni giorno conta.
        </p>
      </div>

      <button
        type="button"
        onClick={closeOverlay}
        className="mt-12 h-[52px] w-full max-w-xs rounded-[18px] bg-accent text-[15px] font-bold text-accent-foreground transition-[opacity,transform] duration-150 active:scale-[0.98] active:opacity-90"
      >
        Continua
      </button>
    </div>,
    document.body,
  );
}
