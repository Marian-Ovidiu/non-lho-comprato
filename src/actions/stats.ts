"use server";

import {
  buildSavingCategoryInsight,
  buildSpendingCategoryInsight,
  buildSpendingTrendInsight,
  type CategoryStatsItem,
  type MonthlyStatsItem,
  type StatsInsight,
  type StatsMonthlyCategoryRow,
} from "@/src/features/stats/insights";

export type { StatsInsight } from "@/src/features/stats/insights";

import { round2, toMoneyNumber as toNumber } from "@/src/lib/money-number";
import { getTranslations, languageToLocale } from "@/src/lib/i18n";
import { Prisma } from "@/src/lib/generated/prisma/client";
import { EntrySource } from "@/src/lib/generated/prisma/enums";
import { buildWorkspaceMemberEntryWhere } from "@/src/lib/workspace-member-filter";
import { logAndRethrowDataLoadError } from "@/src/lib/data-load-error";
import { prisma } from "@/src/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import {
  getCurrentWorkspaceId,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceScopedWhere,
  getCurrentWorkspaceLanguage,
  getCurrentWorkspaceTimezone,
} from "@/src/lib/workspace-context";
import {
  buildDailySpendingComparisonFromRows,
  type DailySpendingComparison,
} from "@/src/lib/daily-spending-comparison";
import { getMonthRangeForMonthKey } from "@/src/lib/workspace-dates";
import { overviewFromAggregate, type StatsOverview } from "@/src/lib/stats-overview";
import {
  entryLocalTimestampSql,
  entryMetricAggregateSelectSql,
  entryMetricDateRangeSql,
  entryMetricMemberFilterSql,
  entryNetImpactSql,
  normalizeEntryMetricAggregate,
  toMetricNumber,
  type EntryMetricAggregateRow,
  type EntryMetricDateRange,
} from "@/src/lib/entry-metrics-query";
import {
  buildHabitStatsFromRows,
  buildHabitStatsQuery,
  type HabitStatsItem,
  type HabitStatsRow,
} from "@/src/features/stats/habit-stats";
import {
  getCurrentStatsMonthKey,
  getStatsMonthLabel,
  getStatsYearFromMonthKey,
  normalizeStatsMonthKey,
  type StatsMonthOption,
  type StatsPeriod,
} from "@/src/lib/stats-period";

export type TopSavingsItem = {
  id: string;
  title: string;
  categoryName: string;
  date: Date;
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  source: EntrySource;
};

export type WorkspaceMemberSpendingStatsItem = {
  userId: string;
  label: string;
  totalPaidByUser: number;
  personalSpending: number;
  sharedSpending: number;
};

type StatsMonthlyMetricRow = EntryMetricAggregateRow & {
  month: string;
};

type StatsCategoryMetricRow = EntryMetricAggregateRow & {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
};

type StatsDailySpendingMetricRow = {
  dateKey: string;
  totalRealSpent: unknown;
  entriesCount: number;
};

type StatsTopSavingsMetricRow = {
  id: string;
  title: string;
  date: Date;
  realCost: unknown;
  alternativeCost: unknown;
  savedAmount: unknown;
  source: EntrySource;
  categoryName: string;
};

type StatsPageData = {
  overview: StatsOverview;
  allTimeOverview: StatsOverview;
  monthlyStats: MonthlyStatsItem[];
  categoryStats: CategoryStatsItem[];
  topSavings: TopSavingsItem[];
  habitStats: HabitStatsItem[];
  insights: StatsInsight[];
  dailySpendingComparison: DailySpendingComparison;
  selectedPeriod: StatsPeriod;
  selectedMonthKey: string;
  selectedMonthLabel: string;
  selectedYear: string;
  monthOptions: StatsMonthOption[];
  hasAnyStatsData: boolean;
};

type StatsPageDataOptions = {
  period?: StatsPeriod;
  selectedMonthKey?: string;
  now?: Date;
};


async function buildEntryWhere(
  memberUserId: string | undefined,
  where: Prisma.EntryWhereInput = {},
): Promise<Prisma.EntryWhereInput> {
  return {
    ...where,
    ...buildWorkspaceMemberEntryWhere(memberUserId),
    ...(await getCurrentWorkspaceScopedWhere()),
  };
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


function buildStatsMonthOptionsFromMonthlyStats(
  monthlyStats: MonthlyStatsItem[],
  selectedMonthKey: string,
  now: Date,
  timeZone: string,
): StatsMonthOption[] {
  const monthCounts = new Map(
    monthlyStats.map((month) => [month.month, month.entriesCount]),
  );
  const monthKeys = new Set(monthCounts.keys());

  monthKeys.add(getCurrentStatsMonthKey(timeZone, now));
  monthKeys.add(selectedMonthKey);

  return Array.from(monthKeys)
    .sort((left, right) => right.localeCompare(left))
    .map((month) => ({
      month,
      label: getStatsMonthLabel(month),
      entriesCount: monthCounts.get(month) ?? 0,
    }));
}

function getStatsPeriodDateRange(
  period: StatsPeriod,
  selectedMonthKey: string,
  timeZone: string,
): EntryMetricDateRange {
  if (period === "all") {
    return {};
  }

  if (period === "month") {
    return getMonthRangeForMonthKey(selectedMonthKey, timeZone);
  }

  const selectedYear = Number(getStatsYearFromMonthKey(selectedMonthKey));
  const start = getMonthRangeForMonthKey(`${selectedYear}-01`, timeZone).start;
  const end = getMonthRangeForMonthKey(`${selectedYear + 1}-01`, timeZone).start;

  return { start, end };
}

function getPreviousMonthKey(monthKey: string): string {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return monthKey;
  }

  if (month === 1) {
    return `${year - 1}-12`;
  }

  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

function buildMonthlyStatsFromRows(rows: StatsMonthlyMetricRow[]): MonthlyStatsItem[] {
  return rows.map((row) => {
    const agg = normalizeEntryMetricAggregate(row);
    return {
      month: row.month,
      label: getMonthLabelFromKey(row.month),
      totalRealSpent: agg.totalSpentReal,
      totalAlternativeCost: agg.totalWouldHaveSpent,
      totalSaved: agg.totalNetImpact,
      netImpact: agg.totalNetImpact,
      avoidedAmount: agg.totalAvoidedAmount,
      comparisonSaved: agg.totalComparisonSaved,
      comparisonOverspent: agg.totalComparisonOverspent,
      grossPositiveImpact: agg.totalGrossPositiveImpact,
      largeComparisonImpact: agg.largeComparisonImpact,
      ordinaryImpact: agg.ordinaryImpact,
      entriesCount: agg.entriesCount,
    };
  });
}

function buildCategoryStatsFromRows(rows: StatsCategoryMetricRow[]): CategoryStatsItem[] {
  return rows
    .map((row) => {
      const agg = normalizeEntryMetricAggregate(row);
      return {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categorySlug: row.categorySlug,
        totalRealSpent: agg.totalSpentReal,
        totalAlternativeCost: agg.totalWouldHaveSpent,
        totalSaved: agg.totalNetImpact,
        netImpact: agg.totalNetImpact,
        avoidedAmount: agg.totalAvoidedAmount,
        comparisonSaved: agg.totalComparisonSaved,
        comparisonOverspent: agg.totalComparisonOverspent,
        grossPositiveImpact: agg.totalGrossPositiveImpact,
        entriesCount: agg.entriesCount,
        averageSaved:
          agg.entriesCount === 0
            ? 0
            : round2(agg.totalNetImpact / agg.entriesCount),
      };
    })
    .sort(
      (left, right) =>
        right.totalRealSpent - left.totalRealSpent ||
        right.totalSaved - left.totalSaved ||
        left.categoryName.localeCompare(right.categoryName, "it"),
    );
}

function buildMonthlyCategoryGroupedFromRows(
  rows: Array<StatsCategoryMetricRow & { month: string }>,
): Map<string, Map<string, StatsMonthlyCategoryRow>> {
  const grouped = new Map<string, Map<string, StatsMonthlyCategoryRow>>();

  for (const row of rows) {
    const agg = normalizeEntryMetricAggregate(row);
    const categoryMap = grouped.get(row.month) ?? new Map();
    categoryMap.set(row.categoryId, {
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      totalRealSpent: agg.totalSpentReal,
      totalAlternativeCost: agg.totalWouldHaveSpent,
      totalSaved: agg.totalNetImpact,
      entriesCount: agg.entriesCount,
    });
    grouped.set(row.month, categoryMap);
  }

  return grouped;
}

async function getEntryAggregateForWorkspace(
  workspaceId: string,
  memberUserId: string | undefined,
  range: EntryMetricDateRange = {},
): Promise<StatsOverview> {
  const rows = await prisma.$queryRaw<EntryMetricAggregateRow[]>(Prisma.sql`
    SELECT ${entryMetricAggregateSelectSql}
    FROM "Entry" e
    WHERE e."workspaceId" = ${workspaceId}
      ${entryMetricMemberFilterSql(memberUserId)}
      ${entryMetricDateRangeSql(range)}
  `);

  return overviewFromAggregate(normalizeEntryMetricAggregate(rows[0]));
}

async function getMonthlyStatsForWorkspace(
  workspaceId: string,
  memberUserId: string | undefined,
  timeZone: string,
  range: EntryMetricDateRange = {},
): Promise<MonthlyStatsItem[]> {
  const rows = await prisma.$queryRaw<StatsMonthlyMetricRow[]>(Prisma.sql`
    SELECT
      to_char(${entryLocalTimestampSql(timeZone)}, 'YYYY-MM') AS "month",
      ${entryMetricAggregateSelectSql}
    FROM "Entry" e
    WHERE e."workspaceId" = ${workspaceId}
      ${entryMetricMemberFilterSql(memberUserId)}
      ${entryMetricDateRangeSql(range)}
    GROUP BY "month"
    ORDER BY "month" ASC
  `);

  return buildMonthlyStatsFromRows(rows);
}

async function getCategoryStatsForWorkspace(
  workspaceId: string,
  memberUserId: string | undefined,
  range: EntryMetricDateRange = {},
): Promise<CategoryStatsItem[]> {
  const rows = await prisma.$queryRaw<StatsCategoryMetricRow[]>(Prisma.sql`
    SELECT
      c."id" AS "categoryId",
      c."name" AS "categoryName",
      c."slug" AS "categorySlug",
      ${entryMetricAggregateSelectSql}
    FROM "Entry" e
    INNER JOIN "Category" c ON c."id" = e."categoryId"
    WHERE e."workspaceId" = ${workspaceId}
      ${entryMetricMemberFilterSql(memberUserId)}
      ${entryMetricDateRangeSql(range)}
    GROUP BY c."id", c."name", c."slug"
  `);

  return buildCategoryStatsFromRows(rows);
}

async function getMonthlyCategoryRowsForWorkspace(
  workspaceId: string,
  memberUserId: string | undefined,
  timeZone: string,
  range: EntryMetricDateRange = {},
): Promise<Array<StatsCategoryMetricRow & { month: string }>> {
  return prisma.$queryRaw<Array<StatsCategoryMetricRow & { month: string }>>(Prisma.sql`
    SELECT
      to_char(${entryLocalTimestampSql(timeZone)}, 'YYYY-MM') AS "month",
      c."id" AS "categoryId",
      c."name" AS "categoryName",
      c."slug" AS "categorySlug",
      ${entryMetricAggregateSelectSql}
    FROM "Entry" e
    INNER JOIN "Category" c ON c."id" = e."categoryId"
    WHERE e."workspaceId" = ${workspaceId}
      ${entryMetricMemberFilterSql(memberUserId)}
      ${entryMetricDateRangeSql(range)}
    GROUP BY "month", c."id", c."name", c."slug"
    ORDER BY "month" ASC
  `);
}

async function getTopSavingsForWorkspace(
  workspaceId: string,
  memberUserId: string | undefined,
  range: EntryMetricDateRange = {},
  limit = 10,
): Promise<TopSavingsItem[]> {
  const safeLimit = Math.max(0, Math.floor(limit));
  if (safeLimit === 0) {
    return [];
  }

  const rows = await prisma.$queryRaw<StatsTopSavingsMetricRow[]>(Prisma.sql`
    SELECT
      e."id",
      e."title",
      e."date",
      e."realCost",
      e."alternativeCost",
      ${entryNetImpactSql}::text AS "savedAmount",
      e."source",
      c."name" AS "categoryName"
    FROM "Entry" e
    INNER JOIN "Category" c ON c."id" = e."categoryId"
    WHERE e."workspaceId" = ${workspaceId}
      ${entryMetricMemberFilterSql(memberUserId)}
      ${entryMetricDateRangeSql(range)}
      AND ${entryNetImpactSql} > 0
    ORDER BY ${entryNetImpactSql} DESC, e."date" DESC
    LIMIT ${safeLimit}
  `);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    categoryName: row.categoryName,
    date: row.date,
    realCost: round2(toMetricNumber(row.realCost)),
    alternativeCost: round2(toMetricNumber(row.alternativeCost)),
    savedAmount: round2(toMetricNumber(row.savedAmount)),
    source: row.source,
  }));
}

async function getDailySpendingRowsForWorkspace(
  workspaceId: string,
  memberUserId: string | undefined,
  timeZone: string,
  selectedMonthKey: string,
): Promise<StatsDailySpendingMetricRow[]> {
  const currentMonthRange = getMonthRangeForMonthKey(selectedMonthKey, timeZone);
  const previousMonthRange = getMonthRangeForMonthKey(
    getPreviousMonthKey(selectedMonthKey),
    timeZone,
  );

  return prisma.$queryRaw<StatsDailySpendingMetricRow[]>(Prisma.sql`
    SELECT
      to_char(${entryLocalTimestampSql(timeZone)}, 'YYYY-MM-DD') AS "dateKey",
      COALESCE(SUM(e."realCost"), 0)::text AS "totalRealSpent",
      COUNT(*)::int AS "entriesCount"
    FROM "Entry" e
    WHERE e."workspaceId" = ${workspaceId}
      ${entryMetricMemberFilterSql(memberUserId)}
      AND e."date" >= ${previousMonthRange.start}
      AND e."date" < ${currentMonthRange.end}
    GROUP BY "dateKey"
    ORDER BY "dateKey" ASC
  `);
}

async function getHabitStatsForWorkspace(
  workspaceId: string,
  memberUserId: string | undefined,
): Promise<HabitStatsItem[]> {
  const rows = await prisma.$queryRaw<HabitStatsRow[]>(
    buildHabitStatsQuery(workspaceId, memberUserId),
  );
  return buildHabitStatsFromRows(rows);
}

type StatsQueryResults = {
  allTimeOverview: StatsOverview;
  periodOverview: StatsOverview;
  allTimeMonthlyStats: MonthlyStatsItem[];
  periodMonthlyStats: MonthlyStatsItem[];
  categoryStats: CategoryStatsItem[];
  monthlyCategoryRows: Array<StatsCategoryMetricRow & { month: string }>;
  topSavings: TopSavingsItem[];
  dailyRows: StatsDailySpendingMetricRow[];
  habitStats: HabitStatsItem[];
};

// The nine aggregation queries behind the stats page, keyed by everything that
// changes their result. Cached and invalidated by the `entries:<id>` tag that
// entry mutations already bump, so opening /stats — with or without a ?person
// filter — no longer re-runs a workspace-wide scan on every render. The
// `now`-dependent assembly (month options, "so far" daily comparison, translated
// insights) stays in getStatsPageData: it must not be cached across day/locale.
async function _cachedStatsQueries(
  workspaceId: string,
  memberUserId: string | undefined,
  timeZone: string,
  selectedPeriod: StatsPeriod,
  selectedMonthKey: string,
): Promise<StatsQueryResults> {
  "use cache";
  cacheTag(`entries:${workspaceId}`);
  cacheLife("hours");

  const periodRange = getStatsPeriodDateRange(
    selectedPeriod,
    selectedMonthKey,
    timeZone,
  );
  const [
    allTimeOverview,
    periodOverview,
    allTimeMonthlyStats,
    periodMonthlyStats,
    categoryStats,
    monthlyCategoryRows,
    topSavings,
    dailyRows,
    habitStats,
  ] = await Promise.all([
    getEntryAggregateForWorkspace(workspaceId, memberUserId),
    getEntryAggregateForWorkspace(workspaceId, memberUserId, periodRange),
    getMonthlyStatsForWorkspace(workspaceId, memberUserId, timeZone),
    getMonthlyStatsForWorkspace(workspaceId, memberUserId, timeZone, periodRange),
    getCategoryStatsForWorkspace(workspaceId, memberUserId, periodRange),
    getMonthlyCategoryRowsForWorkspace(
      workspaceId,
      memberUserId,
      timeZone,
      periodRange,
    ),
    getTopSavingsForWorkspace(workspaceId, memberUserId, periodRange, 10),
    getDailySpendingRowsForWorkspace(
      workspaceId,
      memberUserId,
      timeZone,
      selectedMonthKey,
    ),
    getHabitStatsForWorkspace(workspaceId, memberUserId),
  ]);

  return {
    allTimeOverview,
    periodOverview,
    allTimeMonthlyStats,
    periodMonthlyStats,
    categoryStats,
    monthlyCategoryRows,
    topSavings,
    dailyRows,
    habitStats,
  };
}

export async function getStatsPageData(
  memberUserId?: string,
  options: StatsPageDataOptions = {},
): Promise<StatsPageData> {
  const now = options.now ?? new Date();
  const selectedPeriod = options.period ?? "month";
  const [timeZone, workspaceId, language] = await Promise.all([
    getCurrentWorkspaceTimezone(),
    getCurrentWorkspaceId(),
    getCurrentWorkspaceLanguage(),
  ]);
  const translations = getTranslations(language);
  const selectedMonthKey = normalizeStatsMonthKey(timeZone, options.selectedMonthKey, now);
  const selectedMonthLabel = getStatsMonthLabel(selectedMonthKey);
  const selectedYear = getStatsYearFromMonthKey(selectedMonthKey);
  const {
    allTimeOverview,
    periodOverview,
    allTimeMonthlyStats,
    periodMonthlyStats,
    categoryStats,
    monthlyCategoryRows,
    topSavings,
    dailyRows,
    habitStats,
  } = await _cachedStatsQueries(
    workspaceId,
    memberUserId,
    timeZone,
    selectedPeriod,
    selectedMonthKey,
  );
  const monthlyCategoryGrouped =
    buildMonthlyCategoryGroupedFromRows(monthlyCategoryRows);
  const insights = [
    buildSpendingCategoryInsight(
      periodMonthlyStats,
      monthlyCategoryGrouped,
      categoryStats,
      translations,
    ),
    buildSavingCategoryInsight(
      periodMonthlyStats,
      monthlyCategoryGrouped,
      categoryStats,
      translations,
    ),
    buildSpendingTrendInsight(periodMonthlyStats, translations),
  ].slice(0, 3);
  const monthOptions = buildStatsMonthOptionsFromMonthlyStats(
    allTimeMonthlyStats,
    selectedMonthKey,
    now,
    timeZone,
  );
  const dailySpendingComparison = buildDailySpendingComparisonFromRows(
    dailyRows.map((row) => ({
      dateKey: row.dateKey,
      totalRealSpent: round2(toMetricNumber(row.totalRealSpent)),
      entriesCount: row.entriesCount,
    })),
    timeZone,
    now,
    selectedMonthKey,
    languageToLocale(language),
  );

  return {
    overview: periodOverview,
    allTimeOverview,
    monthlyStats: allTimeMonthlyStats,
    categoryStats,
    topSavings,
    habitStats,
    insights,
    dailySpendingComparison,
    selectedPeriod,
    selectedMonthKey,
    selectedMonthLabel,
    selectedYear,
    monthOptions,
    hasAnyStatsData: allTimeOverview.entriesCount > 0 || habitStats.length > 0,
  };
}

export async function getStatsOverview(
  memberUserId?: string,
): Promise<StatsOverview> {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    return getEntryAggregateForWorkspace(workspaceId, memberUserId);
  } catch (error) {
    logAndRethrowDataLoadError("Failed to load stats overview", error);
  }
}

export async function getMonthlyStats(
  memberUserId?: string,
): Promise<MonthlyStatsItem[]> {
  if (!memberUserId) {
    const [workspaceId, timeZone] = await Promise.all([
      getCurrentWorkspaceId(),
      getCurrentWorkspaceTimezone(),
    ]);
    return _cachedMonthlyStats(workspaceId, timeZone);
  }
  return _getMonthlyStatsDynamic(memberUserId);
}

async function _cachedMonthlyStats(workspaceId: string, timeZone: string): Promise<MonthlyStatsItem[]> {
  "use cache";
  cacheTag(`entries:${workspaceId}`);
  cacheLife("hours");

  try {
    return getMonthlyStatsForWorkspace(workspaceId, undefined, timeZone);
  } catch (error) {
    logAndRethrowDataLoadError("Failed to load monthly stats", error);
  }
}

async function _getMonthlyStatsDynamic(memberUserId: string): Promise<MonthlyStatsItem[]> {
  try {
    const [workspaceId, timeZone] = await Promise.all([
      getCurrentWorkspaceId(),
      getCurrentWorkspaceTimezone(),
    ]);
    return getMonthlyStatsForWorkspace(workspaceId, memberUserId, timeZone);
  } catch (error) {
    logAndRethrowDataLoadError("Failed to load monthly stats", error);
  }
}

export async function getCategoryStats(
  memberUserId?: string,
): Promise<CategoryStatsItem[]> {
  if (!memberUserId) {
    const workspaceId = await getCurrentWorkspaceId();
    return _cachedCategoryStats(workspaceId);
  }
  return _getCategoryStatsDynamic(memberUserId);
}

async function _cachedCategoryStats(workspaceId: string): Promise<CategoryStatsItem[]> {
  "use cache";
  cacheTag(`entries:${workspaceId}`);
  cacheLife("hours");

  try {
    return getCategoryStatsForWorkspace(workspaceId, undefined);
  } catch (error) {
    logAndRethrowDataLoadError("Failed to load category stats", error);
  }
}

async function _getCategoryStatsDynamic(memberUserId: string): Promise<CategoryStatsItem[]> {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    return getCategoryStatsForWorkspace(workspaceId, memberUserId);
  } catch (error) {
    logAndRethrowDataLoadError("Failed to load category stats", error);
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
    logAndRethrowDataLoadError("Failed to load top savings", error);
  }
}

export async function getHabitStats(
  memberUserId?: string,
): Promise<HabitStatsItem[]> {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    return await getHabitStatsForWorkspace(workspaceId, memberUserId);
  } catch (error) {
    logAndRethrowDataLoadError("Failed to load habit stats", error);
  }
}

export async function getWorkspaceMemberSpendingStats(
  memberUserId?: string,
): Promise<WorkspaceMemberSpendingStatsItem[]> {
  try {
    const [workspaceId, members] = await Promise.all([
      getCurrentWorkspaceId(),
      getCurrentWorkspaceMembers(),
    ]);

    const rows = await prisma.$queryRaw<
      Array<{
        userId: string;
        totalPaidByUser: unknown;
        personalSpending: unknown;
        sharedSpending: unknown;
      }>
    >(Prisma.sql`
      WITH entry_beneficiary_counts AS (
        SELECT
          e."id",
          e."realCost",
          e."paidByUserId",
          e."paymentMode",
          COUNT(DISTINCT eb."userId")::int AS "beneficiaryCount"
        FROM "Entry" e
        LEFT JOIN "EntryBeneficiary" eb ON eb."entryId" = e."id"
        WHERE e."workspaceId" = ${workspaceId}
          ${entryMetricMemberFilterSql(memberUserId)}
        GROUP BY e."id", e."realCost", e."paidByUserId", e."paymentMode"
      ),
      member_totals AS (
        SELECT
          "paidByUserId" AS "userId",
          SUM("realCost") AS "totalPaidByUser",
          0::numeric AS "personalSpending",
          SUM(CASE WHEN "beneficiaryCount" > 1 THEN "realCost" ELSE 0::numeric END) AS "sharedSpending"
        FROM entry_beneficiary_counts
        WHERE "paidByUserId" IS NOT NULL
          AND "paymentMode"::text <> 'joint_account'
        GROUP BY "paidByUserId"

        UNION ALL

        SELECT
          eb."userId",
          SUM(e."realCost" / NULLIF(counts."beneficiaryCount", 0)) AS "totalPaidByUser",
          0::numeric AS "personalSpending",
          SUM(e."realCost" / NULLIF(counts."beneficiaryCount", 0)) AS "sharedSpending"
        FROM "Entry" e
        INNER JOIN entry_beneficiary_counts counts ON counts."id" = e."id"
        INNER JOIN "EntryBeneficiary" eb ON eb."entryId" = e."id"
        WHERE counts."paymentMode"::text = 'joint_account'
          AND counts."beneficiaryCount" > 1
        GROUP BY eb."userId"

        UNION ALL

        SELECT
          eb."userId",
          0::numeric AS "totalPaidByUser",
          SUM(e."realCost") AS "personalSpending",
          0::numeric AS "sharedSpending"
        FROM "Entry" e
        INNER JOIN entry_beneficiary_counts counts ON counts."id" = e."id"
        INNER JOIN "EntryBeneficiary" eb ON eb."entryId" = e."id"
        WHERE counts."beneficiaryCount" = 1
        GROUP BY eb."userId"
      )
      SELECT
        "userId",
        COALESCE(SUM("totalPaidByUser"), 0)::text AS "totalPaidByUser",
        COALESCE(SUM("personalSpending"), 0)::text AS "personalSpending",
        COALESCE(SUM("sharedSpending"), 0)::text AS "sharedSpending"
      FROM member_totals
      GROUP BY "userId"
    `);

    const totalsByUserId = new Map(
      rows.map((row) => [
        row.userId,
        {
          totalPaidByUser: round2(toMetricNumber(row.totalPaidByUser)),
          personalSpending: round2(toMetricNumber(row.personalSpending)),
          sharedSpending: round2(toMetricNumber(row.sharedSpending)),
        },
      ]),
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
    logAndRethrowDataLoadError(
      "Failed to load workspace member spending stats",
      error,
    );
  }
}
