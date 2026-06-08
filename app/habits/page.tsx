import {
  ensureTodayHabitOccurrences,
  finalizeOldPendingOccurrences,
  getHabits,
  getTodayHabitOccurrences,
} from "@/src/actions/habits";
import { getCategories } from "@/src/actions/entries";
import { getHabitStats } from "@/src/actions/stats";
import { Label, Rule } from "@/components/crafted";
import { CraftedHabits } from "@/src/components/habits/crafted-habits";
import { CraftedHabitsEmptyState } from "@/src/components/habits/crafted-habits-empty-state";
import { CraftedHabitForm } from "@/src/components/habits/crafted-habit-form";
import { HabitList } from "@/src/components/habits/habit-list";
import { HabitReminderBanner } from "@/src/components/notifications/habit-reminder-banner";
import { buildCraftedHabitsProps } from "@/src/lib/crafted-habits-build";
import { DEFAULT_CATEGORIES, toCategoryOption } from "@/src/lib/categories";
import {
  getCurrentUser,
  getCurrentWorkspace,
  getCurrentWorkspaceMembers,
} from "@/src/lib/workspace-context";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  void finalizeOldPendingOccurrences();
  await ensureTodayHabitOccurrences();

  const [workspace, currentUser, members, habits, todayOccurrences, categories, habitStats] =
    await Promise.all([
      getCurrentWorkspace(),
      getCurrentUser(),
      getCurrentWorkspaceMembers(),
      getHabits(),
      getTodayHabitOccurrences(),
      getCategories(),
      getHabitStats().catch(() => []),
    ]);

  const categoryOptions =
    categories.length > 0
      ? categories.map(toCategoryOption)
      : DEFAULT_CATEGORIES.map((category) => ({
          id: category.slug,
          name: category.name,
          slug: category.slug,
          color: category.color,
          icon: category.icon,
        }));

  const craftedProps = buildCraftedHabitsProps({
    todayOccurrences,
    habits,
    habitStats,
  });

  const isEmpty = habits.length === 0 && todayOccurrences.length === 0;

  return (
    <main className="pb-6">
      <HabitReminderBanner occurrences={todayOccurrences} />

      {isEmpty ? (
        <CraftedHabitsEmptyState />
      ) : (
        <CraftedHabits {...craftedProps} />
      )}

      {!isEmpty && habits.length > 0 ? (
        <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
          <Rule className="mb-6" />
          <Label className="mb-4 block">Gestione abitudini</Label>
          <HabitList
            habits={habits}
            categories={categoryOptions}
            members={members}
            currentUserId={currentUser.id}
            workspaceKind={workspace.kind}
          />
        </section>
      ) : null}

      <section id="nuova-abitudine" className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        {!isEmpty ? <Rule className="mb-6" /> : null}
        <Label className="mb-4 block">Nuova abitudine</Label>
        <CraftedHabitForm
          categories={categoryOptions}
          members={members}
          currentUserId={currentUser.id}
          workspaceKind={workspace.kind}
        />
      </section>
    </main>
  );
}
