import Link from "next/link";

import { getStatsPageData } from "@/src/actions/stats";
import { PageHeader } from "@/src/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PostHogEventOnMount } from "@/src/components/analytics/posthog-event-on-mount";
import { CategorySavingsChart } from "@/src/components/stats/category-savings-chart";
import { CategoryStatsList } from "@/src/components/stats/category-stats-list";
import { HabitStatsList } from "@/src/components/stats/habit-stats-list";
import { MonthlySavingsChart } from "@/src/components/stats/monthly-savings-chart";
import { PersonFilter } from "@/src/components/shared/person-filter";
import { StatsEmptyState } from "@/src/components/stats/stats-empty-state";
import { StatsHeroCard } from "@/src/components/stats/stats-hero-card";
import { StatsInsights } from "@/src/components/stats/stats-insights";
import { StatsOverviewCards } from "@/src/components/stats/stats-overview-cards";
import { TopSavingsList } from "@/src/components/stats/top-savings-list";
import { formatMoney } from "@/src/lib/formatters";
import { getWorkspaceMemberFilter } from "@/src/lib/workspace-member-filter";
import { getCurrentWorkspaceMembers } from "@/src/lib/workspace-context";
import { spacing } from "@/src/lib/spacing";

export const dynamic = "force-dynamic";

type StatsPageProps = {
  searchParams: Promise<{
    person?: string | string[];
  }>;
};

function getMonthDirection(
  monthlyStats: Awaited<ReturnType<typeof getStatsPageData>>["monthlyStats"],
) {
  const sortedStats = [...monthlyStats].sort((left, right) =>
    left.month.localeCompare(right.month),
  );
  const current = sortedStats.at(-1);
  const previous = sortedStats.at(-2);

  if (!current || !previous) {
    return {
      label: "Direzione del mese",
      value: "Si sta costruendo",
      detail: "Appena ci sarà un secondo mese, qui apparirà un confronto utile.",
    };
  }

  const diff = current.totalSaved - previous.totalSaved;

  if (diff > 0) {
    return {
      label: "Direzione del mese",
      value: "Sopra il mese scorso",
      detail: `Hai tenuto ${formatMoney(diff)} in più rispetto al mese precedente.`,
    };
  }

  if (diff < 0) {
    return {
      label: "Direzione del mese",
      value: "Più leggero del mese scorso",
      detail: `Hai tenuto ${formatMoney(Math.abs(diff))} in meno del mese precedente.`,
    };
  }

  return {
    label: "Direzione del mese",
    value: "In linea col mese scorso",
    detail: "Il ritmo del mese è stabile.",
  };
}

function getStatsSummary({
  totalSaved,
  bestCategoryName,
  biggestSavingTitle,
  monthDirectionValue,
  hasData,
}: {
  totalSaved: number;
  bestCategoryName?: string | null;
  biggestSavingTitle?: string | null;
  monthDirectionValue: string;
  hasData: boolean;
}) {
  if (!hasData) {
    return "Appena inizi a registrare movimenti, qui compariranno le direzioni più utili del mese.";
  }

  const categoryPart = bestCategoryName
    ? `${bestCategoryName} è la categoria che ti sta lasciando più soldi in tasca.`
    : "Qui puoi leggere dove il denaro resta più spesso.";

  const savingPart = biggestSavingTitle
    ? `La mossa più forte finora è ${biggestSavingTitle}.`
    : "Le scelte più forti appariranno qui.";

  return `${formatMoney(totalSaved)} già tenuti in tasca. ${categoryPart} ${savingPart} ${monthDirectionValue}.`;
}

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const members = await getCurrentWorkspaceMembers();
  const memberUserId = getWorkspaceMemberFilter(
    (await searchParams).person,
    members,
  );
  const { overview, monthlyStats, categoryStats, topSavings, habitStats, insights } =
    await getStatsPageData(memberUserId, members);

  const isCompletelyEmpty =
    overview.entriesCount === 0 && habitStats.length === 0;

  const bestCategory = categoryStats[0] ?? null;
  const biggestSaving = topSavings[0] ?? null;
  const monthDirection = getMonthDirection(monthlyStats);
  const heroSummary = getStatsSummary({
    totalSaved: overview.totalSaved,
    bestCategoryName: bestCategory?.categoryName,
    biggestSavingTitle: biggestSaving?.title,
    monthDirectionValue: monthDirection.value,
    hasData: !isCompletelyEmpty,
  });

  const monthlyChartData = monthlyStats.map((item) => ({
    month: item.month,
    label: item.label,
    totalSaved: item.totalSaved,
    totalRealSpent: item.totalRealSpent,
    totalAlternativeCost: item.totalAlternativeCost,
    entriesCount: item.entriesCount,
  }));

  if (isCompletelyEmpty) {
    return (
      <main className={spacing.pageStack}>
        <PageHeader
          eyebrow="Stats"
          title="Statistiche"
          serifWord="in numeri."
          action={
            <Button asChild className="h-10 rounded-2xl px-4">
              <Link href="/entries/new">Aggiungi movimento</Link>
            </Button>
          }
          chips={[
            { label: `${overview.entriesCount} movimenti`, tone: "default" },
            { label: `${formatMoney(overview.totalSaved)} in tasca`, tone: "success" },
          ]}
        />

        <PersonFilter
          members={members}
          selectedMemberUserId={memberUserId}
          basePath="/stats"
          compact
        />

        <StatsEmptyState />
      </main>
    );
  }

  return (
    <main className={spacing.pageStack}>
      <PostHogEventOnMount eventName="stats_viewed" />

      <PageHeader
        eyebrow="Stats"
        title="Statistiche"
        serifWord="in numeri."
        action={
          <Button asChild className="h-10 rounded-2xl px-4">
            <Link href="/entries/new">Aggiungi movimento</Link>
          </Button>
        }
        chips={[
          { label: `${overview.entriesCount} movimenti`, tone: "default" },
          { label: `${formatMoney(overview.totalSaved)} in tasca`, tone: "success" },
          { label: `${categoryStats.length} categorie forti`, tone: "default" },
        ]}
      />

      <PersonFilter
        members={members}
        selectedMemberUserId={memberUserId}
        basePath="/stats"
        compact
      />

      <StatsHeroCard
        totalSaved={overview.totalSaved}
        summary={heroSummary}
      />

      <StatsInsights insights={insights} />

      <StatsOverviewCards overview={overview} />

      <section aria-label="Grafici" className="grid gap-4">
        <MonthlySavingsChart data={monthlyChartData} />
        <CategorySavingsChart data={categoryStats} />
      </section>

      <CategoryStatsList categories={categoryStats} />

      <TopSavingsList entries={topSavings} />

      <HabitStatsList habits={habitStats} />
    </main>
  );
}
