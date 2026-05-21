import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryPill } from "@/src/components/shared/category-pill";
import { formatMoney } from "@/src/lib/formatters";
import { spacing } from "@/src/lib/spacing";

type HabitStatsListProps = {
  habits: Array<{
    habitId: string;
    habitName: string;
    categoryName: string;
    amount: number;
    totalOccurrences: number;
    spentCount: number;
    avoidedCount: number;
    skippedCount: number;
    pendingCount: number;
    totalSaved: number;
    disciplineRatePercent: number;
  }>;
};

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function HabitStatsList({ habits }: HabitStatsListProps) {
  return (
    <Card className="overflow-hidden border-border/60 bg-surface/85 shadow-none ring-1 ring-white/5">
      <CardHeader className={spacing.cardHeader}>
        <CardTitle className="text-base font-semibold tracking-tight text-foreground">
          Abitudini che reggono
        </CardTitle>
        <p className="text-sm leading-6 text-muted-text">
          Qui vedi quali abitudini stanno cambiando il ritmo delle spese.
        </p>
      </CardHeader>
      <CardContent className={spacing.cardBody}>
        {habits.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-surface-muted/60 p-4 sm:p-6 text-sm leading-6 text-muted-text">
            Nessuna abitudine ancora tracciata.
          </div>
        ) : (
          <div className="space-y-3">
            {habits.map((habit) => (
              <div
                key={habit.habitId}
                className="rounded-3xl border border-border/60 bg-surface-muted/70 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold tracking-tight text-foreground">
                      {habit.habitName}
                    </p>
                    <CategoryPill
                      category={{ name: habit.categoryName }}
                      className="px-3 py-1 text-[11px]"
                    />
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-lg font-semibold tracking-tight text-success">
                      {formatMoney(habit.totalSaved)}
                    </p>
                    <p className="text-xs text-muted-text">Risparmiati</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <Badge variant="secondary" className="rounded-full">
                    Evitati: {habit.avoidedCount}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    Fatti: {habit.spentCount}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    Saltati: {habit.skippedCount}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    In attesa: {habit.pendingCount}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-text">
                    Totale occorrenze:{" "}
                    <span className="font-semibold text-foreground">
                      {habit.totalOccurrences}
                    </span>
                  </p>
                  <Badge className="w-fit rounded-full bg-accent text-background hover:bg-accent">
                    Evitati {formatPercent(habit.disciplineRatePercent)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
