import Link from "next/link";
import { SunMedium } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/src/components/shared/empty-state";
import { formatMoney } from "@/src/lib/formatters";
import { HabitOccurrenceActions } from "@/src/components/habits/habit-occurrence-actions";

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
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "avoided":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "skipped":
      return "border-zinc-200 bg-zinc-100 text-zinc-600";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

export function TodayHabits({ occurrences }: TodayHabitsProps) {
  if (occurrences.length === 0) {
    return (
      <EmptyState
        title="Nessuna abitudine per oggi"
        description="Se hai già creato abitudini ma oggi non sono previste, va tutto bene. Se invece vuoi iniziare, aggiungine una qui sotto."
        note="Le occorrenze di oggi si creano automaticamente quando la pagina si apre."
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
    <Card className="overflow-hidden border-zinc-200/80 shadow-sm">
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Oggi</CardTitle>
            <p className="text-sm text-zinc-500">
              Le abitudini previste per oggi. Segnale quando le fai o quando le eviti.
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {occurrences.length} oggi
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5 sm:p-6">
        {occurrences.map((occurrence) => {
          const status = occurrence.status;

          return (
            <div
              key={occurrence.id}
              className="rounded-3xl border border-zinc-200 bg-zinc-50/60 p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-lg font-semibold text-zinc-950">
                      {occurrence.habit.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                      <span>{occurrence.habit.category.name}</span>
                      <span aria-hidden="true">•</span>
                      <span>{formatMoney(occurrence.habit.amount)}</span>
                    </div>
                  </div>

                  <Badge className={getStatusBadgeClass(status)}>
                    {statusLabels[status]}
                  </Badge>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                      Costo abituale
                    </p>
                    <p className="mt-1 font-semibold text-zinc-950">
                      {formatMoney(occurrence.habit.amount)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                      Categoria
                    </p>
                    <p className="mt-1 font-semibold text-zinc-950">
                      {occurrence.habit.category.name}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                      Stato
                    </p>
                    <p className="mt-1 font-semibold text-zinc-950">
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
