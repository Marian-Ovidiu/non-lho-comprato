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
    <Card className="overflow-hidden border-zinc-200/80">
      <CardHeader className="space-y-3 p-5 pb-0">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Movimenti recenti</CardTitle>
            <p className="text-sm text-zinc-500">Gli ultimi 5 movimenti inseriti</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-zinc-600">
            <Link href="/entries">Vedi tutti</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {entries.map((entry, index) => (
          <div key={entry.id} className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="truncate font-medium text-zinc-950">{entry.title}</p>
                <p className="text-sm text-zinc-500">{entry.category.name}</p>
              </div>
              <div className="flex items-center gap-2 self-start sm:flex-col sm:items-end sm:gap-1">
                <p className="text-lg font-semibold text-emerald-700">
                  {formatMoney(entry.savedAmount)}
                </p>
                <p className="text-xs text-zinc-500">{formatDate(entry.date)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl bg-zinc-50 px-3 py-2">
                <p className="text-zinc-500">Speso</p>
                <p className="font-medium">{formatMoney(entry.realCost)}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 px-3 py-2">
                <p className="text-zinc-500">Avresti speso</p>
                <p className="font-medium">{formatMoney(entry.alternativeCost)}</p>
              </div>
              <div className="col-span-2 rounded-2xl bg-emerald-50 px-3 py-2 sm:col-span-1">
                <p className="text-emerald-700">Risparmio</p>
                <p className="font-semibold text-emerald-700">
                  {formatMoney(entry.savedAmount)}
                </p>
              </div>
            </div>

            {entry.note ? (
              <p className="rounded-2xl bg-zinc-50 px-3 py-3 text-sm leading-6 text-zinc-600">
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
