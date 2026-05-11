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
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <CardTitle>Più grandi risparmi</CardTitle>
        <p className="text-sm text-muted-text">
          I movimenti che hanno fatto la differenza più grande.
        </p>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        {sortedEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-5 text-sm text-muted-text">
            Nessun risparmio positivo ancora disponibile.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEntries.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border bg-surface-muted p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-semibold text-foreground">
                      {item.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-text">
                      <span>{item.categoryName}</span>
                      <span aria-hidden="true">•</span>
                      <span>{formatDate(toDate(item.date))}</span>
                      <Badge variant="outline">
                        {item.source === "habit" ? "Abitudine" : "Manuale"}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-lg font-semibold text-success">
                      {formatMoney(item.savedAmount)}
                    </p>
                    <p className="text-xs text-muted-text">Risparmiati</p>
                  </div>
                </div>

                <p className="mt-3 text-sm text-muted-text">
                  Speso {formatMoney(item.realCost)} invece di{" "}
                  {formatMoney(item.alternativeCost)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

