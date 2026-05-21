import Link from "next/link";
import { Flame } from "lucide-react";

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
import { spacing } from "@/src/lib/spacing";

export const dynamic = "force-dynamic";

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
    <main className={spacing.pageStack}>
      <PageHeader
        title="Abitudini"
        context={`${todayOccurrences.length} attive oggi`}
        action={
          <Button asChild className="h-10 rounded-2xl px-4">
            <Link href="#nuova-abitudine">
              <Flame className="size-4" aria-hidden="true" />
              Nuova abitudine
            </Link>
          </Button>
        }
        chips={[
          { label: `${todayOccurrences.length} oggi`, tone: "success" },
          { label: `${habits.length} totali`, tone: "default" },
        ]}
      />

      <section id="oggi" className="space-y-4">
        <TodayHabits occurrences={todayOccurrences} />
      </section>

      <section id="nuova-abitudine" className="space-y-4">
        <HabitForm categories={categoryOptions} />
      </section>

      <section id="le-tue-abitudini" className="space-y-4">
        <HabitList habits={habits} categories={categoryOptions} />
      </section>
    </main>
  );
}
