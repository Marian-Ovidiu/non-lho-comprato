import Link from "next/link";
import { Repeat2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/src/components/shared/empty-state";
import { HabitCard } from "@/src/components/habits/habit-card";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
};

type HabitListProps = {
  categories: CategoryOption[];
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

export function HabitList({ habits, categories }: HabitListProps) {
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
        {habits.map((habit, index) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            categories={categories}
            showSeparator={index < habits.length - 1}
          />
        ))}
      </CardContent>
    </Card>
  );
}
