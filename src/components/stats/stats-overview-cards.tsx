import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";
import { cn } from "@/lib/utils";

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
    label: "Tenuto in tasca",
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
    key: "averageSavedPerEntry",
    label: "Media per scelta",
    variant: "default",
  },
  {
    key: "savingRatePercent",
    label: "Efficienza",
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
    <div className="grid auto-rows-fr grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-2">
      {cards.map((card) => {
        const value = getCardValue(card, overview);

        return (
          <Card
            key={card.key}
            className={cn(
              "h-full overflow-hidden shadow-none",
              card.variant === "highlight"
                ? "border-accent/20 bg-accent/10 ring-1 ring-accent/10"
                : "border-border/60 bg-surface/85 ring-1 ring-white/5",
            )}
          >
            <CardHeader className="space-y-1 p-3 pb-2 sm:p-4 sm:pb-3">
              <CardTitle
                className={cn(
                  "text-[10px] font-medium uppercase tracking-[0.18em]",
                  card.variant === "highlight" ? "text-accent/90" : "text-muted-foreground",
                )}
              >
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-3 pt-0 sm:p-4 sm:pt-0">
              <p
                className={cn(
                  "font-num leading-none tracking-tight",
                  card.variant === "highlight"
                    ? "text-[1.7rem] font-semibold text-accent sm:text-[1.75rem]"
                    : "text-[1.45rem] font-semibold text-foreground sm:text-[1.65rem]",
                )}
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
