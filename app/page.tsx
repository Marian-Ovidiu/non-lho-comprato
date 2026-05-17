import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { Compass, Flame, Target, TrendingUp } from "lucide-react";

import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { PublicAccessGate } from "@/src/components/public/public-access-gate";
import { DailyCheckinOverlay } from "@/src/components/dashboard/daily-checkin-overlay";
import { DashboardEmptyState } from "@/src/components/dashboard/dashboard-empty-state";
import { DashboardHabitsPreview } from "@/src/components/dashboard/dashboard-habits-preview";
import { DashboardHudCards } from "@/src/components/dashboard/dashboard-hud-cards";
import { GoalsPreview } from "@/src/components/dashboard/goals-preview";
import {
  HomeReflectionNote,
  type HomeReflectionNoteProps,
} from "@/src/components/dashboard/home-reflection-note";
import { MomentumCard } from "@/src/components/dashboard/momentum-card";
import { RecentEntries } from "@/src/components/dashboard/recent-entries";
import { PageHeader } from "@/src/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PostHogEventOnMount } from "@/src/components/analytics/posthog-event-on-mount";
import {
  ensureTodayHabitOccurrences,
  finalizeOldPendingOccurrences,
  getTodayHabitOccurrences,
} from "@/src/actions/habits";
import { getDashboardSummary, getEntries } from "@/src/actions/entries";
import { getGoalsWithProgress } from "@/src/actions/goals";
import { getTodayDashboardSummary } from "@/src/actions/dashboard";
import { getCategoryEmoji } from "@/src/lib/visual-cues";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{
    welcome?: string | string[];
  }>;
};

type HomePhase = "empty" | "first-entry" | "early-usage" | "first-week" | "established";

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

type HomeReflection = HomeReflectionNoteProps | null;

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getFirstSearchParamValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
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
  entries: Awaited<ReturnType<typeof getEntries>>;
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
          ? `Questa settimana hai già dato forma a 2 scelte.`
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
          ? `Rispetto all'inizio, il quadro è già più chiaro.`
          : "Il quadro si sta ancora formando, ma il ritmo comincia a vedersi.",
    };
  }

  return null;
}

function getDashboardContext({
  phase,
  savedToday,
  entriesTodayCount,
  monthSaved,
  activeGoalsCount,
  todayHabitsCount,
  arrivedFromOnboarding,
}: {
  phase: HomePhase;
  savedToday: number;
  entriesTodayCount: number;
  monthSaved: number;
  activeGoalsCount: number;
  todayHabitsCount: number;
  arrivedFromOnboarding: boolean;
}) {
  if (phase === "empty") {
    return arrivedFromOnboarding
      ? "Il quadro continua da qui. Il primo segnale può arrivare quando vuoi."
      : "Aggiungi il primo segnale e il quadro di oggi prenderà forma subito.";
  }

  if (phase === "first-entry") {
    return "Hai lasciato il primo segnale. Da qui il quadro comincia a parlare.";
  }

  if (phase === "early-usage") {
    return "Stai costruendo un ritmo leggero. Ogni visita rende il quadro più leggibile.";
  }

  if (phase === "first-week") {
    return "Questa settimana il quadro inizia a diventare utile davvero.";
  }

  if (savedToday > 0) {
    return `Hai già tenuto ${formatEuro(savedToday)} oggi.`;
  }

  if (entriesTodayCount > 0) {
    return "Hai già registrato i segnali di oggi.";
  }

  if (monthSaved > 0) {
    return `Questo mese hai già protetto ${formatEuro(monthSaved)}.`;
  }

  if (todayHabitsCount > 0 || activeGoalsCount > 0) {
    return "La giornata è ancora aperta. Il quadro resta pronto, senza pressione.";
  }

  return "La giornata è ancora tutta da impostare.";
}

function pickMomentumView({
  activeGoals,
  todayHabits,
  savedToday,
  monthSaved,
  entriesTodayCount,
  phase,
}: {
  activeGoals: Awaited<ReturnType<typeof getGoalsWithProgress>>;
  todayHabits: Awaited<ReturnType<typeof getTodayHabitOccurrences>>;
  savedToday: number;
  monthSaved: number;
  entriesTodayCount: number;
  phase: HomePhase;
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

  if (phase === "first-entry") {
    return {
      label: "Primo segnale",
      title: "Il primo segnale è dentro il quadro",
      detail: "Da qui la lettura comincia a diventare personale e utile.",
      badge: "Appena iniziato",
      tone: "fallback",
      icon: Compass,
    };
  }

  if (phase === "early-usage") {
    return {
      label: "Ritmo",
      title: "Il ritmo sta prendendo forma",
      detail: "Ogni nuova visita rende più facile leggere ciò che conta.",
      badge: "In crescita",
      tone: "fallback",
      icon: Compass,
    };
  }

  if (phase === "first-week") {
    return {
      label: "Prima settimana",
      title: "Questa settimana ha già un profilo",
      detail: "Il quadro non è più solo un elenco. Inizia a mostrare una direzione.",
      badge: "Leggibile",
      tone: "fallback",
      icon: Compass,
    };
  }

  return {
    label: phase === "empty" ? "Primo passo" : "Oggi",
    title:
      phase === "empty"
        ? "Il quadro è pronto per il primo segnale"
        : monthSaved > 0
          ? "Oggi è ancora tutto aperto"
          : "Oggi è ancora aperto",
    detail:
      phase === "empty"
        ? "Quando aggiungi il primo movimento, la lettura prende forma senza rumore."
        : monthSaved > 0
          ? `Hai già protetto ${formatEuro(monthSaved)} questo mese. Il resto può aspettare.`
          : "Aggiungi il primo movimento e il quadro prende forma subito.",
    badge: phase === "empty" ? "Pronto" : monthSaved > 0 ? "Calmo" : "Nuovo",
    tone: "fallback",
    icon: Compass,
  };
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

export default async function Home({ searchParams }: HomePageProps) {
  const authenticatedUser = await getAuthenticatedUser();

  if (!authenticatedUser) {
    return <PublicAccessGate />;
  }

  const resolvedSearchParams = await searchParams;
  const arrivedFromOnboarding =
    getFirstSearchParamValue(resolvedSearchParams.welcome) === "1";

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
  let allEntries: Awaited<ReturnType<typeof getEntries>> = [];
  let recentEntries: Awaited<ReturnType<typeof getEntries>> = [];
  let activeGoals: Awaited<ReturnType<typeof getGoalsWithProgress>> = [];
  let todayHabits: Awaited<ReturnType<typeof getTodayHabitOccurrences>> = [];
  let pendingHabitsCount = 0;

  try {
    const [loadedSummary, loadedTodaySummary, loadedEntries, loadedGoals, loadedTodayHabits] =
      await Promise.all([
        getDashboardSummary(),
        getTodayDashboardSummary(),
        getEntries(),
        getGoalsWithProgress(),
        getTodayHabitOccurrences(),
      ]);

    monthSaved = loadedSummary.totalSaved;
    todaySummary = loadedTodaySummary;
    allEntries = loadedEntries;
    recentEntries = loadedEntries.slice(0, 3);
    activeGoals = loadedGoals.filter((goal) => goal.isActive).slice(0, 3);
    todayHabits = loadedTodayHabits;
    pendingHabitsCount = loadedTodayHabits.filter(
      (occurrence) => occurrence.status === "pending",
    ).length;
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
  }

  const oldestEntry = allEntries.at(-1);
  const firstEntryDate = oldestEntry ? new Date(oldestEntry.date) : null;
  const homePhase = getHomePhase({
    entryCount: allEntries.length,
    firstEntryDate,
  });
  const hasUtilityPanels = todayHabits.length > 0 || activeGoals.length > 0;
  const homeReflection = getHomeReflection({
    entries: allEntries,
    phase: homePhase,
    monthSaved,
  });

  const momentumView = pickMomentumView({
    activeGoals,
    todayHabits,
    savedToday: todaySummary.totalSavedToday,
    monthSaved,
    entriesTodayCount: todaySummary.entriesTodayCount,
    phase: homePhase,
  });

  const dashboardEmptyState = getDashboardEmptyStateCopy({
    phase: homePhase,
    arrivedFromOnboarding,
    monthSaved,
    activeGoalsCount: activeGoals.length,
    todayHabitsCount: todayHabits.length,
  });

  const headerContext = getDashboardContext({
    phase: homePhase,
    savedToday: todaySummary.totalSavedToday,
    entriesTodayCount: todaySummary.entriesTodayCount,
    monthSaved,
    activeGoalsCount: activeGoals.length,
    todayHabitsCount: todayHabits.length,
    arrivedFromOnboarding,
  });

  const recentEntriesDescription =
    homePhase === "empty"
      ? "Il quadro non ha ancora segnali recenti."
      : homePhase === "first-entry"
        ? "Il primo segnale è appena entrato nel quadro."
        : homePhase === "early-usage"
          ? "I movimenti iniziano a mostrare una direzione."
          : homePhase === "first-week"
            ? "Questa settimana sta già raccontando un ritmo."
            : "Gli ultimi 3 movimenti inseriti.";

  const habitsDescription =
    homePhase === "empty"
      ? "Le abitudini appariranno quando il quadro si arricchisce."
      : homePhase === "first-entry"
        ? "Le prime abitudini renderanno più chiaro il contesto."
        : homePhase === "early-usage"
          ? "Le abitudini stanno iniziando a mostrare un ritmo."
          : homePhase === "first-week"
            ? "Questa settimana le abitudini diventano più leggibili."
            : "Le abitudini ancora da controllare oggi.";

  const goalsDescription =
    homePhase === "empty"
      ? "Quando aggiungerai un obiettivo, qui vedrai la direzione."
      : homePhase === "first-entry"
        ? "Il primo obiettivo può già dare una direzione al quadro."
        : homePhase === "early-usage"
          ? "Gli obiettivi cominciano a dare una forma più chiara ai ritorni."
          : homePhase === "first-week"
            ? "Questa settimana gli obiettivi iniziano a pesare davvero nel quadro."
            : "Le mete che stanno ricevendo risparmio adesso.";

  return (
    <main className="space-y-3 sm:space-y-4">
      {arrivedFromOnboarding ? (
        <PostHogEventOnMount eventName="onboarding_completed" />
      ) : null}

      <DailyCheckinOverlay
        savedToday={todaySummary.totalSavedToday}
        pendingHabitsCount={pendingHabitsCount}
        isVisible={todaySummary.totalSavedToday > 0 || pendingHabitsCount > 0}
      />

      <PageHeader
        title={getGreeting()}
        context={headerContext}
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
            label: `${allEntries.length} segnali`,
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
        entriesCount={allEntries.length}
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

      {homeReflection ? (
        <HomeReflectionNote
          label={homeReflection.label}
          text={homeReflection.text}
        />
      ) : null}

      <section
        className={
          hasUtilityPanels
            ? "grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
            : "grid gap-3"
        }
      >
        {recentEntries.length > 0 ? (
          <RecentEntries
            entries={recentEntries}
            description={recentEntriesDescription}
          />
        ) : (
          <DashboardEmptyState {...dashboardEmptyState} />
        )}

        {hasUtilityPanels ? (
          <div className="grid gap-3">
            {todayHabits.length > 0 ? (
              <DashboardHabitsPreview
                occurrences={todayHabits}
                description={habitsDescription}
              />
            ) : null}

            {activeGoals.length > 0 ? (
              <GoalsPreview goals={activeGoals} description={goalsDescription} />
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
