"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";

type MonthlyOverview = {
  totalSaved: number;
  totalRealSpent: number;
  totalAlternativeCost: number;
  entriesCount: number;
  savingRatePercent: number;
} | null | undefined;

type MonthlyOverviewCardsProps = {
  overview: MonthlyOverview;
};

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)}%`;
}

export function MonthlyOverviewCards({ overview }: MonthlyOverviewCardsProps) {
  const data = {
    totalSaved: overview?.totalSaved ?? 0,
    totalRealSpent: overview?.totalRealSpent ?? 0,
    totalAlternativeCost: overview?.totalAlternativeCost ?? 0,
    entriesCount: overview?.entriesCount ?? 0,
    savingRatePercent: overview?.savingRatePercent ?? 0,
  };

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
          Panoramica mensile
        </h2>
        <p className="text-sm text-muted-text dark:text-muted-text">
          Il quadro sintetico del mese selezionato.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {[
          {
            label: "Risparmiato",
            value: formatMoney(data.totalSaved),
            description: "Totale del mese.",
          },
          {
            label: "Speso davvero",
            value: formatMoney(data.totalRealSpent),
            description: "Uscite effettive.",
          },
          {
            label: "Avresti speso",
            value: formatMoney(data.totalAlternativeCost),
            description: "Scenario evitato.",
          },
          {
            label: "Movimenti",
            value: String(data.entriesCount),
            description: "Voci registrate nel mese.",
          },
          {
            label: "Tasso risparmio",
            value: formatPercent(data.savingRatePercent),
            description: "Quanto hai tenuto indietro.",
          },
        ].map((card, index) => (
          <Card
            key={card.label}
            className={
              [
                "h-full border-border shadow-sm dark:border-border",
                index === 0
                  ? "border-success/20 bg-success/10 dark:border-success/30 dark:bg-success/15"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")
            }
          >
            <CardHeader className="space-y-1.5 p-4 pb-2 sm:p-5">
              <CardTitle className="text-sm font-medium text-muted-text dark:text-muted-text">
                {card.label}
              </CardTitle>
              <p className="text-xs text-muted-text dark:text-muted-text">
                {card.description}
              </p>
            </CardHeader>
            <CardContent className="flex-1 p-4 pt-0 sm:p-5">
              <p className="text-2xl font-semibold tracking-tight text-foreground dark:text-foreground sm:text-[1.85rem]">
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
