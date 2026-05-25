"use client";

import { formatMoney } from "@/src/lib/formatters";
import { AnimatedNumber } from "@/src/components/shared/animated-number";

type DashboardHudCardsProps = {
  totalSavedToday: number;
  totalSavedMonth: number;
  entriesTodayCount: number;
};

function HudCard({
  label,
  value,
  format,
  sub,
  accent = false,
  delay = 0,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  sub?: string;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`dashboard-card-reveal flex flex-col gap-2.5 overflow-hidden rounded-xl p-4 motion-reduce:animate-none${
        accent
          ? " bg-accent text-accent-foreground"
          : " border border-border bg-surface text-foreground"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] opacity-70">
          {label}
        </p>
        {accent ? (
          <span className="size-1.5 rounded-full bg-current opacity-40" aria-hidden="true" />
        ) : null}
      </div>
      <p className="font-num text-[2rem] font-semibold leading-none">
        <AnimatedNumber value={value} format={format} />
      </p>
      {sub ? (
        <p className="text-xs leading-none opacity-65">{sub}</p>
      ) : null}
    </div>
  );
}

export function DashboardHudCards({
  totalSavedToday,
  totalSavedMonth,
  entriesTodayCount,
}: DashboardHudCardsProps) {
  const todaySub =
    entriesTodayCount === 0
      ? "nessun movimento"
      : entriesTodayCount === 1
        ? "1 movimento"
        : `${entriesTodayCount} movimenti`;

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <HudCard
        label="Oggi"
        value={totalSavedToday}
        format={formatMoney}
        sub={todaySub}
        accent
        delay={0}
      />
      <HudCard
        label="Questo mese"
        value={totalSavedMonth}
        format={formatMoney}
        delay={60}
      />
    </div>
  );
}
