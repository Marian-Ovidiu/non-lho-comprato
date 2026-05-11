import { Card } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";

type DashboardHudCardsProps = {
  totalSavedToday: number;
  totalSavedMonth: number;
  currentStreak: number;
  entriesTodayCount: number;
};

function HudCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success";
}) {
  return (
    <Card
      className={
        tone === "success"
          ? "overflow-hidden border-success/20 bg-success/10 shadow-sm"
          : "overflow-hidden border-border bg-surface shadow-sm"
      }
    >
      <div className="flex h-full min-h-[5.5rem] flex-col justify-between gap-2 p-3 sm:p-4">
        <p
          className={
            tone === "success"
              ? "text-[11px] font-medium uppercase tracking-[0.16em] text-success/90"
              : "text-[11px] font-medium uppercase tracking-[0.16em] text-muted-text"
          }
        >
          {label}
        </p>
        <p
          className={
            tone === "success"
              ? "text-2xl font-semibold tracking-tight text-success sm:text-[1.75rem]"
              : "text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]"
          }
        >
          {value}
        </p>
      </div>
    </Card>
  );
}

export function DashboardHudCards({
  totalSavedToday,
  totalSavedMonth,
  currentStreak,
  entriesTodayCount,
}: DashboardHudCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <HudCard
        label="Risparmiato oggi"
        value={formatMoney(totalSavedToday)}
        tone="success"
      />

      <HudCard
        label="Risparmiato mese"
        value={formatMoney(totalSavedMonth)}
      />

      <HudCard
        label="Serie attuale"
        value={String(currentStreak)}
      />

      <HudCard
        label="Movimenti oggi"
        value={String(entriesTodayCount)}
      />
    </div>
  );
}
