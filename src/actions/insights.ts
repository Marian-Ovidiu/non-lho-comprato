"use server";

import { prisma } from "@/src/lib/prisma";
import { round2, toMoneyNumber } from "@/src/lib/money-number";
import { getCurrentWorkspaceId } from "@/src/lib/workspace-context";

export type InsightsRangeDays = 30 | 90 | 365;
export type TriggerIconName = "moon" | "sunrise" | "smartphone" | "coffee" | "sparkles";

export type PatternTrigger = {
  id: string;
  label: string;
  icon: TriggerIconName;
  count: number;
  avoided: number;
  avgAmount: number;
};

export type PatternWeakSpot = {
  label: string;
  impulse: number;
  planned: number;
  delta: string;
};

export type PatternWin = {
  label: string;
  context: string;
  saved: number;
  days: number;
};

export type InsightsData = {
  rangeDays: InsightsRangeDays;
  resistanceRate: number;
  resistancePrev: number;
  currentStreak: number;
  longestStreak: number;
  avoidedTotal: number;
  attemptsCount: number;
  avoidedCount: number;
  impulsePurchasedCount: number;
  triggers: PatternTrigger[];
  heatmap: number[][];
  heatmapCallout: string;
  weakSpots: PatternWeakSpot[];
  wins: PatternWin[];
  verdict: string;
};

type InsightEntry = {
  id: string;
  title: string;
  note: string | null;
  realCost: unknown;
  alternativeCost: unknown;
  mode: "spent" | "avoided";
  savingContext: "none" | "comparison";
  date: Date;
  createdAt: Date;
  category: {
    id: string;
    name: string;
    slug: string;
  };
};

type BudgetRow = {
  categoryId: string | null;
  amount: unknown;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfWeekMonday(date: Date) {
  const start = startOfUtcDay(date);
  const mondayOffset = (start.getUTCDay() + 6) % 7;
  return addDays(start, -mondayOffset);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayIndex(date: Date) {
  return (date.getUTCDay() + 6) % 7;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isAttempt(entry: InsightEntry) {
  return entry.mode === "avoided" ||
    (entry.mode === "spent" && entry.savingContext === "comparison");
}

function isAvoided(entry: InsightEntry) {
  return entry.mode === "avoided";
}

function isImpulsePurchased(entry: InsightEntry) {
  return entry.mode === "spent" && entry.savingContext === "comparison";
}

function attemptedAmount(entry: InsightEntry) {
  if (entry.mode === "avoided") {
    return toMoneyNumber(entry.alternativeCost);
  }

  return Math.max(
    toMoneyNumber(entry.realCost),
    toMoneyNumber(entry.alternativeCost),
  );
}

function purchasedImpulseAmount(entry: InsightEntry) {
  return isImpulsePurchased(entry) ? toMoneyNumber(entry.realCost) : 0;
}

function inferTrigger(entry: InsightEntry): {
  id: string;
  label: string;
  icon: TriggerIconName;
} {
  const text = normalizeText(`${entry.title} ${entry.note ?? ""} ${entry.category.name} ${entry.category.slug}`);
  const hour = entry.createdAt.getHours();

  if (/(sconto|promo|offerta|saldi|deal|coupon|black friday)/.test(text)) {
    return { id: "discount", label: "Notifica sconto", icon: "sparkles" };
  }

  if (/(caffe|cappuccino|bar|pausa)/.test(text)) {
    return { id: "coffee", label: "Pausa automatica", icon: "coffee" };
  }

  if (hour >= 22 || hour < 6) {
    return { id: "night-scroll", label: "Scroll notturno", icon: "moon" };
  }

  if (hour >= 6 && hour < 11) {
    return { id: "morning", label: "Prima mattina", icon: "sunrise" };
  }

  return { id: "quick-phone", label: "Impulso rapido", icon: "smartphone" };
}

function buildResistance(entries: InsightEntry[]) {
  const attempts = entries.filter(isAttempt);
  const avoidedCount = attempts.filter(isAvoided).length;
  const purchasedCount = attempts.filter(isImpulsePurchased).length;
  const count = avoidedCount + purchasedCount;

  return {
    attempts,
    avoidedCount,
    purchasedCount,
    rate: count === 0 ? 0 : round2(avoidedCount / count),
  };
}

function buildTriggers(attempts: InsightEntry[]): PatternTrigger[] {
  const map = new Map<
    string,
    {
      label: string;
      icon: TriggerIconName;
      count: number;
      avoided: number;
      totalAmount: number;
    }
  >();

  for (const entry of attempts) {
    const trigger = inferTrigger(entry);
    const current = map.get(trigger.id) ?? {
      label: trigger.label,
      icon: trigger.icon,
      count: 0,
      avoided: 0,
      totalAmount: 0,
    };

    current.count += 1;
    current.avoided += isAvoided(entry) ? 1 : 0;
    current.totalAmount = round2(current.totalAmount + attemptedAmount(entry));
    map.set(trigger.id, current);
  }

  return Array.from(map.entries())
    .map(([id, trigger]) => ({
      id,
      label: trigger.label,
      icon: trigger.icon,
      count: trigger.count,
      avoided: trigger.avoided,
      avgAmount: trigger.count === 0 ? 0 : round2(trigger.totalAmount / trigger.count),
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "it"))
    .slice(0, 5);
}

function bucketHeatmap(value: number) {
  if (value <= 0) return 0;
  if (value < 25) return 1;
  if (value < 60) return 2;
  if (value < 120) return 3;
  return 4;
}

function buildHeatmap(entries: InsightEntry[], end: Date) {
  const lastTrackedDay = addDays(startOfUtcDay(end), -1);
  const start = addDays(startOfWeekMonday(lastTrackedDay), -49);
  const byDay = new Map<string, number>();
  const byWeekday = new Map<number, number>();

  for (const entry of entries) {
    if (!isAttempt(entry)) continue;
    const impulse = attemptedAmount(entry);
    const key = dateKey(entry.date);
    byDay.set(key, round2((byDay.get(key) ?? 0) + impulse));
    byWeekday.set(dayIndex(entry.date), round2((byWeekday.get(dayIndex(entry.date)) ?? 0) + impulse));
  }

  const heatmap: number[][] = [];
  for (let week = 0; week < 8; week += 1) {
    const row: number[] = [];
    for (let day = 0; day < 7; day += 1) {
      const current = addDays(start, week * 7 + day);
      row.push(bucketHeatmap(byDay.get(dateKey(current)) ?? 0));
    }
    heatmap.push(row);
  }

  const dayLabels = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];
  const fragileDay =
    Array.from(byWeekday.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 5;

  return {
    heatmap,
    callout: `${dayLabels[fragileDay]} = momento fragile`,
  };
}

function buildStreaks(entries: InsightEntry[], rangeStart: Date, end: Date) {
  const impulseDays = new Set(
    entries.filter(isImpulsePurchased).map((entry) => dateKey(entry.date)),
  );
  const lastDay = addDays(startOfUtcDay(end), -1);
  let currentStreak = 0;
  let longestStreak = 0;
  let rolling = 0;

  for (let cursor = startOfUtcDay(rangeStart); cursor < end; cursor = addDays(cursor, 1)) {
    if (impulseDays.has(dateKey(cursor))) {
      rolling = 0;
    } else {
      rolling += 1;
      longestStreak = Math.max(longestStreak, rolling);
    }
  }

  for (let cursor = lastDay; cursor >= rangeStart; cursor = addDays(cursor, -1)) {
    if (impulseDays.has(dateKey(cursor))) break;
    currentStreak += 1;
  }

  return { currentStreak, longestStreak };
}

function buildWeakSpots(
  entries: InsightEntry[],
  budgets: BudgetRow[],
  rangeDays: InsightsRangeDays,
): PatternWeakSpot[] {
  const budgetsByCategory = new Map(
    budgets
      .filter((budget) => budget.categoryId)
      .map((budget) => [budget.categoryId as string, toMoneyNumber(budget.amount)]),
  );
  const byCategory = new Map<
    string,
    { label: string; impulse: number; planned: number }
  >();
  const rangeScale = rangeDays / 30;

  for (const entry of entries) {
    if (!isImpulsePurchased(entry)) continue;
    const planned = round2((budgetsByCategory.get(entry.category.id) ?? 0) * rangeScale);
    const current = byCategory.get(entry.category.id) ?? {
      label: entry.category.name,
      impulse: 0,
      planned,
    };

    current.impulse = round2(current.impulse + purchasedImpulseAmount(entry));
    current.planned = planned;
    byCategory.set(entry.category.id, current);
  }

  return Array.from(byCategory.values())
    .filter((spot) => spot.planned === 0 || spot.impulse > spot.planned)
    .map((spot) => ({
      ...spot,
      delta:
        spot.planned <= 0
          ? "impulso puro"
          : `+${Math.round(((spot.impulse - spot.planned) / spot.planned) * 100)}%`,
    }))
    .sort((left, right) => (right.impulse - right.planned) - (left.impulse - left.planned))
    .slice(0, 3);
}

function buildWins(entries: InsightEntry[], now: Date): PatternWin[] {
  return entries
    .filter(isAvoided)
    .map((entry) => {
      const days = Math.max(
        0,
        Math.floor((startOfUtcDay(now).getTime() - startOfUtcDay(entry.date).getTime()) / 86_400_000),
      );
      const saved = toMoneyNumber(entry.alternativeCost);

      return {
        label: entry.title,
        context:
          entry.note?.trim() ||
          `${days === 0 ? "Oggi" : `${days}g fa`}, hai lasciato passare l'impulso.`,
        saved,
        days,
        score: saved * Math.log(days + 2),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((win) => ({
      label: win.label,
      context: win.context,
      saved: win.saved,
      days: win.days,
    }));
}

function buildVerdict({
  rate,
  triggers,
  weakSpots,
}: {
  rate: number;
  triggers: PatternTrigger[];
  weakSpots: PatternWeakSpot[];
}) {
  if (triggers.length === 0) {
    return "Non ci sono ancora abbastanza impulsi tracciati per leggere un pattern. Per i prossimi giorni annota anche gli acquisti evitati: il segnale nasce dal confronto.";
  }

  const fragile = [...triggers].sort(
    (left, right) =>
      (left.avoided / Math.max(left.count, 1)) - (right.avoided / Math.max(right.count, 1)) ||
      right.count - left.count,
  )[0];
  const weak = weakSpots[0];
  const pct = Math.round(rate * 100);

  const actionByTrigger: Record<string, string> = {
    "night-scroll": "chiudi lo scroll prima delle 23",
    discount: "disattiva le notifiche sconto per una settimana",
    coffee: "decidi il caffè prima di uscire, non davanti al bancone",
    morning: "rimanda ogni acquisto del mattino di 20 minuti",
    "quick-phone": "metti gli acquisti rapidi in lista e riaprili domani",
  };

  return `Resisti al ${pct}% degli impulsi tracciati. Il punto più fragile è ${fragile.label.toLocaleLowerCase("it-IT")}${weak ? `, soprattutto su ${weak.label}` : ""}. Azione concreta: ${actionByTrigger[fragile.id] ?? actionByTrigger["quick-phone"]}.`;
}

export async function getInsightsPageData(
  rangeDays: InsightsRangeDays,
  now = new Date(),
): Promise<InsightsData> {
  const workspaceId = await getCurrentWorkspaceId();

  const end = addDays(startOfUtcDay(now), 1);
  const rangeStart = addDays(end, -rangeDays);
  const previousStart = addDays(rangeStart, -rangeDays);
  const heatmapStart = addDays(startOfWeekMonday(addDays(end, -1)), -49);
  const queryStart = previousStart < heatmapStart ? previousStart : heatmapStart;

  const [entries, budgets] = await Promise.all([
    prisma.entry.findMany({
      where: {
        workspaceId,
        date: {
          gte: queryStart,
          lt: end,
        },
      },
      select: {
        id: true,
        title: true,
        note: true,
        realCost: true,
        alternativeCost: true,
        mode: true,
        savingContext: true,
        date: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.budget.findMany({
      where: {
        workspaceId,
        period: "monthly",
        scope: "category",
      },
      select: {
        categoryId: true,
        amount: true,
      },
    }),
  ]);

  const typedEntries = entries as InsightEntry[];
  const currentEntries = typedEntries.filter((entry) => entry.date >= rangeStart && entry.date < end);
  const previousEntries = typedEntries.filter((entry) => entry.date >= previousStart && entry.date < rangeStart);
  const current = buildResistance(currentEntries);
  const previous = buildResistance(previousEntries);
  const triggers = buildTriggers(current.attempts);
  const { heatmap, callout } = buildHeatmap(
    typedEntries.filter((entry) => entry.date >= heatmapStart && entry.date < end),
    end,
  );
  const streaks = buildStreaks(currentEntries, rangeStart, end);
  const avoidedTotal = round2(
    currentEntries
      .filter(isAvoided)
      .reduce((sum, entry) => sum + toMoneyNumber(entry.alternativeCost), 0),
  );
  const weakSpots = buildWeakSpots(currentEntries, budgets, rangeDays);
  const wins = buildWins(currentEntries, now);

  return {
    rangeDays,
    resistanceRate: current.rate,
    resistancePrev: previous.rate,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    avoidedTotal,
    attemptsCount: current.attempts.length,
    avoidedCount: current.avoidedCount,
    impulsePurchasedCount: current.purchasedCount,
    triggers,
    heatmap,
    heatmapCallout: callout,
    weakSpots,
    wins,
    verdict: buildVerdict({
      rate: current.rate,
      triggers,
      weakSpots,
    }),
  };
}
