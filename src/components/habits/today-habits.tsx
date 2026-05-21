import Link from "next/link";
import { SunMedium } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/src/components/shared/empty-state";
import { CategoryPill } from "@/src/components/shared/category-pill";
import { formatMoney } from "@/src/lib/formatters";
import { HabitOccurrenceActions } from "@/src/components/habits/habit-occurrence-actions";
import { spacing } from "@/src/lib/spacing";

type TodayHabitsProps = {
  occurrences: Array<{
    id: string;
    habitId: string;
    date: Date;
    status: "pending" | "spent" | "avoided" | "skipped";
    createdAt: Date;
    updatedAt: Date;
    habit: {
      id: string;
      name: string;
      categoryId: string;
      amount: unknown;
      activeDays: unknown;
      isActive: boolean;
      defaultBehavior: string;
      createdAt: Date;
      updatedAt: Date;
      category: {
        id: string;
        name: string;
        slug: string;
        color: string | null;
        icon: string | null;
      };
    };
    entry: {
      id: string;
      title: string;
      realCost: unknown;
      alternativeCost: unknown;
      savedAmount: unknown;
      source: string;
    } | null;
  }>;
};

const statusLabels = {
  pending: "In attesa",
  spent: "Spesa",
  avoided: "Evitata",
  skipped: "Saltata",
} as const;

function getStatusBadgeClass(status: keyof typeof statusLabels) {
  switch (status) {
    case "spent":
      return "border-success/20 bg-success/10 text-success";
    case "avoided":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "skipped":
      return "border-border bg-surface-muted text-muted-text";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

export function TodayHabits({ occurrences }: TodayHabitsProps) {
  if (occurrences.length === 0) {
    return (
      <EmptyState
        title="Nessuna abitudine per oggi"
        description="Se oggi non sono previste abitudini, va tutto bene. Se vuoi iniziare, aggiungine una qui sotto."
        note="Le occorrenze di oggi si creano automaticamente."
        icon={<SunMedium className="size-5" aria-hidden="true" />}
        action={
          <Button asChild className="w-full sm:w-auto">
            <Link href="#nuova-abitudine">Crea un&apos;abitudine</Link>
          </Button>
        }
      />
    );
  }

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className={spacing.cardHeader}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Oggi</CardTitle>
            <p className="text-sm text-muted-text">
              Le abitudini previste per oggi. Segnale quando le fai o quando le eviti.
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {occurrences.length} oggi
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={`space-y-4 ${spacing.cardBody}`}>
        {occurrences.map((occurrence) => {
          const status = occurrence.status;

          return (
            <div
              key={occurrence.id}
              className="rounded-3xl border border-border bg-surface-muted p-4 shadow-sm sm:p-6"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-lg font-semibold text-foreground">
                      {occurrence.habit.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryPill
                        category={occurrence.habit.category}
                        className="px-3 py-1 text-[11px]"
                      />
                      <span className="text-sm text-muted-text">
                        {formatMoney(occurrence.habit.amount)}
                      </span>
                    </div>
                  </div>

                  <Badge className={getStatusBadgeClass(status)}>
                    {statusLabels[status]}
                  </Badge>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl bg-surface px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-text">
                      Costo abituale
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {formatMoney(occurrence.habit.amount)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-surface px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-text">
                      Categoria
                    </p>
                    <p className="mt-1">
                      <CategoryPill
                        category={occurrence.habit.category}
                        className="px-3 py-1 text-[11px]"
                      />
                    </p>
                  </div>
                  <div className="rounded-2xl bg-surface px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-text">
                      Stato
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {statusLabels[status]}
                    </p>
                  </div>
                </div>

                <HabitOccurrenceActions
                  occurrenceId={occurrence.id}
                  currentStatus={status}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
