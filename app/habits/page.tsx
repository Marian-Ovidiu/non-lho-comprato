import Link from "next/link";

import {
  ensureTodayHabitOccurrences,
  finalizeOldPendingOccurrences,
  getHabits,
  getTodayHabitOccurrences,
} from "@/src/actions/habits";
import { getCategories } from "@/src/actions/entries";
import { HabitForm } from "@/src/components/habits/habit-form";
import { HabitList } from "@/src/components/habits/habit-list";
import { TodayHabits } from "@/src/components/habits/today-habits";
import { PageHeader } from "@/src/components/layout/page-header";
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { Button } from "@/components/ui/button";

export default async function HabitsPage() {
  await finalizeOldPendingOccurrences();
  await ensureTodayHabitOccurrences();

  const [habits, todayOccurrences, categories] = await Promise.all([
    getHabits(),
    getTodayHabitOccurrences(),
    getCategories(),
  ]);

  const categoryOptions =
    categories.length > 0
      ? categories
      : DEFAULT_CATEGORIES.map((category) => ({
          id: category.slug,
          name: category.name,
          slug: category.slug,
          color: category.color,
          icon: category.icon,
        }));

  return (
    <main className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Ricorrenti"
        title="Abitudini"
        description="Le piccole spese automatiche che ti fregano senza fare rumore."
        action={
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="#nuova-abitudine">Nuova abitudine</Link>
          </Button>
        }
      />

      <section id="oggi" className="space-y-4">
        <TodayHabits occurrences={todayOccurrences} />
      </section>

      <section id="nuova-abitudine" className="space-y-4">
        <HabitForm categories={categoryOptions} />
      </section>

      <section id="le-tue-abitudini" className="space-y-4">
        <HabitList habits={habits} />
      </section>
    </main>
  );
}
