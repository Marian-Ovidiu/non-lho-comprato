"use server";

import type { Prisma } from "@/src/lib/generated/prisma/client";
import { formatMoney } from "@/src/lib/formatters";
import { getEntryExpenseKind } from "@/src/lib/entry-ownership";
import { prisma } from "@/src/lib/prisma";
import {
  buildRomeStreakResult,
  formatRomeMonthLabel,
  getPreviousRomeMonthKey,
  getRomeDateKey,
  getRomeMonthRangeForMonthKey,
  normalizeRomeMonthKey,
} from "@/src/lib/rome-dates";
import {
  getCurrentWorkspaceId,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceScopedWhere,
} from "@/src/lib/workspace-context";
import { getWorkspaceMemberSlots } from "@/src/lib/member-slots";
import { getMemberLabel, resolveEntryPeopleFromRecord } from "@/src/lib/workspace-members";

type DecimalLike = {
  toString?: () => string;
};

export type MonthlyReportMonthOption = {
  value: string;
  label: string;
};

export type MonthlyReportOverview = {
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
  savingRatePercent: number;
};

export type MonthlyReportMemberSummary = {
  userId: string | null;
  label: string;
  totalRealSpent: number;
  totalSaved: number;
  entriesCount: number;
};

export type MonthlyReportMemberSplit = {
  primary: MonthlyReportMemberSummary;
  secondary: MonthlyReportMemberSummary;
  shared: MonthlyReportMemberSummary;
  total: MonthlyReportMemberSummary;
};

export type MonthlyReportBestCategory = {
  name: string;
  totalRealSpent: number;
  totalSaved: number;
  entriesCount: number;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
} | null;

export type MonthlyReportWorstCategory = {
  name: string;
  totalRealSpent: number;
  entriesCount: number;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
} | null;

export type MonthlyReportBiggestSaving = {
  id: string;
  title: string;
  savedAmount: number;
  date: string;
  ownershipLabel: string;
  categoryName: string;
  realCost: number;
  alternativeCost: number;
  note: string | null;
} | null;

export type MonthlyReportCategory = {
  id: string;
  name: string;
  slug: string | null;
};

export type MonthlyReportEntry = {
  id: string;
  title: string;
  date: string;
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  note: string | null;
  source: string;
  person: string;
  paidByUserId: string | null;
  beneficiaries: Array<{
    userId: string;
  }>;
  category: MonthlyReportCategory;
};

export type MonthlyReportMember = {
  userId: string;
  label: string;
  name: string | null;
  email: string | null;
};

export type MonthlyReportHabitSummary = {
  totalOccurrences: number;
  completed: number;
  skipped: number;
  skippedCount: number;
  totalHabits: number;
  spentCount: number;
  avoidedCount: number;
  pendingCount: number;
  totalSaved: number;
  disciplineRatePercent: number;
};

export type MonthlyReportStreakSummary = {
  bestStreak: number;
  currentStreak: number;
  streakDates: string[];
  savedDaysCount: number;
};

export type MonthlyReportData = {
  month: string;
  label: string;
  entries: MonthlyReportEntry[];
  previousMonthEntries: MonthlyReportEntry[];
  members: MonthlyReportMember[];
  overview: MonthlyReportOverview;
  memberSplit: MonthlyReportMemberSplit;
  bestCategory: MonthlyReportBestCategory;
  worstCategory: MonthlyReportWorstCategory;
  biggestSaving: MonthlyReportBiggestSaving;
  streakSummary: MonthlyReportStreakSummary;
  habitsSummary: MonthlyReportHabitSummary;
  recapText: string;
  hasData: boolean;
  // compatibility aliases used by the current UI
  monthKey: string;
  monthLabel: string;
  recap: string;
  habitSummary: MonthlyReportHabitSummary;
};

export type MonthlyReportPageData = {
  selectedMonth: string;
  selectedMonthLabel: string;
  monthOptions: MonthlyReportMonthOption[];
  report: MonthlyReportData;
};

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

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeMonthKey(input?: string): string {
  return normalizeRomeMonthKey(input);
}

function getPreviousMonthKey(monthKey: string): string {
  return getPreviousRomeMonthKey(monthKey);
}

function formatMonthLabel(monthKey: string): string {
  return formatRomeMonthLabel(monthKey);
}

function buildMonthOptionsFromKeys(monthKeys: string[]): MonthlyReportMonthOption[] {
  const currentMonth = normalizeMonthKey();
  const uniqueMonthKeys = new Set(
    monthKeys.filter((monthKey) => /^\d{4}-\d{2}$/.test(monthKey)),
  );
  uniqueMonthKeys.add(currentMonth);

  return Array.from(uniqueMonthKeys)
    .sort((left, right) => right.localeCompare(left))
    .map((value) => ({
      value,
      label: formatMonthLabel(value),
    }));
}

function ensureSelectedMonthOption(
  options: MonthlyReportMonthOption[],
  selectedMonth: string,
): MonthlyReportMonthOption[] {
  if (options.some((option) => option.value === selectedMonth)) {
    return options;
  }

  return [
    {
      value: selectedMonth,
      label: formatMonthLabel(selectedMonth),
    },
    ...options,
  ];
}

function serializeMonthlyReportEntry(entry: {
  id: string;
  title: string;
  date: Date;
  realCost: unknown;
  alternativeCost: unknown;
  savedAmount: unknown;
  note: string | null;
  source: string;
  person: string;
  paidByUserId: string | null;
  beneficiaries: Array<{ userId: string }>;
  category: {
    id: string;
    name: string;
    slug: string | null;
  };
}): MonthlyReportEntry {
  return {
    id: entry.id,
    title: entry.title,
    date: entry.date.toISOString(),
    realCost: toNumber(entry.realCost),
    alternativeCost: toNumber(entry.alternativeCost),
    savedAmount: toNumber(entry.savedAmount),
    note: entry.note,
    source: entry.source,
    person: entry.person,
    paidByUserId: entry.paidByUserId,
    beneficiaries: entry.beneficiaries.map((beneficiary) => ({
      userId: beneficiary.userId,
    })),
    category: {
      id: entry.category.id,
      name: entry.category.name,
      slug: entry.category.slug,
    },
  };
}

async function buildEntryWhere(monthKey: string): Promise<Prisma.EntryWhereInput> {
  const { start, end } = getRomeMonthRangeForMonthKey(monthKey);

  return getCurrentWorkspaceScopedWhere({
    date: {
      gte: start,
      lt: end,
    },
  });
}

async function buildHabitOccurrenceWhere(monthKey: string): Promise<Prisma.HabitOccurrenceWhereInput> {
  const { start, end } = getRomeMonthRangeForMonthKey(monthKey);
  const workspaceWhere = await getCurrentWorkspaceScopedWhere();

  return {
    date: {
      gte: start,
      lt: end,
    },
    habit: {
      is: workspaceWhere,
    },
  };
}

function createMonthlyReportMemberSummary(
  userId: string | null,
  label: string,
  totalRealSpent = 0,
  totalSaved = 0,
  entriesCount = 0,
): MonthlyReportMemberSummary {
  return {
    userId,
    label,
    totalRealSpent: round2(totalRealSpent),
    totalSaved: round2(totalSaved),
    entriesCount,
  };
}

function getEntryOwnershipLabelFromMembers(
  entry: {
    paidByUserId: string | null;
    beneficiaries: Array<{ userId: string }>;
  },
  members: Awaited<ReturnType<typeof getCurrentWorkspaceMembers>>,
): string {
  const resolved = resolveEntryPeopleFromRecord(entry, members);
  const expenseKind = getEntryExpenseKind(resolved.beneficiaryUserIds);

  if (expenseKind === "shared") {
    return "Condivise";
  }

  const soleUserId = resolved.beneficiaryUserIds[0] ?? resolved.paidByUserId;
  return getMemberLabel(members, soleUserId) ?? "Membro";
}

function buildMemberSplit(
  entries: Array<{
    paidByUserId: string | null;
    beneficiaries: Array<{ userId: string }>;
    realCost: unknown;
    savedAmount: unknown;
  }>,
  members: Awaited<ReturnType<typeof getCurrentWorkspaceMembers>>,
  totalRealSpent: number,
  totalSaved: number,
  entriesCount: number,
): MonthlyReportMemberSplit {
  const slots = getWorkspaceMemberSlots(members);
  const primaryLabel = getMemberLabel(members, slots.primaryUserId) ?? "Membro";
  const secondaryLabel =
    getMemberLabel(members, slots.secondaryUserId) ?? "Membro";

  const primary = createMonthlyReportMemberSummary(
    slots.primaryUserId,
    primaryLabel,
  );
  const secondary = createMonthlyReportMemberSummary(
    slots.secondaryUserId,
    secondaryLabel,
  );
  const shared = createMonthlyReportMemberSummary(null, "Condivise");

  for (const entry of entries) {
    const resolved = resolveEntryPeopleFromRecord(entry, members);
    const expenseKind = getEntryExpenseKind(resolved.beneficiaryUserIds);
    const realCost = toNumber(entry.realCost);
    const savedAmount = toNumber(entry.savedAmount);

    if (expenseKind === "shared") {
      shared.totalRealSpent = round2(shared.totalRealSpent + realCost);
      shared.totalSaved = round2(shared.totalSaved + savedAmount);
      shared.entriesCount += 1;
      continue;
    }

    const beneficiaryUserId =
      resolved.beneficiaryUserIds[0] ?? resolved.paidByUserId;

    if (beneficiaryUserId && beneficiaryUserId === slots.secondaryUserId) {
      secondary.totalRealSpent = round2(secondary.totalRealSpent + realCost);
      secondary.totalSaved = round2(secondary.totalSaved + savedAmount);
      secondary.entriesCount += 1;
      continue;
    }

    primary.totalRealSpent = round2(primary.totalRealSpent + realCost);
    primary.totalSaved = round2(primary.totalSaved + savedAmount);
    primary.entriesCount += 1;
  }

  return {
    primary,
    secondary,
    shared,
    total: createMonthlyReportMemberSummary(
      null,
      "Totale",
      totalRealSpent,
      totalSaved,
      entriesCount,
    ),
  };
}

function buildStreakSummary(dayTotals: Map<string, number>): MonthlyReportStreakSummary {
  const streak = buildRomeStreakResult(dayTotals.keys());

  return {
    ...streak,
    savedDaysCount: Array.from(dayTotals.keys()).length,
  };
}

function buildEmptyReport(
  monthKey: string,
  members: Awaited<ReturnType<typeof getCurrentWorkspaceMembers>>,
): MonthlyReportData {
  const memberSplit = buildMemberSplit([], members, 0, 0, 0);

  return {
    month: monthKey,
    label: formatMonthLabel(monthKey),
    entries: [],
    previousMonthEntries: [],
    members: members.map((member) => ({
      userId: member.userId,
      label: member.label,
      name: member.name,
      email: member.email,
    })),
    overview: {
      totalRealSpent: 0,
      totalAlternativeCost: 0,
      totalSaved: 0,
      entriesCount: 0,
      savingRatePercent: 0,
    },
    memberSplit,
    bestCategory: null,
    worstCategory: null,
    biggestSaving: null,
    streakSummary: {
      currentStreak: 0,
      bestStreak: 0,
      streakDates: [],
      savedDaysCount: 0,
    },
    habitsSummary: {
      totalOccurrences: 0,
      completed: 0,
      skipped: 0,
      skippedCount: 0,
      totalHabits: 0,
      spentCount: 0,
      avoidedCount: 0,
      pendingCount: 0,
      totalSaved: 0,
      disciplineRatePercent: 0,
    },
    recapText: `Nessun dato disponibile per ${formatMonthLabel(monthKey).toLowerCase()}.`,
    hasData: false,
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    recap: `Nessun dato disponibile per ${formatMonthLabel(monthKey).toLowerCase()}.`,
    habitSummary: {
      totalOccurrences: 0,
      completed: 0,
      skipped: 0,
      skippedCount: 0,
      totalHabits: 0,
      spentCount: 0,
      avoidedCount: 0,
      pendingCount: 0,
      totalSaved: 0,
      disciplineRatePercent: 0,
    },
  };
}

export async function getAvailableReportMonths(): Promise<MonthlyReportMonthOption[]> {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    const rows = await prisma.$queryRaw<Array<{ month: string }>>`
      SELECT DISTINCT to_char("date" AT TIME ZONE 'Europe/Rome', 'YYYY-MM') AS month
      FROM "Entry"
      WHERE "workspaceId" = ${workspaceId}
      ORDER BY month DESC
    `;

    return buildMonthOptionsFromKeys(rows.map((row) => row.month));
  } catch (error) {
    console.error("Failed to load available report months:", error);
    return [];
  }
}

export async function getMonthlyReport(
  requestedMonth?: string,
  availableMonths?: MonthlyReportMonthOption[],
): Promise<MonthlyReportPageData> {
  const selectedMonth = normalizeMonthKey(requestedMonth);
  const previousMonth = getPreviousMonthKey(selectedMonth);

  try {
    const members = await getCurrentWorkspaceMembers();
    const entryWhere = await buildEntryWhere(selectedMonth);
    const previousEntryWhere = await buildEntryWhere(previousMonth);
    const habitOccurrenceWhere = await buildHabitOccurrenceWhere(selectedMonth);

    const [monthEntries, previousMonthEntries] = await Promise.all([
      prisma.entry.findMany({
        where: entryWhere,
        select: {
          id: true,
          title: true,
          date: true,
          realCost: true,
          alternativeCost: true,
          savedAmount: true,
          note: true,
          source: true,
          person: true,
          paidByUserId: true,
          beneficiaries: {
            select: {
              userId: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      }),
      prisma.entry.findMany({
        where: previousEntryWhere,
        select: {
          id: true,
          title: true,
          date: true,
          realCost: true,
          alternativeCost: true,
          savedAmount: true,
          note: true,
          source: true,
          person: true,
          paidByUserId: true,
          beneficiaries: {
            select: {
              userId: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      }),
    ]);

    const resolvedAvailableMonths =
      availableMonths ?? (await getAvailableReportMonths());
    const monthOptions = ensureSelectedMonthOption(
      resolvedAvailableMonths,
      selectedMonth,
    );

    const monthOccurrences = await prisma.habitOccurrence.findMany({
      where: habitOccurrenceWhere,
      select: {
        status: true,
        habitId: true,
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

    if (monthEntries.length === 0 && monthOccurrences.length === 0) {
      return {
        selectedMonth,
        selectedMonthLabel: formatMonthLabel(selectedMonth),
        monthOptions,
        report: buildEmptyReport(selectedMonth, members),
      };
    }

    const totalRealSpent = round2(
      monthEntries.reduce((total, entry) => total + toNumber(entry.realCost), 0),
    );
    const totalAlternativeCost = round2(
      monthEntries.reduce(
        (total, entry) => total + toNumber(entry.alternativeCost),
        0,
      ),
    );
    const totalSaved = round2(
      monthEntries.reduce((total, entry) => total + toNumber(entry.savedAmount), 0),
    );
    const entriesCount = monthEntries.length;
    const savingRatePercent =
      totalAlternativeCost === 0
        ? 0
        : round2((totalSaved / totalAlternativeCost) * 100);

    const memberSplit = buildMemberSplit(
      monthEntries,
      members,
      totalRealSpent,
      totalSaved,
      entriesCount,
    );

    const categoryMap = new Map<
      string,
      {
        categoryName: string;
        categorySlug: string;
        totalRealSpent: number;
        totalSaved: number;
        entriesCount: number;
      }
    >();

    let biggestSaving: MonthlyReportBiggestSaving = null;

    for (const entry of monthEntries) {
      const current = categoryMap.get(entry.category.slug) ?? {
        categoryName: entry.category.name,
        categorySlug: entry.category.slug,
        totalRealSpent: 0,
        totalSaved: 0,
        entriesCount: 0,
      };

      current.totalRealSpent = round2(
        current.totalRealSpent + toNumber(entry.realCost),
      );
      current.totalSaved = round2(current.totalSaved + toNumber(entry.savedAmount));
      current.entriesCount += 1;
      categoryMap.set(entry.category.slug, current);

      if (
        toNumber(entry.savedAmount) > 0 &&
        (!biggestSaving ||
          toNumber(entry.savedAmount) > biggestSaving.savedAmount)
      ) {
        biggestSaving = {
          id: entry.id,
          title: entry.title,
          categoryName: entry.category.name,
          date: entry.date.toISOString(),
          realCost: toNumber(entry.realCost),
          alternativeCost: toNumber(entry.alternativeCost),
          savedAmount: toNumber(entry.savedAmount),
          ownershipLabel: getEntryOwnershipLabelFromMembers(entry, members),
          note: entry.note,
        };
      }
    }

    const bestCategory =
      categoryMap.size === 0
        ? null
        : Array.from(categoryMap.entries())
            .map(([categoryId, totals]) => ({
              categoryId,
              categoryName: totals.categoryName,
              categorySlug: totals.categorySlug,
              totalRealSpent: totals.totalRealSpent,
              totalSaved: totals.totalSaved,
              entriesCount: totals.entriesCount,
              name: totals.categoryName,
            }))
            .filter((category) => category.totalSaved > 0)
            .sort((left, right) => {
              if (right.totalSaved !== left.totalSaved) {
                return right.totalSaved - left.totalSaved;
              }

              return right.entriesCount - left.entriesCount;
            })[0] ?? null;

    const worstCategory =
      categoryMap.size === 0
        ? null
        : Array.from(categoryMap.entries())
            .map(([categoryId, totals]) => ({
              categoryId,
              categoryName: totals.categoryName,
              categorySlug: totals.categorySlug,
              totalRealSpent: totals.totalRealSpent,
              entriesCount: totals.entriesCount,
              name: totals.categoryName,
            }))
            .sort((left, right) => {
              if (right.totalRealSpent !== left.totalRealSpent) {
                return right.totalRealSpent - left.totalRealSpent;
              }

              return right.entriesCount - left.entriesCount;
            })[0] ?? null;

    const habitsSummary: MonthlyReportHabitSummary = monthOccurrences.reduce(
      (summary, occurrence) => {
        summary.totalOccurrences += 1;

        switch (occurrence.status) {
          case "spent":
            summary.spentCount += 1;
            break;
          case "avoided":
            summary.avoidedCount += 1;
            summary.totalSaved = round2(
              summary.totalSaved + toNumber(occurrence.habit.amount),
            );
            break;
          case "skipped":
            summary.skipped += 1;
            summary.skippedCount += 1;
            break;
          default:
            summary.pendingCount += 1;
            break;
        }

        return summary;
      },
      {
        totalOccurrences: 0,
        completed: 0,
        skipped: 0,
        skippedCount: 0,
        totalHabits: 0,
        spentCount: 0,
        avoidedCount: 0,
        pendingCount: 0,
        totalSaved: 0,
        disciplineRatePercent: 0,
      },
    );

    habitsSummary.totalHabits = new Set(
      monthOccurrences.map((item) => item.habitId),
    ).size;
    habitsSummary.completed =
      habitsSummary.avoidedCount + habitsSummary.spentCount;
    habitsSummary.disciplineRatePercent =
      habitsSummary.avoidedCount + habitsSummary.spentCount === 0
        ? 0
        : round2(
            (habitsSummary.avoidedCount /
              (habitsSummary.avoidedCount + habitsSummary.spentCount)) *
              100,
          );

    const dayTotals = new Map<string, number>();
    for (const entry of monthEntries) {
      const dateKey = getRomeDateKey(entry.date);
      if (!dateKey) {
        continue;
      }

      const currentTotal = dayTotals.get(dateKey) ?? 0;
      dayTotals.set(dateKey, round2(currentTotal + toNumber(entry.realCost)));
    }

    const streakSummary = buildStreakSummary(dayTotals);
    const monthLabel = formatMonthLabel(selectedMonth);
    const monthLower = monthLabel.toLowerCase();
    const serializedMonthEntries = monthEntries.map(serializeMonthlyReportEntry);
    const serializedPreviousMonthEntries = previousMonthEntries.map(
      serializeMonthlyReportEntry,
    );

    const recapParts = [
      `A ${monthLower} avete speso ${formatMoney(totalRealSpent)} in ${entriesCount} movimenti.`,
      `Spesa per membro: ${memberSplit.primary.label} ${formatMoney(
        memberSplit.primary.totalRealSpent,
      )}, ${memberSplit.secondary.label} ${formatMoney(
        memberSplit.secondary.totalRealSpent,
      )}, ${memberSplit.shared.label} ${formatMoney(memberSplit.shared.totalRealSpent)}.`,
      worstCategory
        ? `La categoria con più spesa è stata ${worstCategory.categoryName}.`
        : "Nessuna categoria si è distinta per spesa questo mese.",
      totalSaved > 0
        ? `Risparmiato/evitato: ${formatMoney(totalSaved)}.`
        : "Nessun risparmio positivo da segnalare.",
      bestCategory && bestCategory.totalSaved > 0
        ? `Dove avete evitato di più: ${bestCategory.categoryName}.`
        : "Nessuna categoria si è distinta per risparmio questo mese.",
      biggestSaving
        ? `Il risparmio più alto: ${biggestSaving.title} (+${formatMoney(
            biggestSaving.savedAmount,
          )}).`
        : "Nessun risparmio positivo rilevante da segnalare.",
    ];

    return {
      selectedMonth,
      selectedMonthLabel: monthLabel,
      monthOptions,
      report: {
        month: selectedMonth,
        label: monthLabel,
        monthKey: selectedMonth,
        monthLabel,
        hasData: true,
        entries: serializedMonthEntries,
        previousMonthEntries: serializedPreviousMonthEntries,
        members: members.map((member) => ({
          userId: member.userId,
          label: member.label,
          name: member.name,
          email: member.email,
        })),
        overview: {
          totalRealSpent,
          totalAlternativeCost,
          totalSaved,
          entriesCount,
          savingRatePercent,
        },
        memberSplit,
        bestCategory,
        worstCategory,
        biggestSaving,
        streakSummary,
        habitsSummary,
        recapText: recapParts.join(" "),
        recap: recapParts.join(" "),
        habitSummary: habitsSummary,
      },
    };
  } catch (error) {
    console.error("Failed to load monthly report:", error);
    const monthOptions = ensureSelectedMonthOption([], selectedMonth);
    const members = await getCurrentWorkspaceMembers().catch(() => []);

    return {
      selectedMonth,
      selectedMonthLabel: formatMonthLabel(selectedMonth),
      monthOptions,
      report: buildEmptyReport(selectedMonth, members),
    };
  }
}
