import { getStatsPageData } from "@/src/actions/stats";
import { PostHogEventOnMount } from "@/src/components/analytics/posthog-event-on-mount";
import { CraftedPersonFilter } from "@/src/components/stats/crafted-person-filter";
import { CraftedStats } from "@/src/components/stats/crafted-stats";
import type { CraftedTopSavingsItem } from "@/src/components/stats/crafted-top-savings-list";
import { CraftedStatsEmptyState } from "@/src/components/stats/crafted-stats-empty-state";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { buildCraftedStatsProps } from "@/src/lib/crafted-stats-build";
import { buildDailySpendingComparison } from "@/src/lib/daily-spending-comparison";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import type { StatsOverview } from "@/src/lib/stats-overview";
import { getWorkspaceMemberFilter } from "@/src/lib/workspace-member-filter";
import { getCurrentWorkspaceMembers } from "@/src/lib/workspace-context";

export const dynamic = "force-dynamic";

type StatsPageProps = {
  searchParams: Promise<{
    person?: string | string[];
  }>;
};

export default async function StatsPage({ searchParams }: StatsPageProps) {
  let members: Awaited<ReturnType<typeof getCurrentWorkspaceMembers>> = [];
  let loadError: string | null = null;

  try {
    members = await getCurrentWorkspaceMembers();
  } catch (error) {
    loadError = formatEntryLoadError(error);
    console.error("Failed to load stats workspace members:", error);
  }

  const memberUserId = getWorkspaceMemberFilter(
    (await searchParams).person,
    members,
  );
  let overview: StatsOverview = {
    entriesCount: 0,
    totalRealSpent: 0,
    totalAlternativeCost: 0,
    totalSaved: 0,
    averageSavedPerEntry: 0,
    savingRatePercent: 0,
  };
  let monthlyStats: Awaited<ReturnType<typeof getStatsPageData>>["monthlyStats"] = [];
  let categoryStats: Awaited<ReturnType<typeof getStatsPageData>>["categoryStats"] = [];
  let habitStats: Awaited<ReturnType<typeof getStatsPageData>>["habitStats"] = [];
  let insights: Awaited<ReturnType<typeof getStatsPageData>>["insights"] = [];
  let topSavings: CraftedTopSavingsItem[] = [];
  let dailySpendingComparison = buildDailySpendingComparison([]);

  try {
    const stats = await getStatsPageData(memberUserId, members);
    overview = stats.overview;
    monthlyStats = stats.monthlyStats;
    categoryStats = stats.categoryStats;
    habitStats = stats.habitStats;
    insights = stats.insights;
    topSavings = stats.topSavings.map((item) => ({
      ...item,
      date: item.date.toISOString(),
    }));
    dailySpendingComparison = stats.dailySpendingComparison;
  } catch (error) {
    loadError = formatEntryLoadError(error);
    console.error("Failed to load stats:", error);
  }

  const isCompletelyEmpty =
    !loadError && overview.entriesCount === 0 && habitStats.length === 0;

  const craftedProps = buildCraftedStatsProps({
    overview,
    monthlyStats,
    categoryStats,
    insights,
    dailySpendingComparison,
  });

  return (
    <main className="pb-6">
      <PostHogEventOnMount eventName="stats_viewed" />

      <CraftedPersonFilter
        members={members}
        selectedMemberUserId={memberUserId}
        basePath="/stats"
      />

      {loadError ? (
        <div className="px-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile caricare le statistiche"
            message={loadError}
          />
        </div>
      ) : null}

      {isCompletelyEmpty ? (
        <CraftedStatsEmptyState />
      ) : loadError ? null : (
        <CraftedStats
          {...craftedProps}
          topSavings={topSavings}
          habitStats={habitStats.map((habit) => ({
            habitId: habit.habitId,
            habitName: habit.habitName,
            totalSaved: habit.totalSaved,
            disciplineRatePercent: habit.disciplineRatePercent,
          }))}
        />
      )}
    </main>
  );
}
