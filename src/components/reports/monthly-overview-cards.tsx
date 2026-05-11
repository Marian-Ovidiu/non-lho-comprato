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
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Panoramica mensile
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Il quadro sintetico del mese selezionato.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
              index === 0
                ? "border-emerald-200 bg-emerald-50/70 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30"
                : "border-zinc-200/80 shadow-sm dark:border-zinc-800"
            }
          >
            <CardHeader className="space-y-1 p-5 pb-3">
              <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {card.label}
              </CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {card.description}
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <p className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
