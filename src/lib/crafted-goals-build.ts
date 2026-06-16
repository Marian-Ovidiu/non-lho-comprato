import { getGoalCraftedIcon } from "@/src/lib/goal-crafted-icon";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import { getTranslations, languageToLocale } from "@/src/lib/i18n";

export type CraftedGoalSource = {
  id: string;
  title: string;
  targetAmount: number;
  progressAmount: number;
  progressPercent: number;
  remainingAmount: number;
  isActive: boolean;
  isCompleted: boolean;
  createdAt: string;
};

export type CraftedGoalRow = {
  id: string;
  title: string;
  progressAmount: number;
  targetAmount: number;
  progressPercent: number;
  remainingAmount: number;
  isActive: boolean;
  isCompleted: boolean;
  icon: ReturnType<typeof getGoalCraftedIcon>;
  note: string;
};

export type CraftedAchievedGoal = {
  id: string;
  title: string;
  amount: number;
};

export type CraftedGoalsProps = {
  featured: CraftedGoalRow | null;
  others: CraftedGoalRow[];
  paused: CraftedGoalRow[];
  achieved: CraftedAchievedGoal[];
  hasActiveGoals: boolean;
  trio: {
    towardGoals: number;
    completedCount: number;
    monthSaved: number;
  };
};

function getCreatedMonthLabel(createdAt: string, language: string) {
  const label = new Intl.DateTimeFormat(languageToLocale(language), {
    month: "long",
    timeZone: "Europe/Rome",
  }).format(new Date(createdAt));

  return label.toLowerCase();
}

export function buildFeaturedGoalNote(
  goal: CraftedGoalSource,
  currencySymbol = "€",
  language = "it",
) {
  const t = getTranslations(language);

  if (goal.isCompleted) {
    return t.goals.noteAchieved;
  }

  if (goal.remainingAmount <= 0) {
    return t.goals.noteFeedingProgress;
  }

  return t.goals.noteRemaining(formatCraftedCompact(goal.remainingAmount), currencySymbol);
}

export function buildSecondaryGoalNote(goal: CraftedGoalSource, language = "it") {
  const t = getTranslations(language);

  if (goal.isCompleted) {
    return t.goals.noteAchievedShort;
  }

  if (goal.progressPercent >= 50 || goal.remainingAmount <= 0) {
    return t.goals.noteMovingWithImpact;
  }

  return t.goals.noteStartedIn(getCreatedMonthLabel(goal.createdAt, language));
}

function mapGoal(
  goal: CraftedGoalSource,
  note: string,
): CraftedGoalRow {
  return {
    id: goal.id,
    title: goal.title,
    progressAmount: goal.progressAmount,
    targetAmount: goal.targetAmount,
    progressPercent: goal.progressPercent,
    remainingAmount: goal.remainingAmount,
    isActive: goal.isActive,
    isCompleted: goal.isCompleted,
    icon: getGoalCraftedIcon(goal.title),
    note,
  };
}

export function buildCraftedGoalsProps(
  goals: CraftedGoalSource[],
  monthSaved: number,
  currencySymbol = "€",
  language = "it",
): CraftedGoalsProps {
  const t = getTranslations(language);
  const activeGoals = goals
    .filter((goal) => goal.isActive && !goal.isCompleted)
    .sort(
      (left, right) =>
        right.progressPercent - left.progressPercent ||
        right.progressAmount - left.progressAmount,
    );
  const pausedGoals = goals.filter((goal) => !goal.isActive && !goal.isCompleted);
  const achievedGoals = goals.filter((goal) => goal.isCompleted);

  const featured = activeGoals[0]
    ? mapGoal(activeGoals[0], buildFeaturedGoalNote(activeGoals[0], currencySymbol, language))
    : null;

  return {
    featured,
    others: activeGoals.slice(1).map((goal) => mapGoal(goal, buildSecondaryGoalNote(goal, language))),
    paused: pausedGoals.map((goal) => mapGoal(goal, t.goals.notePaused)),
    achieved: achievedGoals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      amount: goal.progressAmount,
    })),
    hasActiveGoals: activeGoals.length > 0,
    trio: {
      towardGoals: activeGoals.reduce((sum, goal) => sum + goal.progressAmount, 0),
      completedCount: achievedGoals.length,
      monthSaved,
    },
  };
}
