import Link from "next/link";
import { formatMoney } from "@/src/lib/formatters";

import { ensureTodayHabitOccurrences, finalizeOldPendingOccurrences, getTodayHabitOccurrences } from "@/src/actions/habits";
import { getDashboardSummary, getEntries } from "@/src/actions/entries";
import { getGoalsWithProgress } from "@/src/actions/goals";
import { getMonthlyReport } from "@/src/actions/reports";
import { getGlobalStreak, getPersonStreak } from "@/src/actions/streaks";
import { getTodayDashboardSummary } from "@/src/actions/dashboard";
import { DashboardActions } from "@/src/components/dashboard/dashboard-actions";
import { DailyCheckinOverlay } from "@/src/components/dashboard/daily-checkin-overlay";
import { DashboardHabitsPreview } from "@/src/components/dashboard/dashboard-habits-preview";
import { DashboardHudCards } from "@/src/components/dashboard/dashboard-hud-cards";
import { GoalsPreview } from "@/src/components/dashboard/goals-preview";
import { MonthlyReportPreview } from "@/src/components/dashboard/monthly-report-preview";
import { RecentEntries } from "@/src/components/dashboard/recent-entries";
import { DashboardEmptyState } from "@/src/components/dashboard/dashboard-empty-state";
import { PersonFilter } from "@/src/components/shared/person-filter";
import { Button } from "@/components/ui/button";
import { getPersonFilter } from "@/src/lib/person-filter";

type HomeProps = {
  searchParams: Promise<{
    person?: string | string[];
  }>;
};

function getFilterLabel(person?: ReturnType<typeof getPersonFilter>) {
  if (person === "MARIAN") {
    return "Marian";
  }

  if (person === "MARTINA") {
    return "Martina";
  }

  if (person === "TUTTI") {
    return "Condivise";
  }

  return "Tutti i movimenti";
}

export default async function Home({ searchParams }: HomeProps) {
  const person = getPersonFilter((await searchParams).person);

  await ensureTodayHabitOccurrences();
  await finalizeOldPendingOccurrences();

  let monthSaved = 0;
  let todaySummary = {
    totalSavedToday: 0,
    totalRealSpentToday: 0,
    entriesTodayCount: 0,
  };
  let recentEntries: Awaited<ReturnType<typeof getEntries>> = [];
  let activeGoals: Awaited<ReturnType<typeof getGoalsWithProgress>> = [];
  let todayHabits: Awaited<ReturnType<typeof getTodayHabitOccurrences>> = [];
  let pendingHabitsCount = 0;
  let monthlyReport: Awaited<ReturnType<typeof getMonthlyReport>>["report"] | null =
    null;
  let currentStreak: Awaited<ReturnType<typeof getGlobalStreak>> = {
    currentStreak: 0,
    bestStreak: 0,
    streakDates: [],
  };

  try {
    const streakPromise = person ? getPersonStreak(person) : getGlobalStreak();

    const [
      loadedSummary,
      loadedTodaySummary,
      loadedEntries,
      loadedGoals,
      loadedStreak,
      loadedTodayHabits,
      loadedMonthlyReport,
    ] = await Promise.all([
      getDashboardSummary(person),
      getTodayDashboardSummary(person),
      getEntries(person),
      getGoalsWithProgress(),
      streakPromise,
      getTodayHabitOccurrences(),
      getMonthlyReport(),
    ]);

    monthSaved = loadedSummary.totalSaved;
    todaySummary = loadedTodaySummary;
    recentEntries = loadedEntries.slice(0, 5);
    activeGoals = loadedGoals.filter((goal) => goal.isActive).slice(0, 3);
    currentStreak = loadedStreak;
    todayHabits = loadedTodayHabits;
    monthlyReport = loadedMonthlyReport.report;
    pendingHabitsCount = loadedTodayHabits.filter(
      (occurrence) => occurrence.status === "pending",
    ).length;
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
  }

  const headline = todaySummary.totalSavedToday > 0
    ? `Oggi avete già schivato ${formatMoney(todaySummary.totalSavedToday)}.`
    : "Oggi ancora niente. C'è tempo per salvare il portafoglio.";

  return (
    <main className="space-y-6 sm:space-y-8">
      <DailyCheckinOverlay
        savedToday={todaySummary.totalSavedToday}
        currentStreak={currentStreak.currentStreak}
        pendingHabitsCount={pendingHabitsCount}
      />

      <section className="space-y-4 rounded-3xl border border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/80 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              Home
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
              Ciao, portafoglio salvo?
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
              {headline}
            </p>
          </div>

          <Button asChild className="w-full sm:w-auto">
            <Link href="/entries/new">Aggiungi movimento</Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              Vista
            </p>
            <p className="text-sm font-medium text-zinc-950">
              {getFilterLabel(person)}
            </p>
          </div>
          <p className="text-xs leading-5 text-zinc-500">
            I dati principali si adattano al filtro selezionato.
          </p>
        </div>
      </section>

      <DashboardActions />

      <PersonFilter person={person} basePath="/" />

      <DashboardHudCards
        totalSavedToday={todaySummary.totalSavedToday}
        totalSavedMonth={monthSaved}
        currentStreak={currentStreak.currentStreak}
        bestStreak={currentStreak.bestStreak}
        entriesTodayCount={todaySummary.entriesTodayCount}
      />

      <DashboardHabitsPreview occurrences={todayHabits} />

      <MonthlyReportPreview report={monthlyReport} />

      <GoalsPreview goals={activeGoals} />

      {recentEntries.length > 0 ? (
        <RecentEntries entries={recentEntries} />
      ) : (
        <DashboardEmptyState />
      )}
    </main>
  );
}
