import Link from "next/link";

import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { getPersonFilter } from "@/src/lib/person-filter";
import { PublicAccessGate } from "@/src/components/public/public-access-gate";
import { DailyCheckinOverlay } from "@/src/components/dashboard/daily-checkin-overlay";
import { DashboardEmptyState } from "@/src/components/dashboard/dashboard-empty-state";
import { DashboardHabitsPreview } from "@/src/components/dashboard/dashboard-habits-preview";
import { DashboardHudCards } from "@/src/components/dashboard/dashboard-hud-cards";
import { DashboardQuickActions } from "@/src/components/dashboard/dashboard-quick-actions";
import { GoalsPreview } from "@/src/components/dashboard/goals-preview";
import { MonthlyReportPreview } from "@/src/components/dashboard/monthly-report-preview";
import { RecentEntries } from "@/src/components/dashboard/recent-entries";
import { StreakHeroCard } from "@/src/components/dashboard/streak-hero-card";
import { PersonFilter } from "@/src/components/shared/person-filter";
import { PageHeader } from "@/src/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  ensureTodayHabitOccurrences,
  finalizeOldPendingOccurrences,
  getTodayHabitOccurrences,
} from "@/src/actions/habits";
import { getDashboardSummary, getEntries } from "@/src/actions/entries";
import { getGoalsWithProgress } from "@/src/actions/goals";
import { getMonthlyReport } from "@/src/actions/reports";
import { getGlobalStreak, getPersonStreak } from "@/src/actions/streaks";
import { getTodayDashboardSummary } from "@/src/actions/dashboard";

type HomeProps = {
  searchParams: Promise<{
    person?: string | string[];
  }>;
};

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("it-IT", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/Rome",
    }).format(new Date()),
  );

  if (hour < 12) {
    return "Buongiorno, Marian 👋";
  }

  if (hour < 18) {
    return "Buon pomeriggio, Marian 👋";
  }

  return "Buonasera, Marian 👋";
}

export default async function Home({ searchParams }: HomeProps) {
  const authenticatedUser = await getAuthenticatedUser();

  if (!authenticatedUser) {
    return <PublicAccessGate />;
  }

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
    recentEntries = loadedEntries.slice(0, 3);
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
    <main className="space-y-4 sm:space-y-5">
      <DailyCheckinOverlay
        savedToday={todaySummary.totalSavedToday}
        currentStreak={currentStreak.currentStreak}
        pendingHabitsCount={pendingHabitsCount}
      />

      <PageHeader
        eyebrow="Home"
        title={getGreeting()}
        context={`Hai tenuto ${formatEuro(todaySummary.totalSavedToday)} oggi`}
        action={
          <Button asChild className="h-10 rounded-2xl px-4">
            <Link href="/entries/new">Nuovo movimento</Link>
          </Button>
        }
        chips={[
          {
            label: `🔥 ${currentStreak.currentStreak} giorni`,
            tone: "premium",
          },
          {
            label: `☕ ${todaySummary.entriesTodayCount} movimenti`,
          },
          {
            label: `💰 ${formatEuro(monthSaved)} mese`,
            tone: "success",
          },
        ]}
      />

      <PersonFilter person={person} basePath="/" compact />

      <DashboardHudCards
        totalSavedToday={todaySummary.totalSavedToday}
        totalSavedMonth={monthSaved}
        currentStreak={currentStreak.currentStreak}
        entriesTodayCount={todaySummary.entriesTodayCount}
      />

      <StreakHeroCard currentStreak={currentStreak.currentStreak} />

      <DashboardQuickActions />

      <section className="grid gap-3 xl:grid-cols-2">
        <DashboardHabitsPreview occurrences={todayHabits} />
        <GoalsPreview goals={activeGoals} />
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
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
