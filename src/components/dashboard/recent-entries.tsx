import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CategoryPill } from "@/src/components/shared/category-pill";
import { formatDate, formatMoney } from "@/src/lib/formatters";
import { spacing } from "@/src/lib/spacing";

type RecentEntriesProps = {
  entries: Array<{
    id: string;
    title: string;
    category: {
      name: string;
      slug?: string | null;
    };
    realCost: unknown;
    alternativeCost: unknown;
    savedAmount: unknown;
    date: string | Date;
    note: string | null;
  }>;
  description?: string;
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

export function RecentEntries({ entries, description = "Gli ultimi 3 movimenti inseriti." }: RecentEntriesProps) {
  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className={spacing.cardHeader}>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Movimenti recenti</CardTitle>
            <p className="text-sm text-muted-text">{description}</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-muted-text">
            <Link href="/entries">Vedi tutti</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className={`space-y-2 ${spacing.cardBody}`}>
        {entries.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed border-border/70 bg-surface-muted/50 px-4 py-5"
            role="status"
          >
            <p className="text-sm font-semibold text-foreground">
              Nessuna spesa recente
            </p>
            <p className="mt-1 text-sm leading-5 text-muted-text">
              Aggiungi un movimento per vedere qui gli ultimi segnali.
            </p>
          </div>
        ) : null}
        {entries.map((entry, index) => (
          <div key={entry.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-surface-muted/60 px-3 py-2">
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-sm font-medium text-foreground">
                  {entry.title}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryPill
                    category={entry.category}
                    className="px-3 py-1 text-[11px]"
                  />
                  <span className="truncate text-xs text-muted-text">
                    {formatDate(entry.date)}
                  </span>
                </div>
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
