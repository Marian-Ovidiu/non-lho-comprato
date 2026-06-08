import { getStatsPageData } from "@/src/actions/stats";
import { PostHogEventOnMount } from "@/src/components/analytics/posthog-event-on-mount";
import { CraftedPersonFilter } from "@/src/components/stats/crafted-person-filter";
import { CraftedStats } from "@/src/components/stats/crafted-stats";
import { CraftedStatsEmptyState } from "@/src/components/stats/crafted-stats-empty-state";
import { buildCraftedStatsProps } from "@/src/lib/crafted-stats-build";
import { getWorkspaceMemberFilter } from "@/src/lib/workspace-member-filter";
import { getCurrentWorkspaceMembers } from "@/src/lib/workspace-context";

export const dynamic = "force-dynamic";

type StatsPageProps = {
  searchParams: Promise<{
    person?: string | string[];
  }>;
};

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const members = await getCurrentWorkspaceMembers();
  const memberUserId = getWorkspaceMemberFilter(
    (await searchParams).person,
    members,
  );
  const {
    overview,
    monthlyStats,
    categoryStats,
    habitStats,
    insights,
    dailySpendingComparison,
  } = await getStatsPageData(memberUserId, members);

  const isCompletelyEmpty =
    overview.entriesCount === 0 && habitStats.length === 0;

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

      {isCompletelyEmpty ? (
        <CraftedStatsEmptyState />
      ) : (
        <CraftedStats
          {...craftedProps}
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
