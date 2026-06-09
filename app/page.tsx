import { differenceInCalendarDays } from "date-fns";

import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { PublicAccessGate } from "@/src/components/public/public-access-gate";
import { DailyCheckinOverlay } from "@/src/components/dashboard/daily-checkin-overlay";
import { CraftedDashboard } from "@/src/components/dashboard/crafted-dashboard";
import { PostHogEventOnMount } from "@/src/components/analytics/posthog-event-on-mount";
import {
  ensureTodayHabitOccurrences,
  finalizeOldPendingOccurrences,
  getTodayHabitOccurrences,
} from "@/src/actions/habits";
import {
  getDashboardEntrySnapshot,
  getDashboardSummary,
} from "@/src/actions/entries";
import { getGoalsWithProgress } from "@/src/actions/goals";
import {
  getTodayDashboardSummary,
  getWorkspaceBalance,
} from "@/src/actions/dashboard";
import { getGlobalStreak } from "@/src/actions/streaks";
import { getCategoryStats, getMonthlyStats } from "@/src/actions/stats";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { buildCraftedDashboardProps } from "@/src/lib/crafted-dashboard-build";
import type { HomeReflectionNoteProps } from "@/src/lib/home-reflection";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{
    welcome?: string | string[];
  }>;
};

type HomePhase = "empty" | "first-entry" | "early-usage" | "first-week" | "established";

type HomeReflection = HomeReflectionNoteProps | null;

function getFirstSearchParamValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getHomePhase({
  entryCount,
  firstEntryDate,
}: {
  entryCount: number;
  firstEntryDate: Date | null;
}): HomePhase {
  if (entryCount <= 0) {
    return "empty";
  }

  if (entryCount === 1) {
    return "first-entry";
  }

  if (entryCount <= 3) {
    return "early-usage";
  }

  if (firstEntryDate) {
    const daysSinceFirstEntry = differenceInCalendarDays(
      new Date(),
      firstEntryDate,
    );

    if (daysSinceFirstEntry < 7) {
      return "first-week";
    }
  }

  return "established";
}

function getHomeReflection({
  entries,
  phase,
  monthSaved,
}: {
  entries: Array<{
    category: {
      id: string;
      name: string;
    };
    savedAmount: unknown;
    date: string | Date;
  }>;
  phase: HomePhase;
  monthSaved: number;
}): HomeReflection {
  if (entries.length === 0) {
    return null;
  }

  const now = new Date();
  const weekEntries = entries.filter(
    (entry) => differenceInCalendarDays(now, new Date(entry.date)) < 7,
  );

  const categoryCounts = new Map<
    string,
    { name: string; count: number; savedAmount: number }
  >();

  for (const entry of weekEntries) {
    const key = entry.category.id;
    const current = categoryCounts.get(key) ?? {
      name: entry.category.name,
      count: 0,
      savedAmount: 0,
    };

    current.count += 1;
    current.savedAmount += Number(entry.savedAmount) || 0;
    categoryCounts.set(key, current);
  }

  const repeatedCategory = [...categoryCounts.values()]
    .filter((item) => item.count >= 2)
    .sort((left, right) => right.count - left.count || right.savedAmount - left.savedAmount)[0];

  if (repeatedCategory) {
    return {
      label: "Riflessione",
      text:
        repeatedCategory.count === 2
          ? `${repeatedCategory.name} è comparsa due volte questa settimana.`
          : `${repeatedCategory.name} è la categoria che torna più spesso questa settimana.`,
    };
  }

  const savedThisWeek = weekEntries.reduce(
    (sum, entry) => sum + (Number(entry.savedAmount) || 0),
    0,
  );

  if (savedThisWeek > 0 && weekEntries.length >= 2) {
    return {
      label: "Riflessione",
      text:
        weekEntries.length === 2
          ? "Questa settimana hai già dato forma a 2 scelte."
          : `Questa settimana hai già dato forma a ${weekEntries.length} scelte.`,
    };
  }

  if (phase === "first-entry" && entries.length === 1) {
    return {
      label: "Riflessione",
      text: "Il primo segnale è dentro. Ora il quadro può cominciare a farsi più chiaro.",
    };
  }

  if (phase === "early-usage" || phase === "first-week") {
    return {
      label: "Riflessione",
      text:
        monthSaved > 0
          ? "Rispetto all'inizio, il quadro è già più chiaro."
          : "Il quadro si sta ancora formando, ma il ritmo comincia a vedersi.",
    };
  }

  return null;
}

function getDashboardEmptyStateCopy({
  phase,
  arrivedFromOnboarding,
  monthSaved,
  activeGoalsCount,
  todayHabitsCount,
}: {
  phase: HomePhase;
  arrivedFromOnboarding: boolean;
  monthSaved: number;
  activeGoalsCount: number;
  todayHabitsCount: number;
}) {
  if (phase === "empty" && monthSaved === 0 && activeGoalsCount === 0 && todayHabitsCount === 0) {
    return {
      title: arrivedFromOnboarding ? "Il quadro è pronto" : "Ancora nessun segnale",
      description: arrivedFromOnboarding
        ? "Hai finito l'onboarding. Da qui il quadro continua con calma, un segnale alla volta."
        : "Aggiungi il primo movimento e il quadro di oggi prenderà forma subito.",
      note: "Bastano pochi secondi per iniziare.",
      actionLabel: "Aggiungi movimento",
    };
  }

  if (phase === "first-entry") {
    return {
      title: "Il primo segnale è dentro",
      description:
        "Ora il quadro può già leggere qualcosa. Il prossimo segnale renderà la lettura più chiara.",
      note: "La continuità si costruisce da qui.",
      actionLabel: "Nuovo movimento",
    };
  }

  if (phase === "early-usage") {
    return {
      title: "Un ritmo sta emergendo",
      description:
        "I primi segnali stanno iniziando a raccontare una direzione. Ogni visita aggiunge contesto.",
      note: "Il quadro diventa più utile con pochi, buoni ritorni.",
      actionLabel: "Nuovo movimento",
    };
  }

  if (phase === "first-week") {
    return {
      title: "Prima settimana in lettura",
      description:
        "Stai già vedendo un ritmo più riconoscibile. Il quadro comincia a restituire una forma chiara.",
      note: "Il valore cresce quando il contesto si fa continuo.",
      actionLabel: "Nuovo movimento",
    };
  }

  if (monthSaved > 0) {
    return {
      title: "Giornata ancora aperta",
      description: `Hai già protetto qualcosa questo mese. Oggi può restare leggero.`,
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

export default async function Home({ searchParams }: HomePageProps) {
  const authenticatedUser = await getAuthenticatedUser();

  if (!authenticatedUser) {
    return <PublicAccessGate />;
  }

  const resolvedSearchParams = await searchParams;
  const arrivedFromOnboarding =
    getFirstSearchParamValue(resolvedSearchParams.welcome) === "1";

  try {
    await Promise.all([
      ensureTodayHabitOccurrences(),
      finalizeOldPendingOccurrences(),
    ]);
  } catch (error) {
    console.error("Failed to sync habit occurrences on home:", error);
  }

  let monthSaved = 0;
  let entriesCountMonth = 0;
  let todaySummary = {
    totalSavedToday: 0,
    totalRealSpentToday: 0,
    entriesTodayCount: 0,
  };
  let entryCount = 0;
  let firstEntryDate: Date | null = null;
  let recentEntries: Array<{
    id: string;
    title: string;
    category: {
      name: string;
      slug: string | null;
    };
    date: Date;
    realCost: unknown;
    savedAmount: unknown;
    alternativeCost: unknown;
    note: string | null;
  }> = [];
  let weekEntries: Array<{
    category: {
      id: string;
      name: string;
    };
    savedAmount: unknown;
    date: Date;
  }> = [];
  let activeGoals: Awaited<ReturnType<typeof getGoalsWithProgress>> = [];
  let todayHabits: Awaited<ReturnType<typeof getTodayHabitOccurrences>> = [];
  let pendingHabitsCount = 0;
  let currentStreak = 0;
  let streakDates: string[] = [];
  let monthlyStats: Awaited<ReturnType<typeof getMonthlyStats>> = [];
  let categoryStats: Awaited<ReturnType<typeof getCategoryStats>> = [];
  let workspaceBalance: Awaited<ReturnType<typeof getWorkspaceBalance>> = {
    supported: false,
    status: "unsupported",
    amount: 0,
    counterpartUserId: null,
    counterpartLabel: null,
  };
  let entriesLoadError: string | null = null;
  let dashboardLoadError: string | null = null;

  try {
    const snapshot = await getDashboardEntrySnapshot();
    entryCount = snapshot.entryCount;
    firstEntryDate = snapshot.firstEntryDate;
    recentEntries = snapshot.recentEntries;
    weekEntries = snapshot.weekEntries;
  } catch (error) {
    entriesLoadError = formatEntryLoadError(error);
    console.error("Failed to load dashboard entry snapshot:", error);
  }

  try {
    const [
      loadedSummary,
      loadedTodaySummary,
      loadedWorkspaceBalance,
      loadedGoals,
      loadedTodayHabits,
      globalStreak,
      loadedMonthlyStats,
      loadedCategoryStats,
    ] = await Promise.all([
      getDashboardSummary(),
      getTodayDashboardSummary(),
      getWorkspaceBalance(),
      getGoalsWithProgress(),
      getTodayHabitOccurrences(),
      getGlobalStreak(),
      getMonthlyStats(),
      getCategoryStats(),
    ]);

    monthSaved = loadedSummary.totalSaved;
    entriesCountMonth = loadedSummary.entriesCount;
    todaySummary = loadedTodaySummary;
    workspaceBalance = loadedWorkspaceBalance;
    currentStreak = globalStreak.currentStreak;
    streakDates = globalStreak.streakDates;
    monthlyStats = loadedMonthlyStats;
    categoryStats = loadedCategoryStats;
    activeGoals = loadedGoals.filter((goal) => goal.isActive);
    todayHabits = loadedTodayHabits;
    pendingHabitsCount = loadedTodayHabits.filter(
      (occurrence) => occurrence.status === "pending",
    ).length;
  } catch (error) {
    dashboardLoadError = formatEntryLoadError(error);
    console.error("Failed to load dashboard summary:", error);
  }

  const homePhase = getHomePhase({
    entryCount,
    firstEntryDate,
  });
  const homeReflection = getHomeReflection({
    entries: weekEntries,
    phase: homePhase,
    monthSaved,
  });

  const dashboardEmptyState =
    recentEntries.length === 0
      ? getDashboardEmptyStateCopy({
          phase: homePhase,
          arrivedFromOnboarding,
          monthSaved,
          activeGoalsCount: activeGoals.length,
          todayHabitsCount: todayHabits.length,
        })
      : null;

  const craftedProps = buildCraftedDashboardProps({
    monthSaved,
    entriesCountMonth,
    savedToday: todaySummary.totalSavedToday,
    weekEntries,
    monthlyStats,
    categoryStats,
    currentStreak,
    streakDates,
    todayHabits,
    goals: activeGoals,
    recentEntries,
    reflection: homeReflection,
    emptyState: dashboardEmptyState,
    coupleBalance: {
      supported: workspaceBalance.supported,
      amount: workspaceBalance.amount,
      counterpartLabel: workspaceBalance.counterpartLabel,
    },
  });

  return (
    <>
      {arrivedFromOnboarding ? (
        <PostHogEventOnMount eventName="onboarding_completed" />
      ) : null}

      <DailyCheckinOverlay
        savedToday={todaySummary.totalSavedToday}
        pendingHabitsCount={pendingHabitsCount}
        isVisible={todaySummary.totalSavedToday > 0 || pendingHabitsCount > 0}
      />

      {entriesLoadError ? (
        <div className="px-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile caricare i movimenti recenti"
            message={entriesLoadError}
          />
        </div>
      ) : null}

      {dashboardLoadError ? (
        <div className="px-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile caricare il riepilogo della dashboard"
            message={dashboardLoadError}
          />
        </div>
      ) : null}

      <CraftedDashboard {...craftedProps} />
    </>
  );
}
