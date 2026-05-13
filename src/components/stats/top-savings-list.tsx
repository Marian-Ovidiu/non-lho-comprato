import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/src/lib/formatters";

type TopSavingsListProps = {
  entries: Array<{
    id: string;
    title: string;
    categoryName: string;
    date: Date | string;
    realCost: number;
    alternativeCost: number;
    savedAmount: number;
    source: "manual" | "habit";
  }>;
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function TopSavingsList({ entries }: TopSavingsListProps) {
  const sortedEntries = [...entries].sort(
    (left, right) => right.savedAmount - left.savedAmount,
  );

  return (
    <Card className="overflow-hidden border-border/60 bg-surface/85 shadow-none ring-1 ring-white/5">
      <CardHeader className="space-y-1.5 p-4 pb-0 sm:p-5">
        <CardTitle className="text-base font-semibold tracking-tight text-foreground">
          Le scelte più forti
        </CardTitle>
        <p className="text-sm leading-6 text-muted-text">
          I movimenti che hanno protetto di più il tuo budget.
        </p>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {sortedEntries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-surface-muted/60 p-5 text-sm leading-6 text-muted-text">
            Nessun risparmio positivo ancora disponibile.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEntries.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-border/60 bg-surface-muted/70 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-semibold tracking-tight text-foreground">
                      {item.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-text">
                      <span>{item.categoryName}</span>
                      <span aria-hidden="true">•</span>
                      <span>{formatDate(toDate(item.date))}</span>
                      <Badge variant="outline" className="rounded-full">
                        {item.source === "habit" ? "Abitudine" : "Manuale"}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-lg font-semibold tracking-tight text-success">
                      {formatMoney(item.savedAmount)}
                    </p>
                    <p className="text-xs text-muted-text">Tenuti in tasca</p>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-muted-text">
                  Hai speso {formatMoney(item.realCost)} invece di{" "}
                  {formatMoney(item.alternativeCost)}.
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
