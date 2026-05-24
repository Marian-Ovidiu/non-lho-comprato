import { getWorkspaceMemberSlots } from "@/src/lib/member-slots";
import { getMemberLabel, type WorkspaceMemberOption } from "@/src/lib/workspace-members";

export type MonthlyReportAnalyticsEntry = {
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
  category: {
    id: string;
    name: string;
    slug: string | null;
  };
};

export type MonthlyReportAnalyticsCategory = {
  id: string;
  name: string;
  slug: string | null;
  color?: string | null;
  icon?: string | null;
};

export type MonthlyReportAnalyticsOverview = {
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
  savingRatePercent: number;
};

export type MonthlyReportAnalyticsCategorySummary = {
  categoryId: string;
  categorySlug: string | null;
  categoryName: string;
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
  averageSaved: number;
};

export type MonthlyReportAnalyticsBiggestSaving = {
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

export type MonthlyReportAnalyticsBestCategory = {
  name: string;
  totalSaved: number;
  entriesCount: number;
  categoryId: string;
  categorySlug: string | null;
  categoryName: string;
} | null;

export type MonthlyReportAnalyticsWorstCategory = {
  name: string;
  totalRealSpent: number;
  entriesCount: number;
  categoryId: string;
  categorySlug: string | null;
  categoryName: string;
} | null;

export type MonthlyReportAnalyticsUser = {
  userId: string;
  label: string;
  personalSpend: number;
  sharedSpend: number;
  totalPaid: number;
  sharedPercentage: number;
  previousMonthTotal: number | null;
  differenceVsPreviousMonth: number | null;
  balanceRatio: number;
  balanceLabel: string;
};

export type MonthlyReportAnalyticsSnapshot = {
  overview: MonthlyReportAnalyticsOverview;
  users: MonthlyReportAnalyticsUser[];
  categoriesByFrequency: MonthlyReportAnalyticsCategorySummary[];
  categoriesBySpend: MonthlyReportAnalyticsCategorySummary[];
  bestCategory: MonthlyReportAnalyticsBestCategory;
  worstCategory: MonthlyReportAnalyticsWorstCategory;
  biggestSaving: MonthlyReportAnalyticsBiggestSaving;
  hasData: boolean;
  totalPaidByWorkspace: number;
  workspaceAverageTotal: number;
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
    const decimal = value as { toString?: () => string };

    if (typeof decimal.toString === "function") {
      const parsed = Number(decimal.toString().replace(",", "."));
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  return 0;
}

function normalizeCategoryName(value?: string | null): string {
  const trimmed = value?.trim();

  if (trimmed) {
    return trimmed;
  }

  return "Categoria eliminata";
}

function getMemberFallbackUserId(
  members: WorkspaceMemberOption[],
): string | null {
  return members[0]?.userId ?? null;
}

function resolvePayerUserId(
  entry: MonthlyReportAnalyticsEntry,
  members: WorkspaceMemberOption[],
): string | null {
  const memberIds = new Set(members.map((member) => member.userId));
  const slots = getWorkspaceMemberSlots(members);

  if (entry.paidByUserId && memberIds.has(entry.paidByUserId)) {
    return entry.paidByUserId;
  }

  if (entry.person === "MARTINA") {
    return slots.secondaryUserId ?? slots.primaryUserId ?? getMemberFallbackUserId(members);
  }

  if (entry.person === "TUTTI") {
    return slots.primaryUserId ?? slots.secondaryUserId ?? getMemberFallbackUserId(members);
  }

  if (entry.person === "MARIAN") {
    return slots.primaryUserId ?? slots.secondaryUserId ?? getMemberFallbackUserId(members);
  }

  return slots.primaryUserId ?? slots.secondaryUserId ?? getMemberFallbackUserId(members);
}

function resolveBeneficiaryUserIds(
  entry: MonthlyReportAnalyticsEntry,
  payerUserId: string | null,
): string[] {
  const explicitBeneficiaries = Array.from(
    new Set(
      entry.beneficiaries
        .map((beneficiary) => beneficiary.userId.trim())
        .filter(Boolean),
    ),
  );

  if (explicitBeneficiaries.length > 0) {
    return explicitBeneficiaries;
  }

  return payerUserId ? [payerUserId] : [];
}

function getBalanceLabel(balanceRatio: number): string {
  if (balanceRatio > 1.1) {
    return "Sopra la media del workspace";
  }

  if (balanceRatio < 0.9) {
    return "Sotto la media del workspace";
  }

  return "In equilibrio";
}

function buildEmptySnapshot(
  members: WorkspaceMemberOption[],
): MonthlyReportAnalyticsSnapshot {
  const users = members.map((member) => ({
    userId: member.userId,
    label: member.label,
    personalSpend: 0,
    sharedSpend: 0,
    totalPaid: 0,
    sharedPercentage: 0,
    previousMonthTotal: null,
    differenceVsPreviousMonth: null,
    balanceRatio: 1,
    balanceLabel: "In equilibrio",
  }));

  return {
    overview: {
      totalRealSpent: 0,
      totalAlternativeCost: 0,
      totalSaved: 0,
      entriesCount: 0,
      savingRatePercent: 0,
    },
    users,
    categoriesByFrequency: [],
    categoriesBySpend: [],
    bestCategory: null,
    worstCategory: null,
    biggestSaving: null,
    hasData: false,
    totalPaidByWorkspace: 0,
    workspaceAverageTotal: 0,
  };
}

function sortCategoriesBySaved(
  categories: MonthlyReportAnalyticsCategorySummary[],
): MonthlyReportAnalyticsCategorySummary[] {
  return [...categories].sort((left, right) => {
    if (right.totalSaved !== left.totalSaved) {
      return right.totalSaved - left.totalSaved;
    }

    if (right.entriesCount !== left.entriesCount) {
      return right.entriesCount - left.entriesCount;
    }

    return left.categoryName.localeCompare(right.categoryName, "it");
  });
}

type MonthlyReportAnalyticsSavingCandidate = NonNullable<MonthlyReportAnalyticsBiggestSaving>;

export function buildMonthlyReportAnalyticsSnapshot(
  entries: MonthlyReportAnalyticsEntry[],
  previousEntries: MonthlyReportAnalyticsEntry[],
  members: WorkspaceMemberOption[],
): MonthlyReportAnalyticsSnapshot {
  if (members.length === 0) {
    return buildEmptySnapshot([]);
  }

  const totalsByUserId = new Map(
    members.map((member) => [
      member.userId,
      {
        userId: member.userId,
        label: member.label,
        personalSpend: 0,
        sharedSpend: 0,
        totalPaid: 0,
        previousMonthTotal: null as number | null,
      },
    ]),
  );

  const categoryMap = new Map<string, MonthlyReportAnalyticsCategorySummary>();
  const biggestSavingCandidates: MonthlyReportAnalyticsSavingCandidate[] = [];

  for (const entry of entries) {
    const realCost = round2(toNumber(entry.realCost));
    const alternativeCost = round2(toNumber(entry.alternativeCost));
    const savedAmount = round2(toNumber(entry.savedAmount));
    const categoryId = entry.category.id || entry.category.slug || entry.category.name;
    const categoryName = normalizeCategoryName(entry.category.name);
    const categorySlug = entry.category.slug;

    const categoryTotals = categoryMap.get(categoryId) ?? {
      categoryId,
      categorySlug,
      categoryName,
      totalRealSpent: 0,
      totalAlternativeCost: 0,
      totalSaved: 0,
      entriesCount: 0,
      averageSaved: 0,
    };

    categoryTotals.totalRealSpent = round2(
      categoryTotals.totalRealSpent + realCost,
    );
    categoryTotals.totalAlternativeCost = round2(
      categoryTotals.totalAlternativeCost + alternativeCost,
    );
    categoryTotals.totalSaved = round2(categoryTotals.totalSaved + savedAmount);
    categoryTotals.entriesCount += 1;
    categoryMap.set(categoryId, categoryTotals);

    const payerUserId = resolvePayerUserId(entry, members);
    const beneficiaryUserIds = resolveBeneficiaryUserIds(entry, payerUserId);
    const isPersonalExpense =
      beneficiaryUserIds.length === 1 &&
      payerUserId !== null &&
      beneficiaryUserIds[0] === payerUserId &&
      entry.person !== "TUTTI";

    if (payerUserId) {
      const totals = totalsByUserId.get(payerUserId);

      if (totals) {
        totals.totalPaid = round2(totals.totalPaid + realCost);

        if (isPersonalExpense) {
          totals.personalSpend = round2(totals.personalSpend + realCost);
        } else {
          totals.sharedSpend = round2(totals.sharedSpend + realCost);
        }
      }
    }

    biggestSavingCandidates.push({
      id: entry.id,
      title: entry.title,
      savedAmount,
      date: entry.date,
      ownershipLabel:
        payerUserId && members.find((member) => member.userId === payerUserId)
          ? getMemberLabel(members, payerUserId) ?? "Membro"
          : "Membro",
      categoryName,
      realCost,
      alternativeCost,
      note: entry.note,
    });
  }

  const previousTotalsByUserId = new Map<string, number>();
  for (const entry of previousEntries) {
    const realCost = round2(toNumber(entry.realCost));
    const payerUserId = resolvePayerUserId(entry, members);

    if (!payerUserId) {
      continue;
    }

    previousTotalsByUserId.set(
      payerUserId,
      round2((previousTotalsByUserId.get(payerUserId) ?? 0) + realCost),
    );
  }

  const totalRealSpent = round2(
    entries.reduce((total, entry) => total + toNumber(entry.realCost), 0),
  );
  const totalAlternativeCost = round2(
    entries.reduce((total, entry) => total + toNumber(entry.alternativeCost), 0),
  );
  const totalSaved = round2(
    entries.reduce((total, entry) => total + toNumber(entry.savedAmount), 0),
  );
  const entriesCount = entries.length;
  const savingRatePercent =
    totalAlternativeCost === 0
      ? 0
      : round2((totalSaved / totalAlternativeCost) * 100);
  const totalPaidByWorkspace = round2(
    Array.from(totalsByUserId.values()).reduce(
      (total, item) => total + item.totalPaid,
      0,
    ),
  );
  const workspaceAverageTotal =
    members.length > 0 ? round2(totalPaidByWorkspace / members.length) : 0;
  const hasPreviousData = previousEntries.length > 0;

  const users = members.map((member) => {
    const totals = totalsByUserId.get(member.userId);
    const totalPaid = totals?.totalPaid ?? 0;
    const sharedSpend = totals?.sharedSpend ?? 0;
    const personalSpend = totals?.personalSpend ?? 0;
    const previousMonthTotal = hasPreviousData
      ? round2(previousTotalsByUserId.get(member.userId) ?? 0)
      : null;
    const differenceVsPreviousMonth =
      previousMonthTotal !== null ? round2(totalPaid - previousMonthTotal) : null;
    const balanceRatio =
      workspaceAverageTotal > 0 ? round2(totalPaid / workspaceAverageTotal) : 1;

    return {
      userId: member.userId,
      label: member.label,
      personalSpend,
      sharedSpend,
      totalPaid,
      sharedPercentage:
        totalPaid > 0 ? round2(sharedSpend / totalPaid) : 0,
      previousMonthTotal,
      differenceVsPreviousMonth,
      balanceRatio,
      balanceLabel: getBalanceLabel(balanceRatio),
    };
  });

  const categoriesByFrequency = sortCategoriesBySaved(
    Array.from(categoryMap.values()).map((category) => ({
      ...category,
      averageSaved:
        category.entriesCount > 0
          ? round2(category.totalSaved / category.entriesCount)
          : 0,
    })),
  );

  const categoriesBySpend = [...categoriesByFrequency].sort((left, right) => {
    if (right.totalRealSpent !== left.totalRealSpent) {
      return right.totalRealSpent - left.totalRealSpent;
    }

    if (right.totalSaved !== left.totalSaved) {
      return right.totalSaved - left.totalSaved;
    }

    return left.categoryName.localeCompare(right.categoryName, "it");
  });

  const topSavedCategory = categoriesByFrequency[0] ?? null;
  const topSpentCategory = categoriesBySpend[0] ?? null;

  const bestCategory = topSavedCategory
    ? {
        name: topSavedCategory.categoryName,
        totalSaved: topSavedCategory.totalSaved,
        entriesCount: topSavedCategory.entriesCount,
        categoryId: topSavedCategory.categoryId,
        categorySlug: topSavedCategory.categorySlug,
        categoryName: topSavedCategory.categoryName,
      }
    : null;

  const worstCategory = topSpentCategory
    ? {
        name: topSpentCategory.categoryName,
        totalRealSpent: topSpentCategory.totalRealSpent,
        entriesCount: topSpentCategory.entriesCount,
        categoryId: topSpentCategory.categoryId,
        categorySlug: topSpentCategory.categorySlug,
        categoryName: topSpentCategory.categoryName,
      }
    : null;

  const biggestSaving =
    biggestSavingCandidates.sort(
      (left, right) =>
        right.savedAmount - left.savedAmount ||
        right.realCost - left.realCost ||
        left.title.localeCompare(right.title, "it"),
    )[0] ?? null;

  return {
    overview: {
      totalRealSpent,
      totalAlternativeCost,
      totalSaved,
      entriesCount,
      savingRatePercent,
    },
    users: users.sort(
      (left, right) =>
        right.totalPaid - left.totalPaid || left.label.localeCompare(right.label, "it"),
    ),
    categoriesByFrequency,
    categoriesBySpend,
    bestCategory,
    worstCategory,
    biggestSaving,
    hasData: entriesCount > 0,
    totalPaidByWorkspace,
    workspaceAverageTotal,
  };
}
