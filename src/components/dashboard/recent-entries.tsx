import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export function RecentEntries({ entries }: RecentEntriesProps) {
  return (
    <Card className="overflow-hidden border-zinc-200/80 shadow-sm dark:border-zinc-800">
      <CardHeader className="space-y-2 p-4 pb-0 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Movimenti recenti</CardTitle>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Gli ultimi 5 movimenti inseriti.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-zinc-600">
            <Link href="/entries">Vedi tutti</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-4 sm:p-5">
        {entries.map((entry, index) => (
          <div key={entry.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                  {entry.title}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {entry.category.name} • {formatDate(entry.date)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-emerald-700">
                {formatMoney(entry.savedAmount)}
              </p>
            </div>

            {index < entries.length - 1 ? <Separator /> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
