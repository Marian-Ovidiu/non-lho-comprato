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

function getDashboardContext({
  savedToday,
  entriesTodayCount,
  monthSaved,
  activeGoalsCount,
  todayHabitsCount,
}: {
  savedToday: number;
  entriesTodayCount: number;
  monthSaved: number;
  activeGoalsCount: number;
  todayHabitsCount: number;
}) {
  if (savedToday > 0) {
    return `Hai già tenuto ${formatEuro(savedToday)} oggi.`;
  }

  if (entriesTodayCount > 0) {
    return "Hai già registrato i movimenti di oggi.";
  }

  if (monthSaved > 0) {
    return `Oggi è leggero. Hai già protetto ${formatEuro(monthSaved)} questo mese.`;
  }

  if (todayHabitsCount > 0 || activeGoalsCount > 0) {
    return "La giornata è ancora aperta. I tuoi obiettivi restano pronti, senza pressione.";
  }

  return "La giornata è ancora tutta da impostare.";
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
  monthSaved,
  entriesTodayCount,
}: {
  activeGoals: Awaited<ReturnType<typeof getGoalsWithProgress>>;
  todayHabits: Awaited<ReturnType<typeof getTodayHabitOccurrences>>;
  savedToday: number;
  monthSaved: number;
  entriesTodayCount: number;
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
      label: "Oggi",
      title: strongestGoal.isCompleted
        ? `${strongestGoal.title} è già dentro il quadro di oggi`
        : `Stai avanzando verso ${strongestGoal.title}`,
      detail: strongestGoal.isCompleted
        ? `Hai già messo da parte ${formatEuro(strongestGoal.progressAmount)}.`
        : `Ti mancano ${formatEuro(strongestGoal.remainingAmount)} per arrivare a ${formatEuro(strongestGoal.targetAmount)}.`,
      badge: strongestGoal.isCompleted ? "Chiuso" : "In corso",
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
      label: "Oggi",
      title: `Hai già tenuto ${formatEuro(Number(strongestAvoidedHabit.habit.amount))} nel portafoglio`,
      detail: `${getCategoryEmoji(strongestAvoidedHabit.habit.category)} ${strongestAvoidedHabit.habit.name} è già stata evitata.`,
      badge: "Buona scelta",
      tone: "habit",
      icon: Flame,
    };
  }

  if (savedToday > 0) {
    return {
      label: "Oggi",
      title: `Hai già tenuto ${formatEuro(savedToday)} nel portafoglio`,
      detail:
        entriesTodayCount > 0
          ? "La giornata è in movimento e il quadro resta pulito."
          : "La giornata è in movimento, senza rumore inutile.",
      badge: "In corso",
      tone: "savings",
      icon: TrendingUp,
    };
  }

  if (entriesTodayCount > 0) {
    return {
      label: "Oggi",
      title: "Movimenti di oggi registrati",
      detail: "La giornata è ancora aperta, ma il quadro è già leggibile.",
      badge: "Leggero",
      tone: "fallback",
      icon: Compass,
    };
  }

  return {
    label: "Oggi",
    title:
      monthSaved > 0 ? "Oggi è ancora tutto aperto" : "Oggi è ancora aperto",
    detail:
      monthSaved > 0
        ? `Hai già protetto ${formatEuro(monthSaved)} questo mese. Il resto può aspettare.`
        : "Aggiungi il primo movimento e il quadro prende forma subito.",
    badge: monthSaved > 0 ? "Calmo" : "Nuovo",
    tone: "fallback",
    icon: Compass,
  };
}

function getDashboardEmptyStateCopy({
  monthSaved,
  activeGoalsCount,
  todayHabitsCount,
}: {
  monthSaved: number;
  activeGoalsCount: number;
  todayHabitsCount: number;
}) {
  if (monthSaved === 0 && activeGoalsCount === 0 && todayHabitsCount === 0) {
    return {
      title: "Ancora nessun movimento",
      description:
        "Aggiungi il primo movimento e il quadro di oggi prenderà forma subito.",
      note: "Bastano pochi secondi per partire.",
      actionLabel: "Aggiungi movimento",
    };
  }

  if (monthSaved > 0) {
    return {
      title: "Giornata ancora aperta",
      description: `Hai già protetto ${formatEuro(monthSaved)} questo mese. Oggi può restare leggero.`,
      note: "Il prossimo tap aggiornerà subito il quadro.",
      actionLabel: "Nuovo movimento",
    };
  }

  return {
    title: "Giornata leggera finora",
    description:
      "I tuoi obiettivi restano pronti, senza pressione. Se serve, un solo tap basta per aggiungere un nuovo segnale.",
    note: "Puoi rientrare e uscire in pochi secondi.",
    actionLabel: "Aggiungi movimento",
  };
}

export default async function Home() {
  const authenticatedUser = await getAuthenticatedUser();

  if (!authenticatedUser) {
    return <PublicAccessGate />;
  }

  await Promise.all([
    ensureTodayHabitOccurrences(),
    finalizeOldPendingOccurrences(),
  ]);

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
    monthSaved,
    entriesTodayCount: todaySummary.entriesTodayCount,
  });
  const dashboardEmptyState = getDashboardEmptyStateCopy({
    monthSaved,
    activeGoalsCount: activeGoals.length,
    todayHabitsCount: todayHabits.length,
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
        context={getDashboardContext({
          savedToday: todaySummary.totalSavedToday,
          entriesTodayCount: todaySummary.entriesTodayCount,
          monthSaved,
          activeGoalsCount: activeGoals.length,
          todayHabitsCount: todayHabits.length,
        })}
        action={
          <Button asChild className="h-10 rounded-2xl px-4">
            <Link href="/entries/new">Nuovo movimento</Link>
          </Button>
        }
        chips={[
          {
            label: `${formatEuro(todaySummary.totalSavedToday)} oggi`,
            tone: "success",
          },
          {
            label: `${todaySummary.entriesTodayCount} movimenti`,
          },
          {
            label: `${formatEuro(monthSaved)} mese`,
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
          <DashboardEmptyState {...dashboardEmptyState} />
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
