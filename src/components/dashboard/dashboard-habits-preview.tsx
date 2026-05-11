import Link from "next/link";
import { ArrowRight, SunMedium } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";

type DashboardHabitsPreviewProps = {
  occurrences: Array<{
    id: string;
    status: "pending" | "spent" | "avoided" | "skipped";
    habit: {
      name: string;
      amount: unknown;
      category: {
        name: string;
      };
    };
  }>;
};

export function DashboardHabitsPreview({
  occurrences,
}: DashboardHabitsPreviewProps) {
  const pendingOccurrences = occurrences.filter(
    (occurrence) => occurrence.status === "pending",
  );
  const visibleOccurrences = pendingOccurrences.slice(0, 3);
  const remainingCount = pendingOccurrences.length - visibleOccurrences.length;

  return (
    <Card className="overflow-hidden border-zinc-200/80 shadow-sm dark:border-zinc-800">
      <CardHeader className="space-y-2 p-4 pb-0 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Abitudini di oggi</CardTitle>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Le abitudini ancora da controllare oggi.
            </p>
          </div>
          <Badge variant="secondary">{pendingOccurrences.length} in attesa</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-5">
        {pendingOccurrences.length === 0 ? (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
              <SunMedium
                className="size-5 shrink-0 text-amber-500"
                aria-hidden="true"
              />
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Nessun controllo urgente da fare adesso.
              </p>
            </div>

            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/habits" className="inline-flex items-center gap-2">
                Vedi tutte
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-3">
              {visibleOccurrences.map((occurrence) => (
                <div
                  key={occurrence.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                      {occurrence.habit.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {occurrence.habit.category.name}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    {formatMoney(occurrence.habit.amount)}
                  </p>
                </div>
              ))}
            </div>

            {remainingCount > 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                E altre {remainingCount} abitudini da controllare.
              </p>
            ) : null}

            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/habits" className="inline-flex items-center gap-2">
                Vedi tutte
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
