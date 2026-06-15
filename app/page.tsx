import { differenceInCalendarDays } from "date-fns";
import { unstable_rethrow } from "next/navigation";

import { getAuthenticatedUser } from "@/src/lib/auth/session";
import {
  getCurrentWorkspaceCurrency,
  getCurrentWorkspaceLanguage,
  getCurrentWorkspaceTimezone,
  isWorkspaceSetupNeeded,
} from "@/src/lib/workspace-context";
import { SetupWizard } from "@/src/components/onboarding/setup-wizard";
import { getCurrencySymbol } from "@/src/lib/workspace-currency";
import { PublicAccessGate } from "@/src/components/public/public-access-gate";
import { DailyCheckinOverlay } from "@/src/components/dashboard/daily-checkin-overlay";
import { CraftedDashboard } from "@/src/components/dashboard/crafted-dashboard";
import { PostHogEventOnMount } from "@/src/components/analytics/posthog-event-on-mount";
import {
  ensureTodayHabitOccurrences,
  finalizeOldPendingOccurrences,
} from "@/src/actions/habits";
import { getDashboardEntrySnapshot } from "@/src/actions/entries";
import { getHomeDashboardMetrics } from "@/src/actions/dashboard";
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

type HomeDashboardMetrics = Awaited<ReturnType<typeof getHomeDashboardMetrics>>;

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
  monthRealSpent,
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
  monthRealSpent: number;
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

  if (weekEntries.length >= 3) {
    return {
      label: "Riflessione",
      text:
        weekEntries.length === 3
          ? "Questa settimana hai già registrato 3 movimenti."
          : `Questa settimana hai già registrato ${weekEntries.length} movimenti.`,
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
        monthRealSpent > 0
          ? "Rispetto all'inizio, il quadro delle spese è già più chiaro."
          : "Il quadro si sta ancora formando, ma il ritmo comincia a vedersi.",
    };
  }

  return null;
}

function getDashboardEmptyStateCopy({
  phase,
  arrivedFromOnboarding,
  monthRealSpent,
  activeGoalsCount,
  todayHabitsCount,
}: {
  phase: HomePhase;
  arrivedFromOnboarding: boolean;
  monthRealSpent: number;
  activeGoalsCount: number;
  todayHabitsCount: number;
}) {
  if (phase === "empty" && monthRealSpent === 0 && activeGoalsCount === 0 && todayHabitsCount === 0) {
    return {
      title: arrivedFromOnboarding ? "Il quadro è pronto" : "Ancora nessun movimento",
      description: arrivedFromOnboarding
        ? "Hai finito l'onboarding. Da qui puoi iniziare a registrare spese e movimenti, uno alla volta."
        : "Aggiungi il primo movimento e la dashboard inizierà subito a leggere la spesa reale.",
      note: "Bastano pochi secondi per iniziare.",
      actionLabel: "Aggiungi movimento",
    };
  }

  if (phase === "first-entry") {
    return {
      title: "Il primo movimento è dentro",
      description:
        "Ora la dashboard può già leggere qualcosa. Il prossimo movimento renderà il quadro più chiaro.",
      note: "La continuità si costruisce da qui.",
      actionLabel: "Nuovo movimento",
    };
  }

  if (phase === "early-usage") {
    return {
      title: "Un ritmo sta emergendo",
      description:
        "I primi movimenti stanno iniziando a raccontare una direzione. Ogni visita aggiunge contesto.",
      note: "Il quadro diventa più utile con pochi, buoni ritorni.",
      actionLabel: "Nuovo movimento",
    };
  }

  if (phase === "first-week") {
    return {
      title: "Prima settimana in lettura",
      description:
        "Stai già vedendo un ritmo più riconoscibile. Il quadro della spesa comincia a restituire una forma chiara.",
      note: "Il valore cresce quando il contesto si fa continuo.",
      actionLabel: "Nuovo movimento",
    };
  }

  if (monthRealSpent > 0) {
    return {
      title: "Giornata ancora aperta",
      description: "Hai già registrato spese questo mese. Se serve, puoi aggiungere il prossimo movimento in pochi secondi.",
      note: "Il prossimo tap aggiornerà subito il quadro.",
      actionLabel: "Nuovo movimento",
    };
  }

  return {
    title: "Giornata leggera finora",
    description:
      "La dashboard è pronta. Se serve, un solo tap basta per registrare una spesa o un movimento evitato.",
    note: "Puoi rientrare e uscire in pochi secondi.",
    actionLabel: "Registra una spesa",
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
    unstable_rethrow(error);
    console.error("Failed to sync habit occurrences on home:", error);
  }

  let monthSaved = 0;
  let monthRealSpent = 0;
  let monthLargeComparisonImpact = 0;
  let entriesCountMonth = 0;
  let todaySummary = {
    totalSavedToday: 0,
    totalRealSpentToday: 0,
    entriesTodayCount: 0,
    avoidedAmountToday: 0,
    comparisonSavedToday: 0,
    netImpactToday: 0,
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
  let activeGoals: HomeDashboardMetrics["goals"] = [];
  let todayHabits: HomeDashboardMetrics["todayHabits"] = [];
  let pendingHabitsCount = 0;
  let currentStreak = 0;
  let streakDates: string[] = [];
  let monthlyStats: HomeDashboardMetrics["monthlyStats"] = [];
  let categoryStats: HomeDashboardMetrics["categoryStats"] = [];
  let workspaceBalance: HomeDashboardMetrics["workspaceBalance"] = {
    supported: false,
    status: "unsupported",
    amount: 0,
    counterpartUserId: null,
    counterpartLabel: null,
  };
  let entriesLoadError: string | null = null;
  let dashboardLoadError: string | null = null;
  const [
    [timeZone, currency, language, needsSetup],
    snapshot,
    metrics,
  ] = await Promise.all([
    Promise.all([
      getCurrentWorkspaceTimezone(),
      getCurrentWorkspaceCurrency(),
      getCurrentWorkspaceLanguage(),
      isWorkspaceSetupNeeded(),
    ]),
    getDashboardEntrySnapshot().catch((error) => {
      unstable_rethrow(error);
      entriesLoadError = formatEntryLoadError(error);
      console.error("Failed to load dashboard entry snapshot:", error);
      return null;
    }),
    getHomeDashboardMetrics().catch((error) => {
      unstable_rethrow(error);
      dashboardLoadError = formatEntryLoadError(error);
      console.error("Failed to load dashboard summary:", error);
      return null;
    }),
  ]);

  if (snapshot) {
    entryCount = snapshot.entryCount;
    firstEntryDate = snapshot.firstEntryDate;
    recentEntries = snapshot.recentEntries;
    weekEntries = snapshot.weekEntries;
  }

  if (metrics) {
    monthSaved = metrics.summary.totalSaved;
    monthRealSpent = metrics.summary.totalRealSpent;
    monthLargeComparisonImpact = metrics.summary.largeComparisonImpact;
    entriesCountMonth = metrics.summary.entriesCount;
    todaySummary = metrics.todaySummary;
    workspaceBalance = metrics.workspaceBalance;
    currentStreak = metrics.currentStreak;
    streakDates = metrics.streakDates;
    monthlyStats = metrics.monthlyStats;
    categoryStats = metrics.categoryStats;
    activeGoals = metrics.goals;
    todayHabits = metrics.todayHabits;
    pendingHabitsCount = metrics.pendingHabitsCount;
  }

  const homePhase = getHomePhase({
    entryCount,
    firstEntryDate,
  });
  const homeReflection = getHomeReflection({
    entries: weekEntries,
    phase: homePhase,
    monthRealSpent,
  });

  const dashboardEmptyState =
    recentEntries.length === 0
      ? getDashboardEmptyStateCopy({
          phase: homePhase,
          arrivedFromOnboarding,
          monthRealSpent,
          activeGoalsCount: activeGoals.length,
          todayHabitsCount: todayHabits.length,
        })
      : null;

  const craftedProps = buildCraftedDashboardProps({
    monthRealSpent,
    monthSaved,
    monthLargeComparisonImpact,
    spentToday: todaySummary.totalRealSpentToday,
    entriesCountMonth,
    entriesTodayCount: todaySummary.entriesTodayCount,
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
    timeZone,
    currency,
  });

  return (
    <>
      {needsSetup ? (
        <SetupWizard
          defaultTimezone={timeZone}
          defaultCurrency={currency}
          defaultLanguage={language}
        />
      ) : null}

      {arrivedFromOnboarding ? (
        <PostHogEventOnMount eventName="onboarding_completed" />
      ) : null}

      <DailyCheckinOverlay
        spentToday={todaySummary.totalRealSpentToday}
        savedToday={todaySummary.totalSavedToday}
        pendingHabitsCount={pendingHabitsCount}
        isVisible={
          todaySummary.totalRealSpentToday > 0 ||
          todaySummary.totalSavedToday > 0 ||
          pendingHabitsCount > 0
        }
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
