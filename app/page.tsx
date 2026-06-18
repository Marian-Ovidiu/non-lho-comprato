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
import { getTranslations } from "@/src/lib/i18n";
import type { BudgetDashboardSelection } from "@/src/lib/budget-summary";
import type { BudgetAlertSelection } from "@/src/lib/budget-alerts";
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

function getDashboardEmptyStateCopy({
  phase,
  arrivedFromOnboarding,
  monthRealSpent,
  activeGoalsCount,
  todayHabitsCount,
  language,
}: {
  phase: HomePhase;
  arrivedFromOnboarding: boolean;
  monthRealSpent: number;
  activeGoalsCount: number;
  todayHabitsCount: number;
  language: string;
}) {
  const t = getTranslations(language);

  if (phase === "empty" && monthRealSpent === 0 && activeGoalsCount === 0 && todayHabitsCount === 0) {
    return {
      title: arrivedFromOnboarding ? t.home.phaseEmptyOnboardingTitle : t.home.phaseEmptyTitle,
      description: arrivedFromOnboarding
        ? t.home.phaseEmptyOnboardingDesc
        : t.home.phaseEmptyDesc,
      note: t.home.phaseEmptyNote,
      actionLabel: t.dashboard.addEntry,
    };
  }

  if (phase === "first-entry") {
    return {
      title: t.home.phaseFirstEntryTitle,
      description: t.home.phaseFirstEntryDesc,
      note: t.home.phaseFirstEntryNote,
      actionLabel: t.entryForm.newTitle,
    };
  }

  if (phase === "early-usage") {
    return {
      title: t.home.phaseEarlyTitle,
      description: t.home.phaseEarlyDesc,
      note: t.home.phaseEarlyNote,
      actionLabel: t.entryForm.newTitle,
    };
  }

  if (phase === "first-week") {
    return {
      title: t.home.phaseFirstWeekTitle,
      description: t.home.phaseFirstWeekDesc,
      note: t.home.phaseFirstWeekNote,
      actionLabel: t.entryForm.newTitle,
    };
  }

  if (monthRealSpent > 0) {
    return {
      title: t.home.phaseTodayTitle,
      description: t.home.phaseTodayDesc,
      note: t.home.phaseTodayNote,
      actionLabel: t.entryForm.newTitle,
    };
  }

  return {
    title: t.home.phaseLightTitle,
    description: t.home.phaseLightDesc,
    note: t.home.phaseLightNote,
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
  let budgetDashboardState: BudgetDashboardSelection = {
    mainBudget: null,
    categoryBudgets: [],
    hasAnyBudget: false,
  };
  let budgetAlertSelection: BudgetAlertSelection = {
    primaryAlerts: [],
    pageAlerts: [],
    hasAlerts: false,
  };
  let workspaceBalance: HomeDashboardMetrics["workspaceBalance"] = {
    supported: false,
    status: "unsupported",
    amount: 0,
    counterpartUserId: null,
    counterpartLabel: null,
  };
  const [
    [timeZone, currency, language, needsSetup],
    snapshotResult,
    metricsResult,
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
  ]);
  const { snapshot, error: entriesLoadError } = snapshotResult;
  const { metrics, error: dashboardLoadError } = metricsResult;

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
    budgetDashboardState = metrics.budgetData.dashboardBudgetState;
    budgetAlertSelection = metrics.budgetAlertSelection;
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
    language,
  });

  const dashboardEmptyState =
    recentEntries.length === 0
      ? getDashboardEmptyStateCopy({
          phase: homePhase,
          arrivedFromOnboarding,
          monthRealSpent,
          activeGoalsCount: activeGoals.length,
          todayHabitsCount: todayHabits.length,
          language,
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
    budgetDashboardState,
    budgetAlertSelection,
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

      <CraftedDashboard {...craftedProps} />
    </>
  );
}
