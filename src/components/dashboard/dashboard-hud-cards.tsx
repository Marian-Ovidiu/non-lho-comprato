import { CalendarDays, Flame, ListChecks, Wallet } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";

type DashboardHudCardsProps = {
  totalSavedToday: number;
  totalSavedMonth: number;
  currentStreak: number;
  bestStreak: number;
  entriesTodayCount: number;
};

function HudCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof Wallet;
  tone?: "default" | "success";
}) {
  return (
    <Card
      className={
        tone === "success"
          ? "overflow-hidden border-success/20 bg-success/10 shadow-sm"
          : "overflow-hidden border-border shadow-sm"
      }
    >
      <CardContent className="space-y-2 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p
              className={
                tone === "success"
                  ? "text-xs font-medium uppercase tracking-[0.18em] text-success"
                  : "text-xs font-medium uppercase tracking-[0.18em] text-muted-text"
              }
            >
              {label}
            </p>
            <p
              className={
                tone === "success"
                  ? "text-xl font-semibold tracking-tight text-success sm:text-2xl"
                  : "text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
              }
            >
              {value}
            </p>
          </div>

          <div
            className={
              tone === "success"
                ? "flex size-9 items-center justify-center rounded-2xl bg-success text-background"
                : "flex size-9 items-center justify-center rounded-2xl bg-accent text-background"
            }
          >
            <Icon className="size-4.5" aria-hidden="true" />
          </div>
        </div>

        <p
          className={
            tone === "success"
              ? "text-xs leading-5 text-success/90"
              : "text-xs leading-5 text-muted-text"
          }
        >
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export function DashboardHudCards({
  totalSavedToday,
  totalSavedMonth,
  currentStreak,
  bestStreak,
  entriesTodayCount,
}: DashboardHudCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <HudCard
        label="Risparmiato oggi"
        value={formatMoney(totalSavedToday)}
        description={
          totalSavedToday > 0
            ? "Oggi avete già schivato qualcosa."
            : "Nessun risparmio registrato oggi."
        }
        icon={Wallet}
        tone="success"
      />

      <HudCard
        label="Risparmiato mese"
        value={formatMoney(totalSavedMonth)}
        description="Il totale del mese in corso."
        icon={CalendarDays}
      />

      <HudCard
        label="Serie attuale"
        value={String(currentStreak)}
        description={`Migliore: ${bestStreak} giorni consecutivi.`}
        icon={Flame}
      />

      <HudCard
        label="Movimenti oggi"
        value={String(entriesTodayCount)}
        description="Quante voci sono entrate oggi."
        icon={ListChecks}
      />
    </div>
  );
}
