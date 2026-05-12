import Link from "next/link";

import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { PublicAccessGate } from "@/src/components/public/public-access-gate";
import { DailyCheckinOverlay } from "@/src/components/dashboard/daily-checkin-overlay";
import { DashboardEmptyState } from "@/src/components/dashboard/dashboard-empty-state";
import { DashboardHabitsPreview } from "@/src/components/dashboard/dashboard-habits-preview";
import { DashboardHudCards } from "@/src/components/dashboard/dashboard-hud-cards";
import { GoalsPreview } from "@/src/components/dashboard/goals-preview";
import { RecentEntries } from "@/src/components/dashboard/recent-entries";
import { PageHeader } from "@/src/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  ensureTodayHabitOccurrences,
  finalizeOldPendingOccurrences,
  getTodayHabitOccurrences,
} from "@/src/actions/habits";
import { getDashboardSummary, getEntries } from "@/src/actions/entries";
import { getGoalsWithProgress } from "@/src/actions/goals";
import { getGlobalStreak } from "@/src/actions/streaks";
import { getTodayDashboardSummary } from "@/src/actions/dashboard";

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

export default async function Home() {
  const authenticatedUser = await getAuthenticatedUser();

  if (!authenticatedUser) {
    return <PublicAccessGate />;
  }

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
  let currentStreak: Awaited<ReturnType<typeof getGlobalStreak>> = {
    currentStreak: 0,
    bestStreak: 0,
    streakDates: [],
  };

  try {
    const streakPromise = getGlobalStreak();

    const [
      loadedSummary,
      loadedTodaySummary,
      loadedEntries,
      loadedGoals,
      loadedStreak,
      loadedTodayHabits,
    ] = await Promise.all([
      getDashboardSummary(),
      getTodayDashboardSummary(),
      getEntries(),
      getGoalsWithProgress(),
      streakPromise,
      getTodayHabitOccurrences(),
    ]);

    monthSaved = loadedSummary.totalSaved;
    todaySummary = loadedTodaySummary;
    recentEntries = loadedEntries.slice(0, 3);
    activeGoals = loadedGoals.filter((goal) => goal.isActive).slice(0, 3);
    currentStreak = loadedStreak;
    todayHabits = loadedTodayHabits;
    pendingHabitsCount = loadedTodayHabits.filter(
      (occurrence) => occurrence.status === "pending",
    ).length;
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
  }

  const hasUtilityPanels = todayHabits.length > 0 || activeGoals.length > 0;

  return (
    <main className="space-y-3 sm:space-y-4">
      <DailyCheckinOverlay
        savedToday={todaySummary.totalSavedToday}
        currentStreak={currentStreak.currentStreak}
        pendingHabitsCount={pendingHabitsCount}
      />

      <PageHeader
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
            label: `☕ ${pendingHabitsCount} in attesa`,
          },
          {
            label: `💰 ${formatEuro(monthSaved)} mese`,
            tone: "success",
          },
        ]}
      />

      <DashboardHudCards
        totalSavedToday={todaySummary.totalSavedToday}
        totalSavedMonth={monthSaved}
        currentStreak={currentStreak.currentStreak}
        entriesTodayCount={todaySummary.entriesTodayCount}
      />

      <section
        className={
          hasUtilityPanels
            ? "grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
            : "grid gap-3"
        }
      >
        {recentEntries.length > 0 ? (
          <RecentEntries entries={recentEntries} />
        ) : (
          <DashboardEmptyState />
        )}

        {hasUtilityPanels ? (
          <div className="grid gap-3">
            {todayHabits.length > 0 ? (
              <DashboardHabitsPreview occurrences={todayHabits} />
            ) : null}

            {activeGoals.length > 0 ? <GoalsPreview goals={activeGoals} /> : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
