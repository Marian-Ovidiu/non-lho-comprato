"use client";

import { AnimatedNumber } from "@/src/components/shared/animated-number";

const WEEK_LABELS = ["L", "M", "M", "G", "V", "S", "D"];

type StreakHeroCardProps = {
  currentStreak: number;
};

function getWeekStrip(streak: number): boolean[] {
  const todayIndex = (new Date().getDay() + 6) % 7; // Mon=0 … Sun=6
  return Array.from({ length: 7 }, (_, i) => {
    if (i > todayIndex) return false;
    return todayIndex - i < streak;
  });
}

function StreakDescription({ streak }: { streak: number }) {
  const base = "mt-1.5 text-[13px] leading-snug text-muted-foreground";
  const serif = "font-serif italic text-foreground";

  if (streak <= 0) {
    return (
      <p className={base}>
        <span className={serif}>Inizia</span> oggi — il ritmo parte da un giorno.
      </p>
    );
  }
  if (streak === 1) {
    return (
      <p className={base}>
        Il <span className={serif}>primo</span> giorno è dentro.
      </p>
    );
  }
  if (streak < 7) {
    return (
      <p className={base}>
        Il ritmo <span className={serif}>si vede già</span>.
      </p>
    );
  }
  if (streak === 7) {
    return (
      <p className={base}>
        Una <span className={serif}>settimana</span> di fila.
      </p>
    );
  }
  if (streak < 14) {
    return (
      <p className={base}>
        <span className={serif}>Quasi</span> due settimane di fila.
      </p>
    );
  }
  if (streak === 14) {
    return (
      <p className={base}>
        Due <span className={serif}>settimane</span> di ritmo continuo.
      </p>
    );
  }
  if (streak < 30) {
    return (
      <p className={base}>
        Il ritmo è <span className={serif}>stabile</span>.
      </p>
    );
  }
  return (
    <p className={base}>
      Un <span className={serif}>mese</span> di continuità — notevole.
    </p>
  );
}

export function StreakHeroCard({ currentStreak }: StreakHeroCardProps) {
  const strip = getWeekStrip(currentStreak);

  return (
    <div
      className="overflow-hidden rounded-[14px] border border-border p-5"
      style={{
        background:
          "radial-gradient(120% 80% at 100% 0%, rgba(255,138,61,0.16) 0%, transparent 55%), var(--surface)",
      }}
    >
      {/* Top row: info left + flame right */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--warm)" }}
          >
            Streak
          </p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <AnimatedNumber
              value={currentStreak}
              className="font-num font-bold leading-none"
              style={{ fontSize: 64, letterSpacing: "-0.05em" }}
            />
            <span className="text-base text-muted-foreground">giorni</span>
          </div>
          <StreakDescription streak={currentStreak} />
        </div>

        <div
          className="nlc-flame shrink-0 select-none text-[56px] leading-none"
          style={{
            filter:
              currentStreak > 0
                ? "drop-shadow(0 0 18px rgba(255,138,61,0.45))"
                : "grayscale(1) opacity(0.35)",
          }}
          aria-hidden="true"
        >
          🔥
        </div>
      </div>

      {/* 7-day strip */}
      <div className="mt-[18px] flex gap-1.5">
        {strip.map((active, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background: active ? "var(--warm)" : "var(--surface-muted)",
              opacity: active
                ? 1 - (strip.lastIndexOf(true) - i) * 0.08
                : 1,
            }}
          />
        ))}
      </div>

      {/* Day labels */}
      <div className="mt-2 flex justify-between">
        {WEEK_LABELS.map((d, i) => (
          <span
            key={i}
            className="flex-1 text-center text-[10px] uppercase tracking-[0.08em]"
            style={{ color: "var(--text-3)" }}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}
