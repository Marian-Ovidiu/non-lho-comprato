import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";

export type StatsOverview = {
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
  averageSavedPerEntry: number;
  savingRatePercent: number;
};

type StatsOverviewCardsProps = {
  overview: StatsOverview;
};

type OverviewCard = {
  key: keyof StatsOverview | "saved";
  label: string;
  description: string;
  variant: "highlight" | "default";
};

const cards: OverviewCard[] = [
  {
    key: "saved",
    label: "Risparmiato totale",
    description: "Questo è il numero che vogliamo far crescere.",
    variant: "highlight",
  },
  {
    key: "totalRealSpent",
    label: "Speso davvero",
    description: "Quanto hai speso davvero.",
    variant: "default",
  },
  {
    key: "totalAlternativeCost",
    label: "Avresti speso",
    description: "Quanto avresti speso senza schivare.",
    variant: "default",
  },
  {
    key: "entriesCount",
    label: "Movimenti",
    description: "Tutti i movimenti registrati.",
    variant: "default",
  },
  {
    key: "averageSavedPerEntry",
    label: "Media risparmio",
    description: "Risparmio medio per movimento.",
    variant: "default",
  },
  {
    key: "savingRatePercent",
    label: "Tasso risparmio",
    description: "Percentuale di risparmio sul totale alternativo.",
    variant: "default",
  },
];

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)}%`;
}

function getCardValue(card: OverviewCard, overview: StatsOverview): string {
  switch (card.key) {
    case "saved":
      return formatMoney(overview.totalSaved);
    case "totalRealSpent":
      return formatMoney(overview.totalRealSpent);
    case "totalAlternativeCost":
      return formatMoney(overview.totalAlternativeCost);
    case "entriesCount":
      return String(overview.entriesCount);
    case "averageSavedPerEntry":
      return formatMoney(overview.averageSavedPerEntry);
    case "savingRatePercent":
      return formatPercent(overview.savingRatePercent);
    default:
      return "";
  }
}

export function StatsOverviewCards({ overview }: StatsOverviewCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const value = getCardValue(card, overview);

        return (
          <Card
            key={card.key}
            className={
              card.variant === "highlight"
                ? "overflow-hidden border-emerald-200 bg-emerald-50/70 shadow-sm"
                : "overflow-hidden border-zinc-200/80"
            }
          >
            <CardHeader className="space-y-1 p-5 pb-3">
              <CardTitle
                className={
                  card.variant === "highlight"
                    ? "text-sm font-medium text-emerald-700"
                    : "text-sm font-medium text-zinc-600"
                }
              >
                {card.label}
              </CardTitle>
              <p
                className={
                  card.variant === "highlight"
                    ? "text-xs text-emerald-700/80"
                    : "text-xs text-zinc-500"
                }
              >
                {card.description}
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <p
                className={
                  card.variant === "highlight"
                    ? "text-3xl font-semibold tracking-tight text-emerald-700"
                    : "text-3xl font-semibold tracking-tight text-zinc-950"
                }
              >
                {value}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
