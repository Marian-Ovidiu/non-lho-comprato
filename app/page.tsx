import Link from "next/link";
import { Compass, Flame, Target, TrendingUp } from "lucide-react";

import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { PublicAccessGate } from "@/src/components/public/public-access-gate";
import { DailyCheckinOverlay } from "@/src/components/dashboard/daily-checkin-overlay";
import { DashboardEmptyState } from "@/src/components/dashboard/dashboard-empty-state";
import { DashboardHabitsPreview } from "@/src/components/dashboard/dashboard-habits-preview";
import { DashboardHudCards } from "@/src/components/dashboard/dashboard-hud-cards";
import { GoalsPreview } from "@/src/components/dashboard/goals-preview";
import { MomentumCard } from "@/src/components/dashboard/momentum-card";
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
import { getCategoryEmoji } from "@/src/lib/visual-cues";

export const dynamic = "force-dynamic";

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

type MomentumView =
  | {
      label: string;
      title: string;
      detail: string;
      badge: string;
      tone: "goal";
      icon: typeof Target;
      progressPercent: number;
    }
  | {
      label: string;
      title: string;
      detail: string;
      badge: string;
      tone: "habit";
      icon: typeof Flame;
    }
  | {
      label: string;
      title: string;
      detail: string;
      badge: string;
      tone: "savings";
      icon: typeof TrendingUp;
    }
  | {
      label: string;
      title: string;
      detail: string;
      badge: string;
      tone: "fallback";
      icon: typeof Compass;
    };

function pickMomentumView({
  activeGoals,
  todayHabits,
  savedToday,
  currentStreak,
  monthSaved,
  pendingHabitsCount,
}: {
  activeGoals: Awaited<ReturnType<typeof getGoalsWithProgress>>;
  todayHabits: Awaited<ReturnType<typeof getTodayHabitOccurrences>>;
  savedToday: number;
  currentStreak: number;
  monthSaved: number;
  pendingHabitsCount: number;
}): MomentumView {
  const strongestGoal = activeGoals
    .filter((goal) => goal.progressAmount > 0)
    .sort(
      (a, b) =>
        b.progressPercent - a.progressPercent ||
        b.progressAmount - a.progressAmount,
    )[0];

  if (strongestGoal) {
    return {
      label: "Obiettivo attivo",
      title: `${strongestGoal.isCompleted ? "🎉" : "🎯"} ${Math.round(
        strongestGoal.progressPercent,
      )}% di ${strongestGoal.title}`,
      detail: strongestGoal.isCompleted
        ? `Hai già messo da parte ${formatEuro(strongestGoal.progressAmount)}.`
        : `Ti mancano ${formatEuro(strongestGoal.remainingAmount)} per arrivare a ${formatEuro(strongestGoal.targetAmount)}.`,
      badge: strongestGoal.isCompleted ? "Completato" : "Goal",
      tone: "goal",
      icon: Target,
      progressPercent: strongestGoal.progressPercent,
    };
  }

  const strongestAvoidedHabit = [...todayHabits]
    .filter((occurrence) => occurrence.status === "avoided")
    .sort((a, b) => Number(b.habit.amount) - Number(a.habit.amount))[0];

  if (strongestAvoidedHabit) {
    return {
      label: "Scelta di oggi",
      title: `${getCategoryEmoji(strongestAvoidedHabit.habit.category)} ${strongestAvoidedHabit.habit.name} evitata`,
      detail: `Hai tenuto ${formatEuro(Number(strongestAvoidedHabit.habit.amount))} nel portafoglio.`,
      badge: "Oggi",
      tone: "habit",
      icon: Flame,
    };
  }

  if (savedToday > 0) {
    return {
      label: "Trend positivo",
      title: `Hai tenuto ${formatEuro(savedToday)} oggi`,
      detail:
        currentStreak > 1
          ? `${currentStreak} giorni consecutivi di risparmio.`
          : "Hai già iniziato bene oggi.",
      badge: "Oggi",
      tone: "savings",
      icon: TrendingUp,
    };
  }

  if (currentStreak > 1) {
    return {
      label: "Momentum",
      title: `${currentStreak} giorni di risparmio consecutivi`,
      detail: `Hai già tenuto ${formatEuro(monthSaved)} questo mese.`,
      badge: "Stabile",
      tone: "savings",
      icon: TrendingUp,
    };
  }

  if (pendingHabitsCount > 0) {
    return {
      label: "Da chiudere",
      title: `${pendingHabitsCount} abitudini da controllare`,
      detail: "Chiuderle oggi mantiene il ritmo del portafoglio.",
      badge: "Oggi",
      tone: "fallback",
      icon: Compass,
    };
  }

  return {
    label: "Pronto",
    title: "Oggi puoi partire leggero",
    detail: "Aggiungi un movimento e il primo segnale apparirà qui.",
    badge: "Start",
    tone: "fallback",
    icon: Compass,
  };
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
  const momentumView = pickMomentumView({
    activeGoals,
    todayHabits,
    savedToday: todaySummary.totalSavedToday,
    currentStreak: currentStreak.currentStreak,
    monthSaved,
    pendingHabitsCount,
  });

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
            label: `💰 ${formatEuro(todaySummary.totalSavedToday)} oggi`,
            tone: "success",
          },
          {
            label: `⏳ ${pendingHabitsCount} in attesa`,
          },
          {
            label: `📈 ${formatEuro(monthSaved)} mese`,
            tone: "success",
          },
        ]}
      />

      <DashboardHudCards
        totalSavedToday={todaySummary.totalSavedToday}
        totalSavedMonth={monthSaved}
        entriesTodayCount={todaySummary.entriesTodayCount}
      />

      <MomentumCard
        label={momentumView.label}
        title={momentumView.title}
        detail={momentumView.detail}
        badge={momentumView.badge}
        tone={momentumView.tone}
        icon={momentumView.icon}
        progressPercent={
          momentumView.tone === "goal" ? momentumView.progressPercent : undefined
        }
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
