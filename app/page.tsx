import Link from "next/link";

import { DashboardEmptyState } from "@/src/components/dashboard/dashboard-empty-state";
import { GoalsPreview } from "@/src/components/dashboard/goals-preview";
import { RecentEntries } from "@/src/components/dashboard/recent-entries";
import { SummaryCards } from "@/src/components/dashboard/summary-cards";
import { DashboardQuickActions } from "@/src/components/presets/dashboard-quick-actions";
import { StreakSummary } from "@/src/components/streaks/streak-summary";
import { PageHeader } from "@/src/components/layout/page-header";
import { PersonFilter } from "@/src/components/shared/person-filter";
import {
  ensureTodayHabitOccurrences,
  finalizeOldPendingOccurrences,
} from "@/src/actions/habits";
import { getGlobalStreak, getPersonStreak, getTodaySavingStatus } from "@/src/actions/streaks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSummary, getEntries } from "@/src/actions/entries";
import { getGoalsWithProgress } from "@/src/actions/goals";
import { getPresets } from "@/src/actions/presets";
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
  let presets: Awaited<ReturnType<typeof getPresets>> = [];
  let globalStreak: Awaited<ReturnType<typeof getGlobalStreak>> = {
    currentStreak: 0,
    bestStreak: 0,
    streakDates: [],
  };
  let marianStreak: Awaited<ReturnType<typeof getPersonStreak>> = {
    currentStreak: 0,
    bestStreak: 0,
    streakDates: [],
  };
  let martinaStreak: Awaited<ReturnType<typeof getPersonStreak>> = {
    currentStreak: 0,
    bestStreak: 0,
    streakDates: [],
  };
  let todaySavingStatus: Awaited<ReturnType<typeof getTodaySavingStatus>> = {
    hasSavedToday: false,
    totalSavedToday: 0,
  };

  try {
    const [
      loadedSummary,
      loadedEntries,
      loadedGoals,
      loadedPresets,
      loadedGlobalStreak,
      loadedMarianStreak,
      loadedMartinaStreak,
      loadedTodaySavingStatus,
    ] = await Promise.all([
      getDashboardSummary(person),
      getEntries(person),
      getGoalsWithProgress(),
      getPresets(),
      getGlobalStreak(),
      getPersonStreak("MARIAN"),
      getPersonStreak("MARTINA"),
      getTodaySavingStatus(),
    ]);
    summary = loadedSummary;
    recentEntries = loadedEntries.slice(0, 5);
    activeGoals = loadedGoals.filter((goal) => goal.isActive).slice(0, 3);
    presets = loadedPresets.slice(0, 4);
    globalStreak = loadedGlobalStreak;
    marianStreak = loadedMarianStreak;
    martinaStreak = loadedMartinaStreak;
    todaySavingStatus = loadedTodaySavingStatus;
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

      <DashboardQuickActions presets={presets} />

      <GoalsPreview goals={activeGoals} />

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-zinc-950">Serie</h2>
          <p className="text-sm text-zinc-500">
            La costanza batte la motivazione.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <StreakSummary
            title="Serie di risparmio"
            items={[
              {
                title: "Globale",
                currentStreak: globalStreak.currentStreak,
                bestStreak: globalStreak.bestStreak,
              },
              {
                title: "Marian",
                currentStreak: marianStreak.currentStreak,
                bestStreak: marianStreak.bestStreak,
                person: "MARIAN",
              },
              {
                title: "Martina",
                currentStreak: martinaStreak.currentStreak,
                bestStreak: martinaStreak.bestStreak,
                person: "MARTINA",
              },
            ]}
          />

          <Card className="overflow-hidden border-zinc-200/80 shadow-sm">
            <CardHeader className="space-y-1 p-5 pb-3">
              <CardTitle className="text-base">Oggi</CardTitle>
              <p className="text-sm text-zinc-500">
                {todaySavingStatus.hasSavedToday
                  ? "Hai già schivato qualcosa oggi."
                  : "Oggi ancora niente. C'è tempo."}
              </p>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0">
              <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                  Risparmiato oggi
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
                  {todaySavingStatus.totalSavedToday.toFixed(2)} €
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {recentEntries.length > 0 ? (
        <RecentEntries entries={recentEntries} />
      ) : (
        <DashboardEmptyState />
      )}
    </main>
  );
}
