"use server";

import type { Prisma } from "@/src/lib/generated/prisma/client";
import { buildWorkspaceMemberEntryWhere } from "@/src/lib/workspace-member-filter";
import {
  aggregateMemberSpendingStats,
  type MemberSpendingEntry,
} from "@/src/lib/member-spending-stats";
import { formatMoney } from "@/src/lib/formatters";
import { prisma } from "@/src/lib/prisma";
import {
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceScopedWhere,
} from "@/src/lib/workspace-context";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

type StatsOverview = {
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
  averageSavedPerEntry: number;
  savingRatePercent: number;
};

type MonthlyStatsItem = {
  month: string;
  label: string;
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
};

type CategoryStatsItem = {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
  averageSaved: number;
};

type TopSavingsItem = {
  id: string;
  title: string;
  categoryName: string;
  date: Date;
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  source: "manual" | "habit";
};

type StatsInsightTone = "default" | "success" | "premium" | "warning";

export type StatsInsight = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: StatsInsightTone;
};

type HabitStatsItem = {
  habitId: string;
  habitName: string;
  categoryName: string;
  amount: number;
  totalOccurrences: number;
  spentCount: number;
  avoidedCount: number;
  skippedCount: number;
  pendingCount: number;
  totalSaved: number;
  disciplineRatePercent: number;
};

export type WorkspaceMemberSpendingStatsItem = {
  userId: string;
  label: string;
  totalPaidByUser: number;
  personalSpending: number;
  sharedSpending: number;
};

type DecimalLike = {
  toString?: () => string;
};

type StatsEntryRow = {
  id: string;
  title: string;
  date: Date;
  realCost: unknown;
  alternativeCost: unknown;
  savedAmount: unknown;
  source: "manual" | "habit";
  categoryId: string;
  category: {
    name: string;
    slug: string;
  };
};

type StatsMonthlyCategoryRow = {
  categoryName: string;
  categorySlug: string;
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
};

type StatsPageData = {
  overview: StatsOverview;
  monthlyStats: MonthlyStatsItem[];
  categoryStats: CategoryStatsItem[];
  topSavings: TopSavingsItem[];
  habitStats: HabitStatsItem[];
  insights: StatsInsight[];
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === "object") {
    const decimal = value as DecimalLike;
    if (typeof decimal.toString === "function") {
      const parsed = Number(decimal.toString().replace(",", "."));
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  return 0;
}

function sum(values: Array<unknown>): number {
  return round2(
    values.reduce<number>((total, value) => total + toNumber(value), 0),
  );
}

async function buildEntryWhere(
  memberUserId: string | undefined,
  where: Prisma.EntryWhereInput = {},
): Promise<Prisma.EntryWhereInput> {
  const members = await getCurrentWorkspaceMembers();

  return {
    ...where,
    ...buildWorkspaceMemberEntryWhere(memberUserId, members),
    ...(await getCurrentWorkspaceScopedWhere()),
  };
}

async function buildHabitOccurrenceWhere(
  memberUserId: string | undefined,
): Promise<Prisma.HabitOccurrenceWhereInput> {
  const workspaceWhere = await getCurrentWorkspaceScopedWhere();

  if (!memberUserId) {
    return {
      habit: {
        is: workspaceWhere,
      },
    };
  }

  const members = await getCurrentWorkspaceMembers();

  return {
    habit: {
      is: workspaceWhere,
    },
    entry: {
      is: await getCurrentWorkspaceScopedWhere(
        buildWorkspaceMemberEntryWhere(memberUserId, members),
      ),
    },
  };
}

function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(year: number, monthIndex: number): string {
  const raw = new Intl.DateTimeFormat("it-IT", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));

  const normalized = raw.replace(/\./g, "").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getMonthLabelFromKey(monthKey: string): string {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return monthKey;
  }

  return formatMonthLabel(year, monthIndex);
}

function emptyOverview(): StatsOverview {
  return {
    totalRealSpent: 0,
    totalAlternativeCost: 0,
    totalSaved: 0,
    entriesCount: 0,
    averageSavedPerEntry: 0,
    savingRatePercent: 0,
  };
}

function formatSignedMoney(value: number): string {
  const normalized = formatMoney(Math.abs(value));
  if (value > 0) {
    return `+${normalized}`;
  }

  if (value < 0) {
    return `-${normalized}`;
  }

  return normalized;
}

function getCategoryTotals(
  grouped: Map<string, StatsMonthlyCategoryRow>,
  categoryId: string,
): StatsMonthlyCategoryRow | null {
  return grouped.get(categoryId) ?? null;
}

function buildSavingCategoryInsight(
  monthlyStats: MonthlyStatsItem[],
  monthlyCategoryGrouped: Map<string, Map<string, StatsMonthlyCategoryRow>>,
  categoryStats: CategoryStatsItem[],
): StatsInsight {
  const latestMonth = monthlyStats.at(-1);

  if (!latestMonth) {
    return {
      id: "best-savings-category",
      label: "Dove rende di più",
      value: "In costruzione",
      detail:
        "Appena ci saranno movimenti, qui comparirà la categoria che protegge di più il budget.",
      tone: "default",
    };
  }

  const latestCategories = monthlyCategoryGrouped.get(latestMonth.month);
  if (!latestCategories || latestCategories.size === 0) {
    const fallback = categoryStats[0];

    return {
      id: "best-savings-category",
      label: "Dove rende di più",
      value: fallback?.categoryName ?? "In costruzione",
      detail: fallback
        ? `${formatMoney(fallback.totalSaved)} tenuti finora in questa categoria.`
        : "Appena compariranno dati, qui vedrai la categoria più forte.",
      tone: "success",
    };
  }

  const currentCategory = [...latestCategories.entries()]
    .map(([categoryId, totals]) => ({ categoryId, ...totals }))
    .sort(
      (left, right) =>
        right.totalSaved - left.totalSaved ||
        right.entriesCount - left.entriesCount ||
        left.categoryName.localeCompare(right.categoryName, "it"),
    )[0];

  const previousMonth = monthlyStats.at(-2);
  const previousCategory = previousMonth
    ? getCategoryTotals(
        monthlyCategoryGrouped.get(previousMonth.month) ?? new Map(),
        currentCategory.categoryId,
      )
    : null;
  const monthPart = `nel mese di ${latestMonth.label}`;

  if (previousCategory) {
    const delta = round2(currentCategory.totalSaved - previousCategory.totalSaved);
    const deltaLabel =
      delta === 0 ? "in linea con il mese scorso" : `${formatSignedMoney(delta)} rispetto al mese scorso`;

    return {
      id: "best-savings-category",
      label: "Dove rende di più",
      value: currentCategory.categoryName,
      detail: `${formatMoney(currentCategory.totalSaved)} tenuti ${monthPart}. ${deltaLabel}.`,
      tone: "success",
    };
  }

  return {
    id: "best-savings-category",
    label: "Dove rende di più",
    value: currentCategory.categoryName,
    detail: `${formatMoney(currentCategory.totalSaved)} tenuti ${monthPart}.`,
    tone: "success",
  };
}

function buildDeteriorationInsight(
  monthlyStats: MonthlyStatsItem[],
  monthlyCategoryGrouped: Map<string, Map<string, StatsMonthlyCategoryRow>>,
): StatsInsight {
  const latestMonth = monthlyStats.at(-1);
  const previousMonth = monthlyStats.at(-2);

  if (!latestMonth || !previousMonth) {
    return {
      id: "month-trend",
      label: "Da tenere d'occhio",
      value: "Confronto non ancora disponibile",
      detail:
        "Serve almeno un secondo mese con dati per leggere cosa sta andando peggio.",
      tone: "default",
    };
  }

  const currentCategories = monthlyCategoryGrouped.get(latestMonth.month) ?? new Map();
  const previousCategories = monthlyCategoryGrouped.get(previousMonth.month) ?? new Map();
  let worstCategory: {
    categoryName: string;
    currentSaved: number;
    previousSaved: number;
    deltaSaved: number;
  } | null = null;

  for (const [categoryId, currentTotals] of currentCategories.entries()) {
    const previousTotals = previousCategories.get(categoryId) ?? null;
    const previousSaved = previousTotals?.totalSaved ?? 0;
    const deltaSaved = round2(currentTotals.totalSaved - previousSaved);

    if (deltaSaved >= 0) {
      continue;
    }

    if (
      !worstCategory ||
      deltaSaved < worstCategory.deltaSaved ||
      (deltaSaved === worstCategory.deltaSaved &&
        currentTotals.categoryName.localeCompare(worstCategory.categoryName, "it") < 0)
    ) {
      worstCategory = {
        categoryName: currentTotals.categoryName,
        currentSaved: currentTotals.totalSaved,
        previousSaved,
        deltaSaved,
      };
    }
  }

  if (worstCategory) {
    return {
      id: "month-trend",
      label: "Da tenere d'occhio",
      value: worstCategory.categoryName,
      detail: `${formatMoney(Math.abs(worstCategory.deltaSaved))} in meno rispetto al mese scorso in questa categoria.`,
      tone: "warning",
    };
  }

  const currentMonth = latestMonth;
  const previousRealSpent = previousMonth.totalRealSpent;
  const currentRealSpent = currentMonth.totalRealSpent;
  const realSpentDelta = round2(currentRealSpent - previousRealSpent);

  if (realSpentDelta > 0) {
    return {
      id: "month-trend",
      label: "Da tenere d'occhio",
      value: "Spesa reale in salita",
      detail: `${formatMoney(realSpentDelta)} in più rispetto al mese scorso.`,
      tone: "warning",
    };
  }

  const savedDelta = round2(currentMonth.totalSaved - previousMonth.totalSaved);
  if (savedDelta < 0) {
    return {
      id: "month-trend",
      label: "Da tenere d'occhio",
      value: "Risparmio in calo",
      detail: `${formatMoney(Math.abs(savedDelta))} in meno rispetto al mese scorso.`,
      tone: "warning",
    };
  }

  return {
    id: "month-trend",
    label: "Da tenere d'occhio",
    value: "Nessun calo netto",
    detail:
      "Il mese non mostra un peggioramento netto rispetto al precedente.",
    tone: "success",
  };
}

function buildHabitInsight(habitStats: HabitStatsItem[]): StatsInsight {
  if (habitStats.length === 0) {
    return {
      id: "best-habit",
      label: "Abitudine più incisiva",
      value: "In costruzione",
      detail:
        "Appena inizierai a registrare le abitudini, qui comparirà il loro impatto economico.",
      tone: "premium",
    };
  }

  const strongestHabit = [...habitStats].sort(
    (left, right) =>
      right.totalSaved - left.totalSaved ||
      right.disciplineRatePercent - left.disciplineRatePercent ||
      right.totalOccurrences - left.totalOccurrences ||
      left.habitName.localeCompare(right.habitName, "it"),
  )[0];

  return {
    id: "best-habit",
    label: "Abitudine più incisiva",
    value: strongestHabit.habitName,
    detail:
      strongestHabit.totalSaved > 0
        ? `${formatMoney(strongestHabit.totalSaved)} evitati su ${strongestHabit.totalOccurrences} occorrenze, con ${strongestHabit.disciplineRatePercent.toFixed(1)}% di evitati.`
        : `Ancora nessun risparmio evitato: ${strongestHabit.totalOccurrences} occorrenze registrate.`,
    tone: "premium",
  };
}

async function buildStatsEntryWhere(
  memberUserId: string | undefined,
  members: WorkspaceMemberOption[],
): Promise<Prisma.EntryWhereInput> {
  return {
    ...buildWorkspaceMemberEntryWhere(memberUserId, members),
    ...(await getCurrentWorkspaceScopedWhere()),
  };
}

async function buildStatsHabitOccurrenceWhere(
  memberUserId: string | undefined,
  members: WorkspaceMemberOption[],
): Promise<Prisma.HabitOccurrenceWhereInput> {
  const workspaceWhere = await getCurrentWorkspaceScopedWhere();

  if (!memberUserId) {
    return {
      habit: {
        is: workspaceWhere,
      },
    };
  }

  return {
    habit: {
      is: workspaceWhere,
    },
    entry: {
      is: await getCurrentWorkspaceScopedWhere(
        buildWorkspaceMemberEntryWhere(memberUserId, members),
      ),
    },
  };
}

function getStatsFromEntries(
  entries: StatsEntryRow[],
): Pick<
  StatsPageData,
  "overview" | "monthlyStats" | "categoryStats" | "topSavings" | "insights"
> {
  if (entries.length === 0) {
    return {
      overview: emptyOverview(),
      monthlyStats: [],
      categoryStats: [],
      topSavings: [],
      insights: [],
    };
  }

  const overview = emptyOverview();
  const monthlyGrouped = new Map<
    string,
    {
      totalRealSpent: number;
      totalAlternativeCost: number;
      totalSaved: number;
      entriesCount: number;
    }
  >();
  const categoryGrouped = new Map<
    string,
    {
      categoryName: string;
      categorySlug: string;
      totalRealSpent: number;
      totalAlternativeCost: number;
      totalSaved: number;
      entriesCount: number;
    }
  >();
  const monthlyCategoryGrouped = new Map<
    string,
    Map<string, StatsMonthlyCategoryRow>
  >();
  const topSavings: TopSavingsItem[] = [];

  for (const entry of entries) {
    const realCost = toNumber(entry.realCost);
    const alternativeCost = toNumber(entry.alternativeCost);
    const savedAmount = toNumber(entry.savedAmount);

    overview.totalRealSpent = round2(overview.totalRealSpent + realCost);
    overview.totalAlternativeCost = round2(
      overview.totalAlternativeCost + alternativeCost,
    );
    overview.totalSaved = round2(overview.totalSaved + savedAmount);
    overview.entriesCount += 1;

    const monthKey = getMonthKey(entry.date);
    const monthlyCurrent = monthlyGrouped.get(monthKey) ?? {
      totalRealSpent: 0,
      totalAlternativeCost: 0,
      totalSaved: 0,
      entriesCount: 0,
    };

    monthlyCurrent.totalRealSpent = round2(
      monthlyCurrent.totalRealSpent + realCost,
    );
    monthlyCurrent.totalAlternativeCost = round2(
      monthlyCurrent.totalAlternativeCost + alternativeCost,
    );
    monthlyCurrent.totalSaved = round2(monthlyCurrent.totalSaved + savedAmount);
    monthlyCurrent.entriesCount += 1;
    monthlyGrouped.set(monthKey, monthlyCurrent);

    const monthlyCategoryCurrent =
      monthlyCategoryGrouped.get(monthKey) ??
      new Map<string, StatsMonthlyCategoryRow>();
    const monthlyCategoryTotals = monthlyCategoryCurrent.get(entry.categoryId) ?? {
      categoryName: entry.category.name,
      categorySlug: entry.category.slug,
      totalRealSpent: 0,
      totalAlternativeCost: 0,
      totalSaved: 0,
      entriesCount: 0,
    };

    monthlyCategoryTotals.totalRealSpent = round2(
      monthlyCategoryTotals.totalRealSpent + realCost,
    );
    monthlyCategoryTotals.totalAlternativeCost = round2(
      monthlyCategoryTotals.totalAlternativeCost + alternativeCost,
    );
    monthlyCategoryTotals.totalSaved = round2(
      monthlyCategoryTotals.totalSaved + savedAmount,
    );
    monthlyCategoryTotals.entriesCount += 1;
    monthlyCategoryCurrent.set(entry.categoryId, monthlyCategoryTotals);
    monthlyCategoryGrouped.set(monthKey, monthlyCategoryCurrent);

    const categoryCurrent = categoryGrouped.get(entry.categoryId) ?? {
      categoryName: entry.category.name,
      categorySlug: entry.category.slug,
      totalRealSpent: 0,
      totalAlternativeCost: 0,
      totalSaved: 0,
      entriesCount: 0,
    };

    categoryCurrent.totalRealSpent = round2(
      categoryCurrent.totalRealSpent + realCost,
    );
    categoryCurrent.totalAlternativeCost = round2(
      categoryCurrent.totalAlternativeCost + alternativeCost,
    );
    categoryCurrent.totalSaved = round2(categoryCurrent.totalSaved + savedAmount);
    categoryCurrent.entriesCount += 1;
    categoryGrouped.set(entry.categoryId, categoryCurrent);

    if (savedAmount > 0) {
      topSavings.push({
        id: entry.id,
        title: entry.title,
        categoryName: entry.category.name,
        date: entry.date,
        realCost,
        alternativeCost,
        savedAmount,
        source: entry.source,
      });
    }
  }

  const monthlyStats = Array.from(monthlyGrouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, totals]) => ({
      month,
      label: getMonthLabelFromKey(month),
      totalRealSpent: totals.totalRealSpent,
      totalAlternativeCost: totals.totalAlternativeCost,
      totalSaved: totals.totalSaved,
      entriesCount: totals.entriesCount,
    }));

  const categoryStats = Array.from(categoryGrouped.entries())
    .map(([categoryId, totals]) => ({
      categoryId,
      categoryName: totals.categoryName,
      categorySlug: totals.categorySlug,
      totalRealSpent: totals.totalRealSpent,
      totalAlternativeCost: totals.totalAlternativeCost,
      totalSaved: totals.totalSaved,
      entriesCount: totals.entriesCount,
      averageSaved:
        totals.entriesCount === 0
          ? 0
          : round2(totals.totalSaved / totals.entriesCount),
    }))
    .sort((left, right) => right.totalSaved - left.totalSaved);

  topSavings.sort(
    (left, right) =>
      right.savedAmount - left.savedAmount ||
      right.date.getTime() - left.date.getTime(),
  );

  const insights = [
    buildSavingCategoryInsight(monthlyStats, monthlyCategoryGrouped, categoryStats),
    buildDeteriorationInsight(monthlyStats, monthlyCategoryGrouped),
  ];

  return {
    overview: {
      ...overview,
      averageSavedPerEntry:
        overview.entriesCount === 0
          ? 0
          : round2(overview.totalSaved / overview.entriesCount),
      savingRatePercent:
        overview.totalAlternativeCost === 0
          ? 0
          : round2((overview.totalSaved / overview.totalAlternativeCost) * 100),
    },
    monthlyStats,
    categoryStats,
    topSavings: topSavings.slice(0, 10),
    insights,
  };
}

async function getHabitStatsFromMembers(
  memberUserId: string | undefined,
  members: WorkspaceMemberOption[],
): Promise<HabitStatsItem[]> {
  try {
    const occurrences = await prisma.habitOccurrence.findMany({
      where: await buildStatsHabitOccurrenceWhere(memberUserId, members),
      select: {
        status: true,
        habit: {
          select: {
            id: true,
            name: true,
            amount: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (occurrences.length === 0) {
      return [];
    }

    const grouped = new Map<
      string,
      {
        habitName: string;
        categoryName: string;
        amount: number;
        totalOccurrences: number;
        spentCount: number;
        avoidedCount: number;
        skippedCount: number;
        pendingCount: number;
        totalSaved: number;
      }
    >();

    for (const occurrence of occurrences) {
      const habitId = occurrence.habit.id;
      const current = grouped.get(habitId) ?? {
        habitName: occurrence.habit.name,
        categoryName: occurrence.habit.category.name,
        amount: toNumber(occurrence.habit.amount),
        totalOccurrences: 0,
        spentCount: 0,
        avoidedCount: 0,
        skippedCount: 0,
        pendingCount: 0,
        totalSaved: 0,
      };

      current.totalOccurrences += 1;

      switch (occurrence.status) {
        case "spent":
          current.spentCount += 1;
          break;
        case "avoided":
          current.avoidedCount += 1;
          break;
        case "skipped":
          current.skippedCount += 1;
          break;
        default:
          current.pendingCount += 1;
          break;
      }

      if (occurrence.status === "avoided") {
        current.totalSaved = round2(current.totalSaved + current.amount);
      }

      grouped.set(habitId, current);
    }

    return Array.from(grouped.entries())
      .map(([habitId, totals]) => {
        const considered = totals.avoidedCount + totals.spentCount;
        return {
          habitId,
          habitName: totals.habitName,
          categoryName: totals.categoryName,
          amount: totals.amount,
          totalOccurrences: totals.totalOccurrences,
          spentCount: totals.spentCount,
          avoidedCount: totals.avoidedCount,
          skippedCount: totals.skippedCount,
          pendingCount: totals.pendingCount,
          totalSaved: totals.totalSaved,
          disciplineRatePercent:
            considered === 0
              ? 0
              : round2((totals.avoidedCount / considered) * 100),
        };
      })
      .sort((left, right) => right.totalSaved - left.totalSaved);
  } catch (error) {
    console.error("Failed to load habit stats:", error);
    return [];
  }
}

export async function getStatsPageData(
  memberUserId?: string,
  members?: WorkspaceMemberOption[],
): Promise<StatsPageData> {
  const workspaceMembers = members ?? (await getCurrentWorkspaceMembers());
  const [entryWhere, habitStats] = await Promise.all([
    buildStatsEntryWhere(memberUserId, workspaceMembers),
    getHabitStatsFromMembers(memberUserId, workspaceMembers),
  ]);

  const entries = await prisma.entry.findMany({
    where: entryWhere,
    orderBy: {
      date: "asc",
    },
    select: {
      id: true,
      title: true,
      date: true,
      realCost: true,
      alternativeCost: true,
      savedAmount: true,
      source: true,
      categoryId: true,
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  const entryStats = getStatsFromEntries(entries);
  const habitInsight = buildHabitInsight(habitStats);
  const insights = [...entryStats.insights, habitInsight].slice(0, 3);

  return {
    overview: entryStats.overview,
    monthlyStats: entryStats.monthlyStats,
    categoryStats: entryStats.categoryStats,
    topSavings: entryStats.topSavings,
    habitStats,
    insights,
  };
}

export async function getStatsOverview(
  memberUserId?: string,
): Promise<StatsOverview> {
  try {
    const entries = await prisma.entry.findMany({
      where: await buildEntryWhere(memberUserId),
      select: {
        realCost: true,
        alternativeCost: true,
        savedAmount: true,
      },
    });

    if (entries.length === 0) {
      return emptyOverview();
    }

    const totalRealSpent = sum(entries.map((entry) => entry.realCost));
    const totalAlternativeCost = sum(
      entries.map((entry) => entry.alternativeCost),
    );
    const totalSaved = sum(entries.map((entry) => entry.savedAmount));
    const entriesCount = entries.length;

    return {
      totalRealSpent,
      totalAlternativeCost,
      totalSaved,
      entriesCount,
      averageSavedPerEntry: round2(totalSaved / entriesCount),
      savingRatePercent:
        totalAlternativeCost === 0
          ? 0
          : round2((totalSaved / totalAlternativeCost) * 100),
    };
  } catch (error) {
    console.error("Failed to load stats overview:", error);
    return emptyOverview();
  }
}

export async function getMonthlyStats(
  memberUserId?: string,
): Promise<MonthlyStatsItem[]> {
  try {
    const entries = await prisma.entry.findMany({
      where: await buildEntryWhere(memberUserId),
      select: {
        date: true,
        realCost: true,
        alternativeCost: true,
        savedAmount: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    if (entries.length === 0) {
      return [];
    }

    const grouped = new Map<
      string,
      {
        totalRealSpent: number;
        totalAlternativeCost: number;
        totalSaved: number;
        entriesCount: number;
      }
    >();

    for (const entry of entries) {
      const monthKey = getMonthKey(entry.date);
      const current = grouped.get(monthKey) ?? {
        totalRealSpent: 0,
        totalAlternativeCost: 0,
        totalSaved: 0,
        entriesCount: 0,
      };

      current.totalRealSpent = round2(
        current.totalRealSpent + toNumber(entry.realCost),
      );
      current.totalAlternativeCost = round2(
        current.totalAlternativeCost + toNumber(entry.alternativeCost),
      );
      current.totalSaved = round2(current.totalSaved + toNumber(entry.savedAmount));
      current.entriesCount += 1;

      grouped.set(monthKey, current);
    }

    return Array.from(grouped.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, totals]) => ({
        month,
        label: getMonthLabelFromKey(month),
        totalRealSpent: totals.totalRealSpent,
        totalAlternativeCost: totals.totalAlternativeCost,
        totalSaved: totals.totalSaved,
        entriesCount: totals.entriesCount,
      }));
  } catch (error) {
    console.error("Failed to load monthly stats:", error);
    return [];
  }
}

export async function getCategoryStats(
  memberUserId?: string,
): Promise<CategoryStatsItem[]> {
  try {
    const entries = await prisma.entry.findMany({
      where: await buildEntryWhere(memberUserId),
      select: {
        categoryId: true,
        realCost: true,
        alternativeCost: true,
        savedAmount: true,
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (entries.length === 0) {
      return [];
    }

    const grouped = new Map<
      string,
      {
        categoryName: string;
        categorySlug: string;
        totalRealSpent: number;
        totalAlternativeCost: number;
        totalSaved: number;
        entriesCount: number;
      }
    >();

    for (const entry of entries) {
      const current = grouped.get(entry.categoryId) ?? {
        categoryName: entry.category.name,
        categorySlug: entry.category.slug,
        totalRealSpent: 0,
        totalAlternativeCost: 0,
        totalSaved: 0,
        entriesCount: 0,
      };

      current.totalRealSpent = round2(
        current.totalRealSpent + toNumber(entry.realCost),
      );
      current.totalAlternativeCost = round2(
        current.totalAlternativeCost + toNumber(entry.alternativeCost),
      );
      current.totalSaved = round2(current.totalSaved + toNumber(entry.savedAmount));
      current.entriesCount += 1;

      grouped.set(entry.categoryId, current);
    }

    return Array.from(grouped.entries())
      .map(([categoryId, totals]) => ({
        categoryId,
        categoryName: totals.categoryName,
        categorySlug: totals.categorySlug,
        totalRealSpent: totals.totalRealSpent,
        totalAlternativeCost: totals.totalAlternativeCost,
        totalSaved: totals.totalSaved,
        entriesCount: totals.entriesCount,
        averageSaved: totals.entriesCount === 0 ? 0 : round2(totals.totalSaved / totals.entriesCount),
      }))
      .sort((left, right) => right.totalSaved - left.totalSaved);
  } catch (error) {
    console.error("Failed to load category stats:", error);
    return [];
  }
}

export async function getTopSavings(
  memberUserId?: string,
  limit?: number,
): Promise<TopSavingsItem[]>;
export async function getTopSavings(limit?: number): Promise<TopSavingsItem[]>;
export async function getTopSavings(
  memberUserIdOrLimit?: string | number,
  limit = 10,
): Promise<TopSavingsItem[]> {
  const memberUserId =
    typeof memberUserIdOrLimit === "string" ? memberUserIdOrLimit : undefined;
  const requestedLimit =
    typeof memberUserIdOrLimit === "number" ? memberUserIdOrLimit : limit;
  const safeLimit = Number.isFinite(requestedLimit)
    ? Math.max(0, Math.floor(requestedLimit))
    : 10;

  if (safeLimit === 0) {
    return [];
  }

  try {
    const entries = await prisma.entry.findMany({
      where: await buildEntryWhere(memberUserId, {
        savedAmount: {
          gt: 0,
        },
      }),
      orderBy: [
        {
          savedAmount: "desc",
        },
        {
          date: "desc",
        },
      ],
      take: safeLimit,
      select: {
        id: true,
        title: true,
        date: true,
        realCost: true,
        alternativeCost: true,
        savedAmount: true,
        source: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    return entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      categoryName: entry.category.name,
      date: entry.date,
      realCost: toNumber(entry.realCost),
      alternativeCost: toNumber(entry.alternativeCost),
      savedAmount: toNumber(entry.savedAmount),
      source: entry.source,
    }));
  } catch (error) {
    console.error("Failed to load top savings:", error);
    return [];
  }
}

export async function getHabitStats(
  memberUserId?: string,
): Promise<HabitStatsItem[]> {
  try {
    const occurrences = await prisma.habitOccurrence.findMany({
      where: await buildHabitOccurrenceWhere(memberUserId),
      select: {
        status: true,
        habit: {
          select: {
            id: true,
            name: true,
            amount: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (occurrences.length === 0) {
      return [];
    }

    const grouped = new Map<
      string,
      {
        habitName: string;
        categoryName: string;
        amount: number;
        totalOccurrences: number;
        spentCount: number;
        avoidedCount: number;
        skippedCount: number;
        pendingCount: number;
        totalSaved: number;
      }
    >();

    for (const occurrence of occurrences) {
      const habitId = occurrence.habit.id;
      const current = grouped.get(habitId) ?? {
        habitName: occurrence.habit.name,
        categoryName: occurrence.habit.category.name,
        amount: toNumber(occurrence.habit.amount),
        totalOccurrences: 0,
        spentCount: 0,
        avoidedCount: 0,
        skippedCount: 0,
        pendingCount: 0,
        totalSaved: 0,
      };

      current.totalOccurrences += 1;

      switch (occurrence.status) {
        case "spent":
          current.spentCount += 1;
          break;
        case "avoided":
          current.avoidedCount += 1;
          break;
        case "skipped":
          current.skippedCount += 1;
          break;
        default:
          current.pendingCount += 1;
          break;
      }

      if (occurrence.status === "avoided") {
        current.totalSaved = round2(current.totalSaved + current.amount);
      }

      grouped.set(habitId, current);
    }

    return Array.from(grouped.entries())
      .map(([habitId, totals]) => {
        const considered = totals.avoidedCount + totals.spentCount;
        return {
          habitId,
          habitName: totals.habitName,
          categoryName: totals.categoryName,
          amount: totals.amount,
          totalOccurrences: totals.totalOccurrences,
          spentCount: totals.spentCount,
          avoidedCount: totals.avoidedCount,
          skippedCount: totals.skippedCount,
          pendingCount: totals.pendingCount,
          totalSaved: totals.totalSaved,
          disciplineRatePercent:
            considered === 0
              ? 0
              : round2((totals.avoidedCount / considered) * 100),
        };
      })
      .sort((left, right) => right.totalSaved - left.totalSaved);
  } catch (error) {
    console.error("Failed to load habit stats:", error);
    return [];
  }
}

function emptyWorkspaceMemberSpendingStats(
  members: Awaited<ReturnType<typeof getCurrentWorkspaceMembers>>,
): WorkspaceMemberSpendingStatsItem[] {
  return members.map((member) => ({
    userId: member.userId,
    label: member.label,
    totalPaidByUser: 0,
    personalSpending: 0,
    sharedSpending: 0,
  }));
}

function toMemberSpendingEntries(
  entries: Array<{
    realCost: unknown;
    paidByUserId: string | null;
    beneficiaries: Array<{ userId: string }>;
  }>,
): MemberSpendingEntry[] {
  return entries.map((entry) => ({
    realCost: toNumber(entry.realCost),
    paidByUserId: entry.paidByUserId,
    beneficiaryUserIds: entry.beneficiaries.map(
      (beneficiary) => beneficiary.userId,
    ),
  }));
}

export async function getWorkspaceMemberSpendingStats(
  memberUserId?: string,
): Promise<WorkspaceMemberSpendingStatsItem[]> {
  try {
    const [members, entries] = await Promise.all([
      getCurrentWorkspaceMembers(),
      prisma.entry.findMany({
        where: await buildEntryWhere(memberUserId),
        select: {
          realCost: true,
          paidByUserId: true,
          beneficiaries: {
            select: {
              userId: true,
            },
          },
        },
      }),
    ]);

    const totalsByUserId = aggregateMemberSpendingStats(
      members.map((member) => member.userId),
      toMemberSpendingEntries(entries),
    );

    return members.map((member) => {
      const totals = totalsByUserId.get(member.userId);

      return {
        userId: member.userId,
        label: member.label,
        totalPaidByUser: totals?.totalPaidByUser ?? 0,
        personalSpending: totals?.personalSpending ?? 0,
        sharedSpending: totals?.sharedSpending ?? 0,
      };
    });
  } catch (error) {
    console.error("Failed to load workspace member spending stats:", error);

    try {
      const members = await getCurrentWorkspaceMembers();
      return emptyWorkspaceMemberSpendingStats(members);
    } catch {
      return [];
    }
  }
}
