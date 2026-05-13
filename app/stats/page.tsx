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
import { formatMoney } from "@/src/lib/formatters";
import { getPersonFilter } from "@/src/lib/person-filter";

export const dynamic = "force-dynamic";

type StatsPageProps = {
  searchParams: Promise<{
    person?: string | string[];
  }>;
};

function getMonthDirection(monthlyStats: Awaited<ReturnType<typeof getMonthlyStats>>) {
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

function getStrongestHabit(
  habitStats: Awaited<ReturnType<typeof getHabitStats>>,
) {
  const sortedHabits = [...habitStats].sort(
    (left, right) =>
      right.disciplineRatePercent - left.disciplineRatePercent ||
      right.totalOccurrences - left.totalOccurrences ||
      right.totalSaved - left.totalSaved,
  );

  const strongestHabit = sortedHabits[0];

  if (!strongestHabit) {
    return {
      label: "Abitudine più solida",
      value: "In costruzione",
      detail: "Appena inizierai a usare le abitudini, qui comparirà il segnale più forte.",
    };
  }

  return {
    label: "Abitudine più solida",
    value: strongestHabit.habitName,
    detail: `${strongestHabit.disciplineRatePercent.toFixed(1)}% evitati su ${strongestHabit.totalOccurrences} occorrenze.`,
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

  const bestCategory = categoryStats[0] ?? null;
  const biggestSaving = topSavings[0] ?? null;
  const monthDirection = getMonthDirection(monthlyStats);
  const strongestHabit = getStrongestHabit(habitStats);
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
      <main className="space-y-5 sm:space-y-6">
        <PageHeader
          title="Statistiche"
          context="Appena inizi a registrare movimenti, qui compariranno segnali utili e letture del mese."
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

        <PersonFilter person={person} basePath="/stats" compact />

        <StatsEmptyState />
      </main>
    );
  }

  return (
    <main className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Statistiche"
        context={heroSummary}
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

      <PersonFilter person={person} basePath="/stats" compact />

      <StatsHeroCard
        totalSaved={overview.totalSaved}
        summary={heroSummary}
        insights={[
          {
            label: "Dove rende di più",
            value: bestCategory?.categoryName ?? "Ancora da leggere",
            detail: bestCategory
              ? `${formatMoney(bestCategory.totalSaved)} protetti qui.`
              : "Le categorie più forti appariranno qui.",
            tone: "success",
          },
          strongestHabit,
          {
            label: monthDirection.label,
            value: monthDirection.value,
            detail: monthDirection.detail,
            tone: "premium",
          },
        ]}
      />

      <StatsOverviewCards overview={overview} />

      <section className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
        <MonthlySavingsChart data={monthlyChartData} />
        <CategorySavingsChart data={categoryStats} />
      </section>

      <CategoryStatsList categories={categoryStats} />

      <TopSavingsList entries={topSavings} />

      <HabitStatsList habits={habitStats} />
    </main>
  );
}
