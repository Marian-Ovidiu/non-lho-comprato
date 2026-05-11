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
  variant: "highlight" | "default";
};

const cards: OverviewCard[] = [
  {
    key: "saved",
    label: "Risparmiato totale",
    variant: "highlight",
  },
  {
    key: "totalRealSpent",
    label: "Speso davvero",
    variant: "default",
  },
  {
    key: "totalAlternativeCost",
    label: "Avresti speso",
    variant: "default",
  },
  {
    key: "entriesCount",
    label: "Movimenti",
    variant: "default",
  },
  {
    key: "averageSavedPerEntry",
    label: "Media risparmio",
    variant: "default",
  },
  {
    key: "savingRatePercent",
    label: "Tasso risparmio",
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const value = getCardValue(card, overview);

        return (
          <Card
            key={card.key}
            className={
              card.variant === "highlight"
                ? "overflow-hidden border-success/20 bg-success/10 shadow-sm"
                : "overflow-hidden border-border shadow-sm"
            }
          >
            <CardHeader className="space-y-1 p-3 pb-2 sm:p-4 sm:pb-3">
              <CardTitle
                className={
                  card.variant === "highlight"
                    ? "text-[11px] font-medium uppercase tracking-[0.16em] text-success/90"
                    : "text-[11px] font-medium uppercase tracking-[0.16em] text-muted-text"
                }
              >
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
              <p
                className={
                  card.variant === "highlight"
                    ? "text-2xl font-semibold tracking-tight text-success sm:text-[1.75rem]"
                    : "text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]"
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

