import Link from "next/link";
import { Repeat2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/src/components/shared/empty-state";
import { CategoryPill } from "@/src/components/shared/category-pill";
import { formatMoney } from "@/src/lib/formatters";

type HabitListProps = {
  habits: Array<{
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
    _count: {
      occurrences: number;
    };
  }>;
};

const weekdayMap = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Gio" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sab" },
  { value: 7, label: "Dom" },
] as const;

function getActiveDayLabels(activeDays: unknown): string[] {
  if (!Array.isArray(activeDays)) {
    return [];
  }

  return weekdayMap
    .filter((day) => activeDays.map((value) => Number(value)).includes(day.value))
    .map((day) => day.label);
}

export function HabitList({ habits }: HabitListProps) {
  if (habits.length === 0) {
    return (
      <EmptyState
        title="Nessuna abitudine ancora"
        description="🧭 Crea la prima abitudine ricorrente e il suo costo comparirà qui. Ti basta un minuto."
        note="☕ Un caffè al bar è il caso perfetto per iniziare."
        icon={<Repeat2 className="size-5" aria-hidden="true" />}
        action={
          <Button asChild className="w-full sm:w-auto">
            <Link href="#nuova-abitudine">Aggiungi abitudine</Link>
          </Button>
        }
      />
    );
  }

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <CardTitle>Le tue abitudini</CardTitle>
        <p className="text-sm text-muted-text">
          Le regole che hai già impostato, ordinate per nome.
        </p>
      </CardHeader>

      <CardContent className="space-y-4 p-5 sm:p-6">
        {habits.map((habit, index) => {
          const activeDayLabels = getActiveDayLabels(habit.activeDays);

          return (
            <div key={habit.id} className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-lg font-semibold text-foreground">
                    {habit.name}
                  </p>
                  <CategoryPill
                    category={habit.category}
                    className="px-2.5 py-0.5 text-[11px]"
                  />
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {formatMoney(habit.amount)}
                  </p>
                  <p className="text-xs text-muted-text">
                    {habit.isActive ? "Attiva" : "In pausa"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeDayLabels.length > 0 ? (
                  activeDayLabels.map((label) => (
                    <Badge key={label} variant="secondary">
                      {label}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">Nessun giorno</Badge>
                )}
                <Badge variant="outline">
                  {habit.defaultBehavior === "spent"
                    ? "Conta come spesa fatta"
                    : "Comportamento personalizzato"}
                </Badge>
                <Badge variant="outline">
                  {habit._count.occurrences} occorrenze
                </Badge>
              </div>

              {index < habits.length - 1 ? <Separator /> : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

