import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";

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
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <CardTitle>Performance abitudini</CardTitle>
        <p className="text-sm text-muted-text">
          Qui vedi come stanno andando le abitudini ricorrenti.
        </p>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        {habits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-5 text-sm text-muted-text">
            Nessuna abitudine ancora tracciata.
          </div>
        ) : (
          <div className="space-y-3">
            {habits.map((habit) => (
              <div
                key={habit.habitId}
                className="rounded-2xl border border-border bg-surface-muted p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{habit.habitName}</p>
                    <p className="text-sm text-muted-text">{habit.categoryName}</p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-lg font-semibold text-success">
                      {formatMoney(habit.totalSaved)}
                    </p>
                    <p className="text-xs text-muted-text">Risparmiati</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <Badge variant="secondary">Evitati: {habit.avoidedCount}</Badge>
                  <Badge variant="secondary">Fatti: {habit.spentCount}</Badge>
                  <Badge variant="secondary">Saltati: {habit.skippedCount}</Badge>
                  <Badge variant="secondary">In attesa: {habit.pendingCount}</Badge>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-text">
                    Totale occorrenze:{" "}
                    <span className="font-semibold text-foreground">
                      {habit.totalOccurrences}
                    </span>
                  </p>
                  <Badge className="w-fit bg-accent text-background hover:bg-accent">
                    Disciplina {formatPercent(habit.disciplineRatePercent)}
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

