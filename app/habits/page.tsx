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
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { buildCraftedHabitsProps } from "@/src/lib/crafted-habits-build";
import { DEFAULT_CATEGORIES, toCategoryOption } from "@/src/lib/categories";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import {
  getCurrentUser,
  getCurrentWorkspace,
  getCurrentWorkspaceCurrency,
  getCurrentWorkspaceMembers,
} from "@/src/lib/workspace-context";
import { getCurrencySymbol } from "@/src/lib/workspace-currency";


export default async function HabitsPage() {
  try {
    void finalizeOldPendingOccurrences();
    await ensureTodayHabitOccurrences();
  } catch (error) {
    console.error("Failed to sync habit occurrences:", error);
  }

  let loadError: string | null = null;
  let habitStatsError: string | null = null;
  let workspace: Awaited<ReturnType<typeof getCurrentWorkspace>> | null = null;
  let currentUser: Awaited<ReturnType<typeof getCurrentUser>> | null = null;
  let members: Awaited<ReturnType<typeof getCurrentWorkspaceMembers>> = [];
  let habits: Awaited<ReturnType<typeof getHabits>> = [];
  let todayOccurrences: Awaited<ReturnType<typeof getTodayHabitOccurrences>> = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let habitStats: Awaited<ReturnType<typeof getHabitStats>> = [];

  try {
    [workspace, currentUser, members, habits] = await Promise.all([
      getCurrentWorkspace(),
      getCurrentUser(),
      getCurrentWorkspaceMembers(),
      getHabits(),
    ]);
    [todayOccurrences, categories] = await Promise.all([
      getTodayHabitOccurrences(),
      getCategories(),
    ]);
  } catch (error) {
    loadError = formatEntryLoadError(error);
    console.error("Failed to load habits page:", error);
  }

  if (!loadError) {
    try {
      habitStats = await getHabitStats();
    } catch (error) {
      habitStatsError = formatEntryLoadError(error);
      console.error("Failed to load habits stats:", error);
    }
  }

  if (loadError || !workspace || !currentUser) {
    return (
      <main className="pb-6">
        <div className="px-5 pt-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile caricare le abitudini"
            message={loadError ?? "Dati workspace non disponibili. Riprova tra poco."}
          />
        </div>
      </main>
    );
  }

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

  const currency = await getCurrentWorkspaceCurrency();
  const craftedProps = buildCraftedHabitsProps({
    todayOccurrences,
    habits,
    habitStats,
    currencySymbol: getCurrencySymbol(currency),
  });

  const isEmpty = habits.length === 0 && todayOccurrences.length === 0;

  return (
    <main className="pb-6">
      <HabitReminderBanner occurrences={todayOccurrences} />

      {habitStatsError ? (
        <div className="px-5 pb-4">
          <DataLoadErrorBanner
            title="Statistiche abitudini non disponibili"
            message={habitStatsError}
          />
        </div>
      ) : null}

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
