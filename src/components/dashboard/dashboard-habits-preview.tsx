import Link from "next/link";
import { ArrowRight, SunMedium } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryPill } from "@/src/components/shared/category-pill";
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
          slug?: string | null;
        };
      };
  }>;
  description?: string;
};

export function DashboardHabitsPreview({
  occurrences,
  description = "Le abitudini ancora da controllare oggi.",
}: DashboardHabitsPreviewProps) {
  const pendingOccurrences = occurrences.filter(
    (occurrence) => occurrence.status === "pending",
  );
  const visibleOccurrences = pendingOccurrences.slice(0, 3);
  const remainingCount = pendingOccurrences.length - visibleOccurrences.length;

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="space-y-2 p-3.5 pb-0 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Abitudini di oggi</CardTitle>
            <p className="text-sm text-muted-text">{description}</p>
          </div>
          <Badge variant="secondary">{pendingOccurrences.length} in attesa</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3.5 p-3.5 sm:p-5">
        {pendingOccurrences.length === 0 ? (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-surface-muted px-3.5 py-3">
              <SunMedium className="size-5 shrink-0 text-success" aria-hidden="true" />
              <p className="text-sm leading-5 text-muted-text">
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
            <div className="space-y-2.5">
              {visibleOccurrences.map((occurrence) => (
                <div
                  key={occurrence.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {occurrence.habit.name}
                    </p>
                    <CategoryPill
                      category={occurrence.habit.category}
                      className="mt-1 px-2 py-0.5 text-[11px]"
                    />
                  </div>

                  <p className="shrink-0 text-sm font-semibold text-foreground">
                    {formatMoney(occurrence.habit.amount)}
                  </p>
                </div>
              ))}
            </div>

            {remainingCount > 0 ? (
              <p className="text-sm text-muted-text">
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
