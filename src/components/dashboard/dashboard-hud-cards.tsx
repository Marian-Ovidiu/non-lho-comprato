import { formatMoney } from "@/src/lib/formatters";

type DashboardHudCardsProps = {
  totalSavedToday: number;
  totalSavedMonth: number;
  entriesTodayCount: number;
};

function HudCard({
  label,
  value,
  sub,
  accent = false,
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`dashboard-card-reveal flex flex-col gap-2.5 rounded-xl p-4 motion-reduce:animate-none${
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
        {value}
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
        value={formatMoney(totalSavedToday)}
        sub={todaySub}
        accent
        delay={0}
      />
      <HudCard
        label="Questo mese"
        value={formatMoney(totalSavedMonth)}
        delay={60}
      />
    </div>
  );
}
