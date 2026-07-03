import { getGoalCraftedIcon } from "@/src/lib/goal-crafted-icon";
import { getTranslations, languageToLocale } from "@/src/lib/i18n";
import type { GoalAllocationFeedItem } from "@/src/actions/goals";

export type GoalStatus = "in-corso" | "pausa" | "completato";

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
  monthlyPace?: number;
  contributors?: string[];
};

export type CraftedGoalRow = {
  id: string;
  title: string;
  note?: string;
  icon: ReturnType<typeof getGoalCraftedIcon>;
  target: number;
  saved: number;
  monthlyPace: number;
  status: GoalStatus;
  contributors: string[];
  featured: boolean;
  pct: number;
  remaining: number;
};

export type CraftedAllocationRow = {
  id: string;
  from: string;
  amount: number;
  goalId: string | null;
  goalName: string;
  goalIcon: ReturnType<typeof getGoalCraftedIcon>;
  date: string;
};

export type CraftedGoalsProps = {
  goals: CraftedGoalRow[];
  featured: CraftedGoalRow | null;
  allocations: CraftedAllocationRow[];
  hero: {
    totalSaved: number;
    totalTarget: number;
    totalPct: number;
    activePace: number;
    remaining: number;
    completedCount: number;
  };
  counts: Record<"tutti" | GoalStatus, number>;
};

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getStatus(goal: CraftedGoalSource): GoalStatus {
  if (goal.isCompleted) return "completato";
  if (!goal.isActive) return "pausa";
  return "in-corso";
}

function getGoalNote(goal: CraftedGoalRow, language: string) {
  const t = getTranslations(language);

  if (goal.status === "completato") return t.goals.noteAchieved;
  if (goal.status === "pausa") return t.goals.notePaused;
  return t.goals.noteMovingWithImpact;
}

export function buildFeaturedGoalNote(
  goal: CraftedGoalSource,
  language = "it",
) {
  const row = mapGoal(goal, false, language);
  return row.note ?? "";
}

export function buildSecondaryGoalNote(
  goal: CraftedGoalSource,
  language = "it",
) {
  const row = mapGoal(goal, false, language);
  return row.note ?? "";
}

function mapGoal(
  goal: CraftedGoalSource,
  featured: boolean,
  language: string,
): CraftedGoalRow {
  const status = getStatus(goal);
  const remaining = round2(Math.max(goal.targetAmount - goal.progressAmount, 0));
  const monthlyPace = round2(goal.monthlyPace ?? 0);
  const row: CraftedGoalRow = {
    id: goal.id,
    title: goal.title,
    icon: getGoalCraftedIcon(goal.title),
    target: round2(goal.targetAmount),
    saved: round2(goal.progressAmount),
    monthlyPace,
    status,
    contributors: goal.contributors ?? ["io"],
    featured,
    pct: round2(Math.min(goal.progressPercent, 100)),
    remaining,
  };

  return {
    ...row,
    note: getGoalNote(row, language),
  };
}

function mapAllocation(
  allocation: GoalAllocationFeedItem,
): CraftedAllocationRow {
  const goalName = allocation.goalTitle ?? "Obiettivi";

  return {
    id: allocation.id,
    from: allocation.from,
    amount: allocation.amount,
    goalId: allocation.goalId,
    goalName,
    goalIcon: getGoalCraftedIcon(allocation.goalIconTitle ?? goalName),
    date: allocation.date,
  };
}

export function shortGoalDate(iso: string, language = "it") {
  return new Intl.DateTimeFormat(languageToLocale(language), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${iso}T00:00:00.000Z`))
    .replace(".", "");
}

export function buildCraftedGoalsProps(
  goals: CraftedGoalSource[],
  allocations: GoalAllocationFeedItem[] = [],
  language = "it",
): CraftedGoalsProps {
  const sorted = [...goals].sort(
    (left, right) =>
      Number(right.isActive) - Number(left.isActive) ||
      Number(left.isCompleted) - Number(right.isCompleted) ||
      right.progressPercent - left.progressPercent ||
      right.progressAmount - left.progressAmount,
  );
  const featuredSource = sorted.find((goal) => goal.isActive && !goal.isCompleted) ?? null;
  const rows = sorted.map((goal) =>
    mapGoal(goal, goal.id === featuredSource?.id, language),
  );
  const totalSaved = round2(rows.reduce((sum, goal) => sum + goal.saved, 0));
  const totalTarget = round2(rows.reduce((sum, goal) => sum + goal.target, 0));
  const activeRows = rows.filter((goal) => goal.status === "in-corso");

  return {
    goals: rows,
    featured: rows.find((goal) => goal.featured) ?? null,
    allocations: allocations.map(mapAllocation),
    hero: {
      totalSaved,
      totalTarget,
      totalPct: totalTarget > 0 ? round2((totalSaved / totalTarget) * 100) : 0,
      activePace: round2(activeRows.reduce((sum, goal) => sum + goal.monthlyPace, 0)),
      remaining: round2(rows.reduce((sum, goal) => sum + goal.remaining, 0)),
      completedCount: rows.filter((goal) => goal.status === "completato").length,
    },
    counts: {
      tutti: rows.length,
      "in-corso": rows.filter((goal) => goal.status === "in-corso").length,
      pausa: rows.filter((goal) => goal.status === "pausa").length,
      completato: rows.filter((goal) => goal.status === "completato").length,
    },
  };
}
