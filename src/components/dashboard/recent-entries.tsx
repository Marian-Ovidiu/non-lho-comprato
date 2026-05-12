import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatMoney } from "@/src/lib/formatters";

type RecentEntriesProps = {
  entries: Array<{
    id: string;
    title: string;
    category: {
      name: string;
    };
    realCost: unknown;
    alternativeCost: unknown;
    savedAmount: unknown;
    date: Date;
    note: string | null;
  }>;
};

function formatSignedMoney(value: unknown) {
  const amount = Number(value);
  const formatted = formatMoney(Math.abs(amount));

  if (amount > 0) {
    return `+${formatted}`;
  }

  if (amount < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

export function RecentEntries({ entries }: RecentEntriesProps) {
  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="space-y-2 p-4 pb-0 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Movimenti recenti</CardTitle>
            <p className="text-sm text-muted-text">Gli ultimi 3 movimenti inseriti.</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-muted-text">
            <Link href="/entries">Vedi tutti</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 p-4 sm:p-5">
        {entries.map((entry, index) => (
          <div key={entry.id} className="space-y-2.5">
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-surface-muted/60 px-3 py-2.5">
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-sm font-medium text-foreground">
                  {entry.title}
                </p>
                <p className="truncate text-xs text-muted-text">
                  {entry.category.name} <span aria-hidden="true">•</span>{" "}
                  {formatDate(entry.date)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-success">
                {formatSignedMoney(entry.savedAmount)}
              </p>
            </div>

            {entry.note ? (
              <p className="truncate px-1 text-xs leading-5 text-muted-text">
                {entry.note}
              </p>
            ) : null}

            {index < entries.length - 1 ? <Separator /> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
