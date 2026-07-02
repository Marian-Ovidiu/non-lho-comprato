import { unstable_rethrow } from "next/navigation";

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
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { buildCraftedHabitsProps } from "@/src/lib/crafted-habits-build";
import { DEFAULT_CATEGORIES, toCategoryOption } from "@/src/lib/categories";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import {
  getCurrentUser,
  getCurrentWorkspace,
  getCurrentWorkspaceCurrency,
  getCurrentWorkspaceLanguage,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceTimezone,
} from "@/src/lib/workspace-context";
import { getCurrencySymbol } from "@/src/lib/workspace-currency";
import { getTranslations } from "@/src/lib/i18n";
import { getTodayDateKey } from "@/src/lib/workspace-dates";


export default async function HabitsPage() {
  try {
    void finalizeOldPendingOccurrences();
    await ensureTodayHabitOccurrences();
  } catch (error) {
    unstable_rethrow(error);
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

  const language = await getCurrentWorkspaceLanguage();
  const t = getTranslations(language);

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
    unstable_rethrow(error);
    loadError = formatEntryLoadError(error);
    console.error("Failed to load habits page:", error);
  }

  if (!loadError) {
    try {
      habitStats = await getHabitStats();
    } catch (error) {
      unstable_rethrow(error);
      habitStatsError = formatEntryLoadError(error);
      console.error("Failed to load habits stats:", error);
    }
  }

  if (loadError || !workspace || !currentUser) {
    return (
      <main className="pb-6">
        <div className="px-5 pt-5 pb-4">
          <DataLoadErrorBanner
            title={t.habits.loadError}
            message={loadError ?? t.habits.workspaceDataUnavailable}
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

  const [currency, timeZone] = await Promise.all([
    getCurrentWorkspaceCurrency(),
    getCurrentWorkspaceTimezone(),
  ]);
  const craftedProps = buildCraftedHabitsProps({
    todayOccurrences,
    habits,
    habitStats,
    currencySymbol: getCurrencySymbol(currency),
    language,
    members,
    currentUserId: currentUser.id,
    todayDateKey: getTodayDateKey(timeZone),
  });

  const isEmpty = habits.length === 0 && todayOccurrences.length === 0;

  return (
    <main className="pb-6">
      {habitStatsError ? (
        <div className="px-5 pb-4">
          <DataLoadErrorBanner
            title={t.habits.statsLoadError}
            message={habitStatsError}
          />
        </div>
      ) : null}

      {isEmpty ? (
        <CraftedHabitsEmptyState />
      ) : (
        <CraftedHabits
          {...craftedProps}
          categories={categoryOptions}
          members={members}
          currentUserId={currentUser.id}
          workspaceKind={workspace.kind}
        />
      )}

      <section id="nuova-abitudine" className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        {!isEmpty ? <Rule className="mb-6" /> : null}
        <Label className="mb-4 block">{t.habitForm.createTitle}</Label>
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
