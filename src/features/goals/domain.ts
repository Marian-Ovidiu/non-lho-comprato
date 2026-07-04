import {
  normalizeMoneyInputString,
  round2,
  toMoneyNumber,
} from "@/src/lib/money-number";
import { countCalendarMonthsInclusive } from "@/src/lib/workspace-dates";

export type GoalWithProgress = {
  id: string;
  title: string;
  targetAmount: number;
  emoji: string | null;
  targetUserId: string | null;
  isActive: boolean;
  createdAt: string;
  progressAmount: number;
  progressPercent: number;
  remainingAmount: number;
  isCompleted: boolean;
  monthlyPace: number;
  contributors: string[];
};

export type GoalsWithProgress = {
  goals: GoalWithProgress[];
  /// Pool "evitato" del workspace: ogni goal senza targetUserId misura questo
  /// stesso totale, quindi i riepiloghi devono contarlo una sola volta da qui.
  savedPool: number;
  monthlyPace: number;
};

export type GoalFormValidation = {
  errors: Record<string, string>;
  title: string;
  emoji: string;
  targetAmount: number;
};

export function validateGoalForm(input: {
  title: string;
  emoji: string;
  targetAmountRaw: string;
}): GoalFormValidation {
  const errors: Record<string, string> = {};
  const title = input.title;
  const emoji = input.emoji;

  if (!title) {
    errors.title = "Il titolo è obbligatorio";
  } else if (title.length < 2) {
    errors.title = "Il titolo deve avere almeno 2 caratteri";
  }

  let targetAmount = Number.NaN;

  if (!input.targetAmountRaw) {
    errors.targetAmount = "Questo campo è obbligatorio";
  } else {
    const normalized = normalizeMoneyInputString(input.targetAmountRaw);
    targetAmount = normalized === null ? Number.NaN : Number(normalized);

    if (!Number.isFinite(targetAmount)) {
      errors.targetAmount = "Inserisci un numero valido";
    } else if (targetAmount <= 0) {
      errors.targetAmount = "Il valore deve essere maggiore di 0";
    }
  }

  if (emoji && Array.from(emoji).length > 4) {
    errors.emoji = "Usa al massimo 4 caratteri";
  }

  return { errors, title, emoji, targetAmount };
}

export type GoalProgressRow = {
  id: string;
  title: string;
  targetAmount: unknown;
  emoji: string | null;
  targetUserId: string | null;
  isActive: boolean;
  createdAt: Date;
};

export type GoalsProgressInput = {
  goals: GoalProgressRow[];
  /// SUM(alternativeCost) delle entry evitate del workspace (testo SQL).
  totalAllRaw: unknown;
  /// Totali per beneficiario unico (le entry condivise non contano qui).
  userTotals: Array<{ userId: string; total: unknown }>;
  /// Totali per mese locale ordinati ASC, chiave "YYYY-MM".
  monthlyTotals: Array<{ month: string; total: unknown }>;
  currentMonthKey: string;
  contributors: string[];
};

function getProgressPercent(progressAmount: number, targetAmount: number): number {
  if (targetAmount <= 0) {
    return 0;
  }

  return round2(Math.min((progressAmount / targetAmount) * 100, 100));
}

function getProgressAmount(
  targetUserId: string | null,
  totalByUserId: Map<string, number>,
  totalAll: number,
): number {
  if (targetUserId) {
    return totalByUserId.get(targetUserId) ?? 0;
  }
  return totalAll;
}

export function computeGoalsWithProgress(
  input: GoalsProgressInput,
): GoalsWithProgress {
  const totalAll = round2(toMoneyNumber(input.totalAllRaw));
  const totalByUserId = new Map<string, number>();

  for (const row of input.userTotals) {
    totalByUserId.set(row.userId, round2(toMoneyNumber(row.total)));
  }

  const totalMonthlyAvoided = input.monthlyTotals.reduce(
    (sum, row) => sum + toMoneyNumber(row.total),
    0,
  );
  // Average over every calendar month since the first avoided entry, so
  // months with zero savings pull the pace down instead of being skipped.
  const firstMonthKey = input.monthlyTotals[0]?.month;
  const observedMonths = firstMonthKey
    ? Math.max(
        countCalendarMonthsInclusive(firstMonthKey, input.currentMonthKey),
        1,
      )
    : 1;
  const monthlyPace = round2(totalMonthlyAvoided / observedMonths);

  const goals = input.goals.map((goal) => {
    const targetAmount = round2(toMoneyNumber(goal.targetAmount));
    const progressAmount = getProgressAmount(
      goal.targetUserId,
      totalByUserId,
      totalAll,
    );
    const progressPercent = getProgressPercent(progressAmount, targetAmount);
    const remainingAmount = round2(Math.max(targetAmount - progressAmount, 0));

    return {
      id: goal.id,
      title: goal.title,
      targetAmount,
      emoji: goal.emoji,
      targetUserId: goal.targetUserId,
      isActive: goal.isActive,
      createdAt: goal.createdAt.toISOString(),
      progressAmount,
      progressPercent,
      remainingAmount,
      isCompleted: targetAmount > 0 && progressAmount >= targetAmount,
      monthlyPace,
      contributors: input.contributors,
    };
  });

  return {
    goals,
    savedPool: totalAll,
    monthlyPace,
  };
}
