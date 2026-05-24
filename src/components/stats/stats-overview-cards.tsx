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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
      {cards.map((card, index) => {
        const value = getCardValue(card, overview);

        return (
          <Card
            key={card.key}
            className={cn(
              "overflow-hidden border-border/60 bg-surface/85 shadow-none ring-1 ring-white/5",
              card.variant === "highlight"
                ? "border-success/20 bg-success/10 ring-success/10"
                : "border-border/60",
            )}
          >
            <CardHeader className="space-y-1 p-3 pb-2 sm:p-4 sm:pb-3">
              <CardTitle
                className={cn(
                  "text-[10px] font-medium uppercase tracking-[0.18em]",
                  card.variant === "highlight"
                    ? "text-success/90"
                    : "text-muted-text",
                )}
              >
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
              <p
                className={cn(
                  "leading-none tracking-tight",
                  card.variant === "highlight"
                    ? "text-2xl font-semibold text-success sm:text-[1.75rem]"
                    : "text-[1.55rem] font-semibold text-foreground sm:text-[1.65rem]",
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
