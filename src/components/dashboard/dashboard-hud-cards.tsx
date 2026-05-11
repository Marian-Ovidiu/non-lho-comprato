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
  tone?: "default" | "emerald";
}) {
  return (
    <Card
      className={
        tone === "emerald"
          ? "overflow-hidden border-emerald-200 bg-emerald-50/70 shadow-sm"
          : "overflow-hidden border-zinc-200/80 shadow-sm"
      }
    >
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p
              className={
                tone === "emerald"
                  ? "text-xs font-medium uppercase tracking-[0.18em] text-emerald-700"
                  : "text-xs font-medium uppercase tracking-[0.18em] text-zinc-500"
              }
            >
              {label}
            </p>
            <p
              className={
                tone === "emerald"
                  ? "text-2xl font-semibold tracking-tight text-emerald-700 sm:text-3xl"
                  : "text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl"
              }
            >
              {value}
            </p>
          </div>

          <div
            className={
              tone === "emerald"
                ? "flex size-10 items-center justify-center rounded-2xl bg-emerald-600 text-white"
                : "flex size-10 items-center justify-center rounded-2xl bg-zinc-950 text-white"
            }
          >
            <Icon className="size-5" aria-hidden="true" />
          </div>
        </div>

        <p
          className={
            tone === "emerald"
              ? "text-sm leading-6 text-emerald-700/90"
              : "text-sm leading-6 text-zinc-500"
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
        tone="emerald"
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
