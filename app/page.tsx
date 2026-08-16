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
import { PublicAccessGate } from "@/src/components/public/public-access-gate";
import { CraftedDashboard } from "@/src/components/dashboard/crafted-dashboard";
import { PostHogEventOnMount } from "@/src/components/analytics/posthog-event-on-mount";
import {
  ensureTodayHabitOccurrences,
  finalizeOldPendingOccurrences,
} from "@/src/actions/habits";
import {
  getDashboardEntrySnapshot,
  getFrequentEntryShortcuts,
  getMonthSpendBreakdown,
  type FrequentEntryShortcut,
  type MonthSpendBreakdown,
} from "@/src/actions/entries";
import { getHomeDashboardMetrics } from "@/src/actions/dashboard";
import { getWorkspaceBalances } from "@/src/actions/balances";
import { BalanceCard } from "@/src/components/balances/balance-card";
import {
  getCurrentUser,
  getCurrentWorkspaceMembers,
} from "@/src/lib/workspace-context";
import { getTodayDateKey } from "@/src/lib/workspace-dates";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { buildCraftedDashboardProps } from "@/src/lib/crafted-dashboard-build";
import { getTranslations } from "@/src/lib/i18n";
import type { BudgetDashboardSelection } from "@/src/lib/budget-summary";
import type { HomeReflectionNoteProps } from "@/src/lib/home-reflection";


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
  language,
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
  language: string;
}): HomeReflection {
  const t = getTranslations(language);

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
      label: t.home.reflectionLabel,
      text:
        repeatedCategory.count === 2
          ? t.home.reflectionCategoryTwice(repeatedCategory.name)
          : t.home.reflectionCategoryMost(repeatedCategory.name),
    };
  }

  if (weekEntries.length >= 3) {
    return {
      label: t.home.reflectionLabel,
      text: t.home.reflectionEntries(weekEntries.length),
    };
  }

  if (phase === "first-entry" && entries.length === 1) {
    return {
      label: t.home.reflectionLabel,
      text: t.home.reflectionFirstEntry,
    };
  }

  if (phase === "early-usage" || phase === "first-week") {
    return {
      label: t.home.reflectionLabel,
      text:
        monthRealSpent > 0
          ? t.home.reflectionEarlyWithSpend
          : t.home.reflectionEarlyNoSpend,
    };
  }

  return null;
}

/// Chiamata solo con `entryCount === 0`: restano i due soli casi possibili,
/// workspace senza nulla e workspace con ricorrenti attive ma nessun movimento.
function getDashboardEmptyStateCopy({
  arrivedFromOnboarding,
  todayHabitsCount,
  language,
}: {
  arrivedFromOnboarding: boolean;
  todayHabitsCount: number;
  language: string;
}) {
  const t = getTranslations(language);

  if (todayHabitsCount === 0) {
    return {
      title: arrivedFromOnboarding ? t.home.phaseEmptyOnboardingTitle : t.home.phaseEmptyTitle,
      description: arrivedFromOnboarding
        ? t.home.phaseEmptyOnboardingDesc
        : t.home.phaseEmptyDesc,
      actionLabel: t.dashboard.addEntry,
    };
  }

  return {
    title: t.home.phaseLightTitle,
    description: t.home.phaseLightDesc,
    actionLabel: t.dashboardQuickActions.registerExpense,
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

  let monthRealSpent = 0;
  let todaySummary: HomeDashboardMetrics["todaySummary"] = {
    totalSavedToday: 0,
    totalRealSpentToday: 0,
    entriesTodayCount: 0,
    avoidedAmountToday: 0,
    comparisonSavedToday: 0,
    netImpactToday: 0,
  };
  let entryCount = 0;
  let firstEntryDate: Date | null = null;
  let weekEntries: Array<{
    category: {
      id: string;
      name: string;
    };
    savedAmount: unknown;
    date: Date;
  }> = [];
  let todayHabits: HomeDashboardMetrics["todayHabits"] = [];
  let nextHabitPayment: HomeDashboardMetrics["nextHabitPayment"] = null;
  let dailyPaceComparison: HomeDashboardMetrics["dailyPaceComparison"] = {
    dayOfMonth: 0,
    todaySpent: 0,
    averageSameDay: null,
    averageSampleSize: 0,
    previousMonthSpent: null,
    previousMonthDateKey: null,
  };
  let currentStreak = 0;
  let monthlyStats: HomeDashboardMetrics["monthlyStats"] = [];
  let categoryStats: HomeDashboardMetrics["categoryStats"] = [];
  let budgetDashboardState: BudgetDashboardSelection = {
    mainBudget: null,
    categoryBudgets: [],
    hasAnyBudget: false,
  };
  let workspaceBalance: HomeDashboardMetrics["workspaceBalance"] = {
    supported: false,
    status: "unsupported",
    amount: 0,
    counterpartUserId: null,
    counterpartLabel: null,
  };
  let spendBreakdown: MonthSpendBreakdown = {
    realSpent: 0,
    fixedSpent: 0,
    currentSpent: 0,
    fixedItems: [],
    previousCurrentSpent: null,
  };
  const [
    [timeZone, currency, language, needsSetup],
    snapshotResult,
    metricsResult,
    shortcuts,
    breakdownResult,
  ] = await Promise.all([
    Promise.all([
      getCurrentWorkspaceTimezone(),
      getCurrentWorkspaceCurrency(),
      getCurrentWorkspaceLanguage(),
      isWorkspaceSetupNeeded(),
    ]),
    getDashboardEntrySnapshot()
      .then((snapshot) => ({ snapshot, error: null as string | null }))
      .catch((error) => {
        unstable_rethrow(error);
        console.error("Failed to load dashboard entry snapshot:", error);
        return { snapshot: null, error: formatEntryLoadError(error) };
      }),
    getHomeDashboardMetrics()
      .then((metrics) => ({ metrics, error: null as string | null }))
      .catch((error) => {
        unstable_rethrow(error);
        console.error("Failed to load dashboard summary:", error);
        return { metrics: null, error: formatEntryLoadError(error) };
      }),
    getFrequentEntryShortcuts().catch((error) => {
      unstable_rethrow(error);
      console.error("Failed to load entry shortcuts:", error);
      return [] as FrequentEntryShortcut[];
    }),
    getMonthSpendBreakdown().catch((error) => {
      unstable_rethrow(error);
      console.error("Failed to load month spend breakdown:", error);
      return null;
    }),
  ]);
  const { snapshot, error: entriesLoadError } = snapshotResult;
  const { metrics, error: dashboardLoadError } = metricsResult;

  if (breakdownResult) {
    spendBreakdown = breakdownResult;
  }

  if (snapshot) {
    entryCount = snapshot.entryCount;
    firstEntryDate = snapshot.firstEntryDate;
    weekEntries = snapshot.weekEntries;
  }

  if (metrics) {
    monthRealSpent = metrics.summary.realSpent;
    todaySummary = metrics.todaySummary;
    workspaceBalance = metrics.workspaceBalance;
    currentStreak = metrics.currentStreak;
    monthlyStats = metrics.monthlyStats;
    categoryStats = metrics.categoryStats;
    budgetDashboardState = metrics.budgetData.dashboardBudgetState;
    todayHabits = metrics.todayHabits;
    nextHabitPayment = metrics.nextHabitPayment;
    dailyPaceComparison = metrics.dailyPaceComparison;
  }

  const homePhase = getHomePhase({
    entryCount,
    firstEntryDate,
  });
  const homeReflection = getHomeReflection({
    entries: weekEntries,
    phase: homePhase,
    monthRealSpent,
    language,
  });

  const dashboardEmptyState =
    entryCount === 0
      ? getDashboardEmptyStateCopy({
          arrivedFromOnboarding,
          todayHabitsCount: todayHabits.length,
          language,
        })
      : null;

  /* Il saldo e' facoltativo: se il caricamento fallisce la dashboard resta
     quella di prima invece di andare in errore per una scheda in piu'. */
  const balances = await (async () => {
    try {
      const [state, members, currentUser] = await Promise.all([
        getWorkspaceBalances(),
        getCurrentWorkspaceMembers(),
        getCurrentUser(),
      ]);

      return {
        balances: state,
        members: members.map((member) => ({
          userId: member.userId,
          label: member.label,
        })),
        currentUserId: currentUser.id,
        todayDateKey: getTodayDateKey(timeZone),
      };
    } catch (error) {
      unstable_rethrow(error);
      console.error("Failed to load balances:", error);
      return null;
    }
  })();

  const craftedProps = buildCraftedDashboardProps({
    monthRealSpent,
    monthFixedSpent: spendBreakdown.fixedSpent,
    monthCurrentSpent: spendBreakdown.currentSpent,
    monthFixedItems: spendBreakdown.fixedItems,
    monthPreviousCurrentSpent: spendBreakdown.previousCurrentSpent,
    shortcuts,
    spentToday: todaySummary.totalRealSpentToday,
    entriesTodayCount: todaySummary.entriesTodayCount,
    monthlyStats,
    categoryStats,
    currentStreak,
    todayHabits,
    nextHabitPayment,
    dailyPaceComparison,
    reflection: homeReflection,
    emptyState: dashboardEmptyState,
    coupleBalance: {
      supported: workspaceBalance.supported,
      status: workspaceBalance.status,
      amount: workspaceBalance.amount,
      counterpartLabel: workspaceBalance.counterpartLabel,
    },
    budgetDashboardState,
    timeZone,
    currency,
    language,
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

      {entriesLoadError ? (
        <div className="px-5 pb-4">
          <DataLoadErrorBanner
            title={getTranslations(language).home.loadEntriesError}
            message={entriesLoadError}
          />
        </div>
      ) : null}

      {dashboardLoadError ? (
        <div className="px-5 pb-4">
          <DataLoadErrorBanner
            title={getTranslations(language).home.loadDashboardError}
            message={dashboardLoadError}
          />
        </div>
      ) : null}

      {/* La scheda non sta più sopra il foglio: entra nella griglia della
          dashboard, primo blocco, dove il vetro e la stanza sono già quelli
          giusti. Sopra l'hero era l'elemento più largo della pagina e l'unico
          opaco — la cosa meno importante che sembrava la più importante. */}
      <CraftedDashboard
        {...craftedProps}
        balanceSlot={
          balances ? (
            <BalanceCard
              personal={balances.balances.personal}
              joint={balances.balances.joint}
              isShared={balances.balances.isShared}
              members={balances.members}
              currentUserId={balances.currentUserId}
              todayDateKey={balances.todayDateKey}
            />
          ) : null
        }
      />
    </>
  );
}
