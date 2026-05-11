import { DailyCheckinOverlay } from "@/src/components/dashboard/daily-checkin-overlay";
import { DashboardActions } from "@/src/components/dashboard/dashboard-actions";
import { DashboardEmptyState } from "@/src/components/dashboard/dashboard-empty-state";
import { DashboardHabitsPreview } from "@/src/components/dashboard/dashboard-habits-preview";
import { DashboardHudCards } from "@/src/components/dashboard/dashboard-hud-cards";
import { GoalsPreview } from "@/src/components/dashboard/goals-preview";
import { MonthlyReportPreview } from "@/src/components/dashboard/monthly-report-preview";
import { RecentEntries } from "@/src/components/dashboard/recent-entries";
import { PersonFilter } from "@/src/components/shared/person-filter";
import { PageHeader } from "@/src/components/layout/page-header";
import { ensureTodayHabitOccurrences, finalizeOldPendingOccurrences, getTodayHabitOccurrences } from "@/src/actions/habits";
import { getDashboardSummary, getEntries } from "@/src/actions/entries";
import { getGoalsWithProgress } from "@/src/actions/goals";
import { getMonthlyReport } from "@/src/actions/reports";
import { getGlobalStreak, getPersonStreak } from "@/src/actions/streaks";
import { getTodayDashboardSummary } from "@/src/actions/dashboard";
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

  return (
    <main className="space-y-6 sm:space-y-7">
      <DailyCheckinOverlay
        savedToday={todaySummary.totalSavedToday}
        currentStreak={currentStreak.currentStreak}
        pendingHabitsCount={pendingHabitsCount}
      />

      <PageHeader
        eyebrow="Home"
        title="Portafoglio"
        description="Qui trovi subito lo stato del giorno, le azioni rapide e ciò che richiede attenzione."
      />

      <PersonFilter person={person} basePath="/" compact />

      <DashboardHudCards
        totalSavedToday={todaySummary.totalSavedToday}
        totalSavedMonth={monthSaved}
        currentStreak={currentStreak.currentStreak}
        bestStreak={currentStreak.bestStreak}
        entriesTodayCount={todaySummary.entriesTodayCount}
      />

      <DashboardActions />

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardHabitsPreview occurrences={todayHabits} />
        <GoalsPreview goals={activeGoals} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <MonthlyReportPreview report={monthlyReport} />
        {recentEntries.length > 0 ? (
          <RecentEntries entries={recentEntries} />
        ) : (
          <DashboardEmptyState />
        )}
      </section>
    </main>
  );
}
