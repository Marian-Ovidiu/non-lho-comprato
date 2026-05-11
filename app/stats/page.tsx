import Link from "next/link";

import {
  getCategoryStats,
  getHabitStats,
  getMonthlyStats,
  getStatsOverview,
  getTopSavings,
} from "@/src/actions/stats";
import { PageHeader } from "@/src/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CategorySavingsChart } from "@/src/components/stats/category-savings-chart";
import { CategoryStatsList } from "@/src/components/stats/category-stats-list";
import { HabitStatsList } from "@/src/components/stats/habit-stats-list";
import { MonthlySavingsChart } from "@/src/components/stats/monthly-savings-chart";
import { PersonFilter } from "@/src/components/shared/person-filter";
import { StatsEmptyState } from "@/src/components/stats/stats-empty-state";
import { StatsHeroCard } from "@/src/components/stats/stats-hero-card";
import { StatsOverviewCards } from "@/src/components/stats/stats-overview-cards";
import { TopSavingsList } from "@/src/components/stats/top-savings-list";
import { getPersonFilter } from "@/src/lib/person-filter";

type StatsPageProps = {
  searchParams: Promise<{
    person?: string | string[];
  }>;
};

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const person = getPersonFilter((await searchParams).person);
  const [overview, monthlyStats, categoryStats, topSavings, habitStats] =
    await Promise.all([
      getStatsOverview(person),
      getMonthlyStats(person),
      getCategoryStats(person),
      getTopSavings(person),
      getHabitStats(person),
    ]);

  const isCompletelyEmpty =
    overview.entriesCount === 0 && habitStats.length === 0;

  if (isCompletelyEmpty) {
    return (
      <main className="space-y-5 sm:space-y-6">
        <PageHeader
          eyebrow="Statistiche"
          title="Statistiche"
          description="Qui vedi dove stai vincendo e dove i soldi provano ancora a fregarti."
          action={
            <Button asChild className="w-full sm:w-auto">
              <Link href="/entries/new">Aggiungi movimento</Link>
            </Button>
          }
        />

        <PersonFilter person={person} basePath="/stats" />

        <StatsEmptyState />
      </main>
    );
  }

  const bestCategory = categoryStats[0] ?? null;
  const biggestSaving = topSavings[0] ?? null;

  const monthlyChartData = monthlyStats.map((item) => ({
    month: item.month,
    label: item.label,
    totalSaved: item.totalSaved,
    totalRealSpent: item.totalRealSpent,
    totalAlternativeCost: item.totalAlternativeCost,
    entriesCount: item.entriesCount,
  }));

  return (
    <main className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Statistiche"
        title="Statistiche"
        description="Qui vedi dove stai vincendo e dove i soldi provano ancora a fregarti."
        action={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/entries/new">Aggiungi movimento</Link>
          </Button>
        }
      />

      <PersonFilter person={person} basePath="/stats" />

      <StatsHeroCard
        totalSaved={overview.totalSaved}
        savingRatePercent={overview.savingRatePercent}
        bestCategoryName={bestCategory?.categoryName}
        biggestSavingTitle={biggestSaving?.title}
      />

      <StatsOverviewCards overview={overview} />

      <section className="grid gap-3 xl:grid-cols-2">
        <MonthlySavingsChart data={monthlyChartData} />
        <CategorySavingsChart data={categoryStats} />
      </section>

      <CategoryStatsList categories={categoryStats} />

      <TopSavingsList entries={topSavings} />

      <HabitStatsList habits={habitStats} />
    </main>
  );
}
