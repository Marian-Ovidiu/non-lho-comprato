import { Card } from "@/components/ui/card";
import { getGlobalStreak } from "@/src/actions/streaks";
import { formatMoney } from "@/src/lib/formatters";

type DashboardHudCardsProps = {
  totalSavedToday: number;
  totalSavedMonth: number;
  entriesCount: number;
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
      <div className="flex h-full min-h-[4.75rem] flex-col justify-between gap-1.5 p-2.5 sm:p-3.5">
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
              ? "text-[1.6rem] font-semibold tracking-tight text-success sm:text-[1.75rem]"
              : "text-[1.6rem] font-semibold tracking-tight text-foreground sm:text-[1.75rem]"
          }
        >
          {value}
        </p>
      </div>
    </Card>
  );
}

export async function DashboardHudCards({
  totalSavedToday,
  totalSavedMonth,
  entriesCount,
}: DashboardHudCardsProps) {
  const { currentStreak } = await getGlobalStreak();

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <HudCard
        label="Oggi"
        value={formatMoney(totalSavedToday)}
        tone="success"
      />

      <HudCard
        label="Questo mese"
        value={formatMoney(totalSavedMonth)}
      />

      <HudCard
        label="Segnali totali"
        value={String(entriesCount)}
      />

      <HudCard
        label="Giorni consecutivi"
        value={String(currentStreak)}
      />
    </div>
  );
}
