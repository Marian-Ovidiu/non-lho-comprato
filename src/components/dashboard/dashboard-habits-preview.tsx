import Link from "next/link";
import { ArrowRight, SunMedium } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/src/components/shared/empty-state";
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

  if (pendingOccurrences.length === 0) {
    return (
      <Card className="overflow-hidden border-zinc-200/80 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <EmptyState
            title="Nessuna abitudine in attesa"
            description="Oggi non c'è nulla da segnare. Se vuoi vedere o gestire le ricorrenze, passa dalla pagina Abitudini."
            note="Da qui puoi comunque raggiungere il controllo completo delle abitudini."
            icon={<SunMedium className="size-5" aria-hidden="true" />}
            action={
              <Button asChild className="w-full sm:w-auto">
                <Link href="/habits">Vai alle abitudini</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const visibleOccurrences = pendingOccurrences.slice(0, 3);
  const remainingCount = pendingOccurrences.length - visibleOccurrences.length;

  return (
    <Card className="overflow-hidden border-zinc-200/80 shadow-sm">
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Abitudini di oggi</CardTitle>
            <p className="text-sm text-zinc-500">
              Le abitudini ancora da decidere oggi.
            </p>
          </div>
          <Badge variant="secondary">{pendingOccurrences.length} in attesa</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="space-y-3">
          {visibleOccurrences.map((occurrence) => (
            <div
              key={occurrence.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-950">
                  {occurrence.habit.name}
                </p>
                <p className="text-sm text-zinc-500">
                  {occurrence.habit.category.name}
                </p>
              </div>

              <p className="shrink-0 text-sm font-semibold text-zinc-950">
                {formatMoney(occurrence.habit.amount)}
              </p>
            </div>
          ))}
        </div>

        {remainingCount > 0 ? (
          <p className="text-sm text-zinc-500">
            E altre {remainingCount} abitudini da controllare.
          </p>
        ) : null}

        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/habits" className="inline-flex items-center gap-2">
            Apri abitudini
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
