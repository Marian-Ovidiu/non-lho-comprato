import Link from "next/link";

import { DashboardEmptyState } from "@/src/components/dashboard/dashboard-empty-state";
import { GoalsPreview } from "@/src/components/dashboard/goals-preview";
import { RecentEntries } from "@/src/components/dashboard/recent-entries";
import { SummaryCards } from "@/src/components/dashboard/summary-cards";
import { PageHeader } from "@/src/components/layout/page-header";
import { PersonFilter } from "@/src/components/shared/person-filter";
import {
  ensureTodayHabitOccurrences,
  finalizeOldPendingOccurrences,
} from "@/src/actions/habits";
import { Button } from "@/components/ui/button";
import { getDashboardSummary, getEntries } from "@/src/actions/entries";
import { getGoalsWithProgress } from "@/src/actions/goals";
import { getPersonFilter } from "@/src/lib/person-filter";

type HomeProps = {
  searchParams: Promise<{
    person?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const person = getPersonFilter((await searchParams).person);

  await ensureTodayHabitOccurrences();
  await finalizeOldPendingOccurrences();

  let summary = {
    totalRealSpent: 0,
    totalAlternativeCost: 0,
    totalSaved: 0,
    entriesCount: 0,
  };
  let recentEntries: Awaited<ReturnType<typeof getEntries>> = [];
  let activeGoals: Awaited<ReturnType<typeof getGoalsWithProgress>> = [];

  try {
    const [loadedSummary, loadedEntries, loadedGoals] = await Promise.all([
      getDashboardSummary(person),
      getEntries(person),
      getGoalsWithProgress(),
    ]);
    summary = loadedSummary;
    recentEntries = loadedEntries.slice(0, 5);
    activeGoals = loadedGoals.filter((goal) => goal.isActive).slice(0, 3);
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
  }

  return (
    <main className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Panoramica"
        title="Dashboard"
        description="Quanto hai speso, quanto avresti speso e quanto hai schivato."
        action={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/entries/new">Aggiungi movimento</Link>
          </Button>
        }
      />

      <PersonFilter person={person} basePath="/" />

      <SummaryCards
        totalRealSpent={summary.totalRealSpent}
        totalAlternativeCost={summary.totalAlternativeCost}
        totalSaved={summary.totalSaved}
        entriesCount={summary.entriesCount}
      />

      <GoalsPreview goals={activeGoals} />

      {recentEntries.length > 0 ? (
        <RecentEntries entries={recentEntries} />
      ) : (
        <DashboardEmptyState />
      )}
    </main>
  );
}
