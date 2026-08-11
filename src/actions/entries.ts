"use server";

import { getActionTranslations } from "@/src/lib/i18n/server";
import { resolveEntryPaymentAndOwnership } from "@/src/features/entries/payment-ownership";
import {
  serializeEntry,
  serializeEntryEdit,
  type EntryWithCategory,
  type SerializableEntry,
  type SerializableEntryEdit,
} from "@/src/features/entries/serialize";

import {
  detectFixedExpenses,
  isFixedExpense,
  normalizeRecurringTitle,
} from "@/src/features/entries/fixed-expenses";
import {
  buildEntriesCategoryWhere,
  buildEntriesKindWhere,
  buildEntriesSearchWhere,
  isLikelyImportedNoise,
  normalizeSearchQuery,
  type EntriesKindFilter,
} from "@/src/features/entries/search";

import { round2, toMoneyNumber as toNumber } from "@/src/lib/money-number";

import { subDays } from "date-fns";
import { Prisma } from "@/src/lib/generated/prisma/client";
import { cacheLife, cacheTag, revalidatePath, updateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import {
  mergeCategoryOptions,
  sortCategoryOptionsByUsage,
} from "@/src/lib/categories";
import { logAndRethrowDataLoadError } from "@/src/lib/data-load-error";
import {
  decryptOptionalText,
  encryptOptionalText,
} from "@/src/lib/field-encryption";
import {
  entryMetricAggregateSelectSql,
  normalizeEntryMetricAggregate,
  type EntryMetricAggregateRow,
} from "@/src/lib/entry-metrics-query";
import {
  getMonthKey,
  getMonthRangeForMonthKey,
  isDateKey,
  normalizeMonthKey,
  parseWorkspaceDateKey,
} from "@/src/lib/workspace-dates";
import { validateEntryOwnership } from "@/src/lib/entry-ownership";
import { EntryVisibility } from "@/src/lib/generated/prisma/enums";
import {
  createEntryFromNormalizedInput,
  type CreateEntryResult,
} from "@/src/actions/entry-create";
import {
  getEntryFormText as getText,
  resolveEntryMoneyFromForm,
} from "@/src/features/entries/form-money";
import { resolveEntryCategory } from "@/src/features/entries/repository";
import { refreshSupabaseSessionForAction } from "@/src/lib/auth/action-session";
import { withDatabaseRetry } from "@/src/lib/db-retry";
import { revalidateEntryDependentViews } from "@/src/features/entries/revalidation";
import { prisma } from "@/src/lib/prisma";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";
import {
  getCurrentUser,
  getCurrentWorkspaceId,
  getCurrentWorkspaceLanguage,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceScopedWhere,
  getCurrentWorkspaceTimezone,
  requireWorkspaceAccessForRecord,
} from "@/src/lib/workspace-context";
import {
  entryEditSelectWithBeneficiaries,
  entryListSelectWithBeneficiaries,
} from "@/src/lib/entry-list-select";
import {
  buildExpenseSuggestion,
  type ExpenseSuggestionCandidate,
  type ExpenseSuggestionInput,
  type ExpenseSuggestionResult,
} from "@/src/lib/expense-suggestion";
import { isWorkspaceDebugEnabled, logWorkspaceDebug } from "@/src/lib/workspace-debug";

type MonthlySummary = {
  // Legacy fields kept for caller compatibility
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;   // = netImpact (was: raw sum of savedAmount)
  entriesCount: number;
  // Unified metric breakdown
  realSpent: number;
  avoidedAmount: number;
  comparisonSaved: number;
  comparisonOverspent: number;
  grossPositiveImpact: number;
  netImpact: number;
  largeComparisonImpact: number;
  ordinaryImpact: number;
};

type ExpenseSuggestionRequest = ExpenseSuggestionInput;

type DashboardReflectionEntry = {
  category: {
    id: string;
    name: string;
  };
  savedAmount: number;
  date: Date;
};

export type DashboardEntrySnapshot = {
  entryCount: number;
  firstEntryDate: Date | null;
  weekEntries: DashboardReflectionEntry[];
};

export type EntriesPageResult = {
  entries: SerializableEntry[];
  nextCursor: string | null;
  hasMore: boolean;
};

type EntriesPageOptions = {
  q?: string;
  cursor?: string;
  limit?: number;
  members?: WorkspaceMemberOption[] | Promise<WorkspaceMemberOption[]>;
  monthKey?: string;
  kind?: EntriesKindFilter;
  categoryIds?: string[];
};

function toDecimalString(value: number): string {
  return value.toFixed(2);
}

function toFiniteNumber(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function logEntryLoadError(
  operation: string,
  error: unknown,
  context: Record<string, unknown> = {},
) {
  const prismaCode =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : undefined;

  console.error(`[entries] ${operation} failed`, {
    ...context,
    prismaCode,
    message: error instanceof Error ? error.message : String(error),
    hint:
      prismaCode === "P2021"
        ? 'Run "npx prisma migrate deploy" to create the missing table.'
        : undefined,
  });
  console.error(error);
}

async function findEntriesPage(
  where: Prisma.EntryWhereInput,
  options: {
    cursor?: string;
    limit: number;
  },
): Promise<EntryWithCategory[]> {
  const orderBy = [
    {
      date: "desc" as const,
    },
    {
      createdAt: "desc" as const,
    },
    {
      id: "desc" as const,
    },
  ];

  if (options.cursor) {
    return prisma.entry.findMany({
      where,
      take: options.limit + 1,
      cursor: { id: options.cursor },
      skip: 1,
      orderBy,
      select: entryListSelectWithBeneficiaries,
    });
  }

  return prisma.entry.findMany({
    where,
    take: options.limit + 1,
    orderBy,
    select: entryListSelectWithBeneficiaries,
  });
}

async function findExpenseSuggestionCandidates(
  where: Prisma.EntryWhereInput,
): Promise<Array<ExpenseSuggestionCandidate>> {
  const entries = await prisma.entry.findMany({
    where,
    orderBy: [
      {
        date: "desc" as const,
      },
      {
        createdAt: "desc" as const,
      },
    ],
    take: 250,
    select: {
      title: true,
      realCost: true,
      date: true,
      note: true,
      paidByUserId: true,
      beneficiaries: {
        select: {
          userId: true,
        },
      },
    },
  });

  return entries
    .filter((entry) =>
      !isLikelyImportedNoise(entry.title, decryptOptionalText(entry.note)),
    )
    .map((entry) => ({
      title: entry.title,
      realCost: toNumber(entry.realCost),
      date: entry.date,
      paidByUserId: entry.paidByUserId,
      beneficiaryUserIds: entry.beneficiaries.map(
        (beneficiary) => beneficiary.userId,
      ),
    }));
}

export async function getEntriesPage(
  options?: EntriesPageOptions,
): Promise<EntriesPageResult> {
  const limit = options?.limit ?? 20;
  const cursor = options?.cursor?.trim() || undefined;
  const searchQuery = normalizeSearchQuery(options?.q);

  let workspaceId = "unknown";

  try {
    const membersPromise = options?.members
      ? Promise.resolve(options.members)
      : getCurrentWorkspaceMembers();
    const [workspaceWhere, members, timeZone] = await Promise.all([
      getCurrentWorkspaceScopedWhere(),
      membersPromise,
      getCurrentWorkspaceTimezone(),
    ]);

    workspaceId = workspaceWhere.workspaceId;
    const monthKey = normalizeMonthKey(timeZone, options?.monthKey);
    const { start, end } = getMonthRangeForMonthKey(monthKey, timeZone);
    const monthWhere: Prisma.EntryWhereInput = {
      AND: [
        workspaceWhere,
        {
          date: {
            gte: start,
            lt: end,
          },
        },
      ],
    };
    const extraFilters = [
      buildEntriesSearchWhere(searchQuery, members),
      buildEntriesKindWhere(options?.kind),
      buildEntriesCategoryWhere(options?.categoryIds),
    ].filter((filter) => Object.keys(filter).length > 0);
    const combinedWhere =
      extraFilters.length > 0
        ? { AND: [monthWhere, ...extraFilters] }
        : monthWhere;

    const entries = await findEntriesPage(combinedWhere, {
      cursor,
      limit,
    });

    const hasMore = entries.length > limit;
    const pageEntries = hasMore ? entries.slice(0, limit) : entries;
    const serializedEntries = pageEntries.map((entry) =>
      serializeEntry(entry, members),
    );

    return {
      entries: serializedEntries,
      nextCursor: hasMore ? pageEntries.at(-1)?.id ?? null : null,
      hasMore,
    };
  } catch (error) {
    unstable_rethrow(error);
    logEntryLoadError("getEntriesPage", error, {
      workspaceId,
      searchQuery: searchQuery || "all",
      cursor: cursor ?? null,
      limit,
    });
    // Rethrow instead of returning an empty page: the entries route shows a
    // load-error banner and the client list has loadError/searchError states,
    // while an empty result reads as "no movements this month".
    throw error;
  }
}

export async function getEntryById(
  entryId: string,
): Promise<SerializableEntryEdit | null> {
  const id = entryId.trim();

  if (!id) {
    return null;
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();
    const entry = await prisma.entry.findUnique({
      where: { id, workspaceId },
      select: entryEditSelectWithBeneficiaries,
    });

    if (!entry) {
      return null;
    }

    const members = await getCurrentWorkspaceMembers();
    return serializeEntryEdit(entry, members);
  } catch (error) {
    logEntryLoadError("getEntryById", error, { entryId: id });
    throw error;
  }
}

export async function getDashboardSummary(monthKeyInput?: string): Promise<MonthlySummary> {
  const [workspaceId, timeZone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceTimezone(),
  ]);
  const monthKey = normalizeMonthKey(timeZone, monthKeyInput);
  return _cachedDashboardSummary(workspaceId, timeZone, monthKey);
}

async function _cachedDashboardSummary(
  workspaceId: string,
  timeZone: string,
  monthKey: string,
): Promise<MonthlySummary> {
  "use cache";
  cacheTag(`entries:${workspaceId}`);
  cacheLife("hours");

  const { start, end } = getMonthRangeForMonthKey(monthKey, timeZone);

  const rows = await prisma.$queryRaw<EntryMetricAggregateRow[]>(Prisma.sql`
    SELECT ${entryMetricAggregateSelectSql}
    FROM "Entry" e
    WHERE e."workspaceId" = ${workspaceId}
      AND e."date" >= ${start}
      AND e."date" < ${end}
  `);
  const agg = normalizeEntryMetricAggregate(rows[0]);
  // Soldi realmente usciti nel mese. I movimenti con confronto restano dentro:
  // segnare che una spesa era più conveniente dell'alternativa non la rende
  // meno pagata, e escluderli faceva sottostimare il budget.
  const realSpentRows = await prisma.$queryRaw<Array<{ total: unknown }>>(Prisma.sql`
    SELECT COALESCE(SUM(e."realCost"), 0)::text AS "total"
    FROM "Entry" e
    WHERE e."workspaceId" = ${workspaceId}
      AND e."date" >= ${start}
      AND e."date" < ${end}
      AND e."mode"::text <> 'avoided'
  `);
  const realSpent = Number(realSpentRows[0]?.total ?? 0);

  if (isWorkspaceDebugEnabled()) {
    const allTimeCount = await prisma.entry.count({ where: { workspaceId } });
    logWorkspaceDebug("getDashboardSummary", {
      workspaceId,
      monthStart: start.toISOString(),
      nextMonthStart: end.toISOString(),
      entriesThisMonth: agg.entriesCount,
      entriesAllTimeInWorkspace: allTimeCount,
    });
  }

  return {
    totalRealSpent: agg.totalSpentReal,
    totalAlternativeCost: agg.totalWouldHaveSpent,
    totalSaved: agg.totalNetImpact,
    entriesCount: agg.entriesCount,
    realSpent: Number.isFinite(realSpent) ? realSpent : 0,
    avoidedAmount: agg.totalAvoidedAmount,
    comparisonSaved: agg.totalComparisonSaved,
    comparisonOverspent: agg.totalComparisonOverspent,
    grossPositiveImpact: agg.totalGrossPositiveImpact,
    netImpact: agg.totalNetImpact,
    largeComparisonImpact: agg.largeComparisonImpact,
    ordinaryImpact: agg.ordinaryImpact,
  };
}

/** Mesi di storico letti per riconoscere le ricorrenti. */
const FIXED_DETECTION_MONTHS = 7;

export type MonthSpendBreakdown = {
  /** Soldi realmente usciti nel mese (esclude solo le spese evitate). */
  realSpent: number;
  /** Quota già impegnata: affitto, tasse, abbonamenti riconosciuti. */
  fixedSpent: number;
  /** Spesa corrente: quella che si decide giorno per giorno. */
  currentSpent: number;
  /** Voci fisse riconosciute, per spiegare il numero all'utente. */
  fixedItems: Array<{ label: string; amount: number }>;
  /**
   * Spesa corrente del mese precedente, sullo stesso criterio: è l'unico
   * confronto onesto, perché il totale si muove col giorno in cui capita
   * l'affitto invece che con i consumi.
   */
  previousCurrentSpent: number | null;
};

function shiftMonthKey(monthKey: string, months: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return monthKey;
  }

  const shifted = new Date(Date.UTC(year!, month! - 1 + months, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getMonthSpendBreakdown(
  monthKey?: string,
): Promise<MonthSpendBreakdown> {
  const [workspaceId, timeZone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceTimezone(),
  ]);

  return _cachedMonthSpendBreakdown(
    workspaceId,
    timeZone,
    normalizeMonthKey(timeZone, monthKey),
  );
}

async function _cachedMonthSpendBreakdown(
  workspaceId: string,
  timeZone: string,
  monthKey: string,
): Promise<MonthSpendBreakdown> {
  "use cache";
  cacheTag(`entries:${workspaceId}`);
  cacheLife("hours");

  const { start, end } = getMonthRangeForMonthKey(monthKey, timeZone);
  const historyStart = new Date(start);
  historyStart.setUTCMonth(historyStart.getUTCMonth() - FIXED_DETECTION_MONTHS);

  // Una sola lettura copre sia il riconoscimento (serve lo storico) sia il
  // mese da spezzare, così la home non paga due query.
  const entries = await prisma.entry.findMany({
    where: {
      workspaceId,
      mode: { not: "avoided" },
      date: { gte: historyStart, lt: end },
    },
    select: {
      title: true,
      realCost: true,
      date: true,
      categoryId: true,
      paidByUserId: true,
    },
  });

  const samples = entries.map((entry) => ({
    title: entry.title,
    amount: toNumber(entry.realCost),
    monthKey: getMonthKey(entry.date, timeZone),
    categoryId: entry.categoryId,
    payerId: entry.paidByUserId,
  }));

  const detection = detectFixedExpenses(samples, { currentMonthKey: monthKey });

  const previousMonthKey = shiftMonthKey(monthKey, -1);
  let realSpent = 0;
  let fixedSpent = 0;
  let previousCurrent = 0;
  let previousSeen = false;
  const fixedTotals = new Map<string, number>();

  for (const sample of samples) {
    const isFixed = isFixedExpense(sample, detection);

    if (sample.monthKey === previousMonthKey) {
      previousSeen = true;
      if (!isFixed) {
        previousCurrent += sample.amount;
      }
      continue;
    }

    if (sample.monthKey !== monthKey) {
      continue;
    }

    realSpent += sample.amount;

    if (isFixed) {
      fixedSpent += sample.amount;
      const label = sample.title.trim();
      fixedTotals.set(label, (fixedTotals.get(label) ?? 0) + sample.amount);
    }
  }

  return {
    realSpent: round2(realSpent),
    fixedSpent: round2(fixedSpent),
    currentSpent: round2(realSpent - fixedSpent),
    fixedItems: [...fixedTotals.entries()]
      .map(([label, amount]) => ({ label, amount: round2(amount) }))
      .sort((left, right) => right.amount - left.amount),
    previousCurrentSpent: previousSeen ? round2(previousCurrent) : null,
  };
}

/**
 * Titoli grezzi che appartengono a una ricorrente fissa riconosciuta. Serve a
 * chi aggrega in SQL e non può applicare la normalizzazione dei titoli.
 */
export async function getFixedExpenseTitles(): Promise<string[]> {
  const [workspaceId, timeZone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceTimezone(),
  ]);

  return _cachedFixedExpenseTitles(
    workspaceId,
    timeZone,
    normalizeMonthKey(timeZone, undefined),
  );
}

async function _cachedFixedExpenseTitles(
  workspaceId: string,
  timeZone: string,
  monthKey: string,
): Promise<string[]> {
  "use cache";
  cacheTag(`entries:${workspaceId}`);
  cacheLife("hours");

  const { end } = getMonthRangeForMonthKey(monthKey, timeZone);
  const historyStart = new Date(end);
  historyStart.setUTCMonth(historyStart.getUTCMonth() - FIXED_DETECTION_MONTHS - 1);

  const entries = await prisma.entry.findMany({
    where: {
      workspaceId,
      mode: { not: "avoided" },
      date: { gte: historyStart, lt: end },
    },
    select: {
      title: true,
      realCost: true,
      date: true,
      categoryId: true,
      paidByUserId: true,
    },
  });

  const samples = entries.map((entry) => ({
    title: entry.title,
    amount: toNumber(entry.realCost),
    monthKey: getMonthKey(entry.date, timeZone),
    categoryId: entry.categoryId,
    payerId: entry.paidByUserId,
  }));
  const detection = detectFixedExpenses(samples, { currentMonthKey: monthKey });

  // Chi aggrega in SQL può filtrare solo per titolo: le voci riconosciute per
  // firma vengono riportate ai titoli con cui sono state scritte. Basta finché
  // lo stesso titolo non viene usato anche per una spesa non fissa.
  return [
    ...new Set(
      samples
        .filter((sample) => isFixedExpense(sample, detection))
        .map((sample) => sample.title.trim().toLowerCase()),
    ),
  ];
}

export type FrequentEntryShortcut = {
  title: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  amount: number;
  count: number;
};

const SHORTCUT_WINDOW_DAYS = 90;

/**
 * Scorciatoie ricavate da ciò che si registra davvero, invece che da preset da
 * configurare a mano: chiedere all'utente di preparare le proprie scorciatoie
 * è già chiedergli troppo, e infatti i preset restano vuoti.
 *
 * Le fisse sono escluse di proposito: l'affitto non è una spesa che si decide,
 * e una scorciatoia per registrarlo non serve a nessuno.
 */
export async function getFrequentEntryShortcuts(
  limit = 3,
): Promise<FrequentEntryShortcut[]> {
  const [workspaceId, timeZone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceTimezone(),
  ]);

  return _cachedFrequentEntryShortcuts(workspaceId, timeZone, limit);
}

async function _cachedFrequentEntryShortcuts(
  workspaceId: string,
  timeZone: string,
  limit: number,
): Promise<FrequentEntryShortcut[]> {
  "use cache";
  cacheTag(`entries:${workspaceId}`);
  cacheLife("hours");

  const entries = await prisma.entry.findMany({
    where: {
      workspaceId,
      mode: { not: "avoided" },
      date: { gte: subDays(new Date(), SHORTCUT_WINDOW_DAYS) },
    },
    select: {
      title: true,
      realCost: true,
      date: true,
      categoryId: true,
      paidByUserId: true,
      category: { select: { name: true, slug: true } },
    },
  });

  const samples = entries.map((entry) => ({
    title: entry.title,
    amount: toNumber(entry.realCost),
    monthKey: getMonthKey(entry.date, timeZone),
    categoryId: entry.categoryId,
    payerId: entry.paidByUserId,
  }));
  const detection = detectFixedExpenses(samples, {
    currentMonthKey: normalizeMonthKey(timeZone, undefined),
  });

  const groups = new Map<
    string,
    {
      amounts: number[];
      titles: Map<string, number>;
      categories: Map<string, { id: string; name: string; slug: string; count: number }>;
    }
  >();

  for (const [index, entry] of entries.entries()) {
    if (isFixedExpense(samples[index]!, detection)) {
      continue;
    }

    const key = normalizeRecurringTitle(entry.title);
    if (!key) {
      continue;
    }

    const group = groups.get(key) ?? {
      amounts: [],
      titles: new Map<string, number>(),
      categories: new Map<string, { id: string; name: string; slug: string; count: number }>(),
    };

    const label = entry.title.trim();
    group.amounts.push(toNumber(entry.realCost));
    group.titles.set(label, (group.titles.get(label) ?? 0) + 1);

    const category = group.categories.get(entry.categoryId) ?? {
      id: entry.categoryId,
      name: entry.category.name,
      slug: entry.category.slug,
      count: 0,
    };
    category.count += 1;
    group.categories.set(entry.categoryId, category);
    groups.set(key, group);
  }

  return [...groups.values()]
    .filter((group) => group.amounts.length >= 3)
    .map((group) => {
      const sorted = [...group.amounts].sort((left, right) => left - right);
      const category = [...group.categories.values()].sort(
        (left, right) => right.count - left.count,
      )[0]!;
      const title = [...group.titles.entries()].sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
      )[0]![0];

      return {
        title,
        categoryId: category.id,
        categoryName: category.name,
        categorySlug: category.slug,
        amount: round2(sorted[Math.floor(sorted.length / 2)]!),
        count: group.amounts.length,
      };
    })
    .sort((left, right) => right.count - left.count || right.amount - left.amount)
    .slice(0, limit);
}

export async function getDashboardEntrySnapshot(): Promise<DashboardEntrySnapshot> {
  const workspaceId = await getCurrentWorkspaceId();
  return _cachedDashboardEntrySnapshot(workspaceId);
}

async function _cachedDashboardEntrySnapshot(workspaceId: string): Promise<DashboardEntrySnapshot> {
  "use cache";
  cacheTag(`entries:${workspaceId}`);
  cacheLife("hours");

  const weekStart = subDays(new Date(), 7);

  try {
    const [entryCount, firstEntry, weekEntries] =
      await withDatabaseRetry(
        () =>
          Promise.all([
        prisma.entry.count({ where: { workspaceId } }),
        prisma.entry.findFirst({
          where: { workspaceId },
          orderBy: [
            { date: "asc" },
            { createdAt: "asc" },
            { id: "asc" },
          ],
          select: { date: true },
        }),
        prisma.entry.findMany({
          where: { workspaceId, date: { gte: weekStart } },
          orderBy: [
            { date: "asc" },
            { createdAt: "asc" },
            { id: "asc" },
          ],
          select: {
            date: true,
            savedAmount: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
      ]),
        { label: "dashboard-entry-snapshot" },
      );

    return {
      entryCount,
      firstEntryDate: firstEntry?.date ?? null,
      weekEntries: weekEntries.map((entry) => ({
        ...entry,
        savedAmount: toFiniteNumber(entry.savedAmount),
      })),
    };
  } catch (error) {
    console.error("Failed to load dashboard entry snapshot:", error);
    throw error;
  }
}

export async function getCategories() {
  try {
    const [allCategories, language] = await Promise.all([
      prisma.category.findMany({
        where: await getCurrentWorkspaceScopedWhere(),
        select: {
          id: true,
          name: true,
          slug: true,
          color: true,
          icon: true,
          isDefault: true,
          archivedAt: true,
          _count: {
            select: {
              entries: true,
            },
          },
        },
      }),
      getCurrentWorkspaceLanguage(),
    ]);

    const archivedDefaultSlugs = new Set<string>();
    const activeCategories = [];
    const usageCountBySlug = new Map<string, number>();

    for (const cat of allCategories) {
      if (cat.archivedAt !== null) {
        if (cat.isDefault) {
          archivedDefaultSlugs.add(cat.slug);
        }
      } else {
        activeCategories.push(cat);
        usageCountBySlug.set(cat.slug, cat._count.entries);
      }
    }

    return sortCategoryOptionsByUsage(
      mergeCategoryOptions(activeCategories, archivedDefaultSlugs, language),
      usageCountBySlug,
      language,
    );
  } catch (error) {
    logAndRethrowDataLoadError("Failed to load entry categories", error);
  }
}

export async function getExpenseSuggestion(
  request: ExpenseSuggestionRequest,
): Promise<ExpenseSuggestionResult | null> {
  await refreshSupabaseSessionForAction();

  const title = request.title.trim();
  const categoryId = request.categoryId.trim();
  const workspaceId = request.workspaceId.trim();
  const currentRealCost = Number(request.currentRealCost);

  if (
    !categoryId ||
    !workspaceId ||
    !Number.isFinite(currentRealCost)
  ) {
    return null;
  }

  if (currentRealCost < 0) {
    return null;
  }

  let activeWorkspaceId: string;
  try {
    activeWorkspaceId = await getCurrentWorkspaceId();
  } catch (error) {
    unstable_rethrow(error);
    console.error("getExpenseSuggestion auth failed:", error);
    return null;
  }

  if (activeWorkspaceId !== workspaceId) {
    return null;
  }

  const candidates = await findExpenseSuggestionCandidates({
    workspaceId,
    categoryId,
    source: "manual",
    realCost: {
      gt: 0,
    },
  });

  return buildExpenseSuggestion(candidates, {
    title,
    categoryId,
    workspaceId,
    currentRealCost,
    paidByUserId: request.paidByUserId ?? null,
    beneficiaryUserIds: request.beneficiaryUserIds ?? [],
  });
}

export async function createEntry(
  formData: FormData,
): Promise<CreateEntryResult> {
  const t = await getActionTranslations();
  const errors: Record<string, string> = {};

  const title = getText(formData, "title");
  const categoryId = getText(formData, "categoryId");
  const note = getText(formData, "note");
  const dateValue = getText(formData, "date");
  const entryMoney = resolveEntryMoneyFromForm(formData, t);

  if (!title) {
    errors.title = t.validation.titleRequired;
  } else if (title.length < 2) {
    errors.title = "Il titolo deve avere almeno 2 caratteri";
  }

  if (!categoryId) {
    errors.categoryId = t.validation.selectCategory;
  }
  Object.assign(errors, entryMoney.errors);

  if (!dateValue || !isDateKey(dateValue)) {
    errors.date = t.entryActions.invalidDate;
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: t.validation.checkFields,
      errors,
    };
  }

  if (!entryMoney.money) {
    return {
      success: false,
      message: t.validation.checkFields,
      errors,
    };
  }

  const money = entryMoney.money;

  try {
    const currentUserPromise = getCurrentUser();
    const workspaceIdPromise = getCurrentWorkspaceId();
    const membersPromise = getCurrentWorkspaceMembers().catch(
      () => [] as WorkspaceMemberOption[],
    );
    const categoryPromise = workspaceIdPromise.then((workspaceId) =>
      resolveEntryCategory(categoryId, workspaceId),
    );
    const [currentUser, workspaceId, members, category, timeZone] =
      await Promise.all([
        currentUserPromise,
        workspaceIdPromise,
        membersPromise,
        categoryPromise,
        getCurrentWorkspaceTimezone(),
      ]);

    const date = parseWorkspaceDateKey(dateValue, timeZone);

    if (!date) {
      return {
        success: false,
        message: t.validation.checkFields,
        errors: { date: t.entryActions.invalidDate },
      };
    }

    const payment = resolveEntryPaymentAndOwnership(formData, members, t);
    const ownership = validateEntryOwnership(payment.ownershipInput, members);

    Object.assign(errors, payment.errors);

    if (!ownership.ok) {
      Object.assign(errors, ownership.errors);
    }

    if (Object.keys(errors).length > 0 || !ownership.ok) {
      return {
        success: false,
        message: t.validation.checkFields,
        errors,
      };
    }

    if (!category) {
      return {
        success: false,
        message: t.validation.checkFields,
        errors: {
          categoryId: t.validation.selectValidCategory,
        },
      };
    }

    return createEntryFromNormalizedInput(
      {
        workspaceId,
        currentUserId: currentUser.id,
        title,
        categoryId: category.id,
        date,
        note: note || null,
        money,
        paymentMode: payment.paymentMode,
        paidByUserId: ownership.paidByUserId,
        beneficiaryUserIds: ownership.beneficiaryUserIds,
        source: "manual",
        visibility: EntryVisibility.workspace,
      },
      {
        prisma,
        revalidatePath,
        updateTag,
      },
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to create entry:", error);
    return {
      success: false,
      message:
        t.entryActions.saveFailed,
    };
  }
}

export async function updateEntry(
  entryId: string,
  formData: FormData,
): Promise<CreateEntryResult> {
  const t = await getActionTranslations();
  const id = entryId.trim();
  const errors: Record<string, string> = {};

  if (!id) {
    errors.entryId = t.entryActions.invalidId;
  }

  const title = getText(formData, "title");
  const categoryId = getText(formData, "categoryId");
  const note = getText(formData, "note");
  const dateValue = getText(formData, "date");

  // Read the stored mode, never the submitted one: an entry already saved as
  // avoided stays editable, while a "spent" entry can never be converted into
  // one. New avoided entries are rejected in resolveEntryMoneyFromForm.
  let allowExistingAvoided = false;

  if (id) {
    try {
      const workspaceId = await getCurrentWorkspaceId();
      const storedEntry = await prisma.entry.findUnique({
        where: { id, workspaceId },
        select: { mode: true },
      });
      allowExistingAvoided = storedEntry?.mode === "avoided";
    } catch (error) {
      unstable_rethrow(error);
      allowExistingAvoided = false;
    }
  }

  const entryMoney = resolveEntryMoneyFromForm(formData, t, {
    allowExistingAvoided,
  });
  let members: WorkspaceMemberOption[] = [];

  try {
    members = await getCurrentWorkspaceMembers();
  } catch {
    members = [];
  }

  const payment = resolveEntryPaymentAndOwnership(formData, members, t);
  const ownership = validateEntryOwnership(payment.ownershipInput, members);

  if (!title) {
    errors.title = t.validation.titleRequired;
  } else if (title.length < 2) {
    errors.title = "Il titolo deve avere almeno 2 caratteri";
  }

  if (!categoryId) {
    errors.categoryId = t.validation.selectCategory;
  }
  Object.assign(errors, entryMoney.errors);
  Object.assign(errors, payment.errors);

  if (!ownership.ok) {
    Object.assign(errors, ownership.errors);
  }

  if (!dateValue || !isDateKey(dateValue)) {
    errors.date = t.entryActions.invalidDate;
  }

  if (Object.keys(errors).length > 0 || !ownership.ok) {
    return {
      success: false,
      message: t.validation.checkFields,
      errors,
    };
  }

  if (!entryMoney.money) {
    return {
      success: false,
      message: t.validation.checkFields,
      errors,
    };
  }

  const money = entryMoney.money;

  try {
    const [workspaceId, timeZone] = await Promise.all([
      getCurrentWorkspaceId(),
      getCurrentWorkspaceTimezone(),
    ]);

    const date = parseWorkspaceDateKey(dateValue, timeZone);

    if (!date) {
      return {
        success: false,
        message: t.validation.checkFields,
        errors: { date: t.entryActions.invalidDate },
      };
    }

    const existingEntry = await prisma.entry.findUnique({
      where: { id, workspaceId },
      select: {
        id: true,
        source: true,
        habitOccurrenceId: true,
        createdByUserId: true,
        paidByUserId: true,
      },
    });

    if (!existingEntry) {
      return {
        success: false,
        message: t.entryActions.notFound,
      };
    }

    const currentUser = await getCurrentUser();
    const category = await resolveEntryCategory(categoryId, workspaceId);

    if (!category) {
      return {
        success: false,
        message: t.validation.checkFields,
        errors: {
          categoryId: t.validation.selectValidCategory,
        },
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.entryBeneficiary.deleteMany({
        where: {
          entryId: id,
          entry: {
            is: { workspaceId },
          },
        },
      });

      await tx.entry.update({
        where: { id, workspaceId },
        data: {
          workspaceId,
          title,
          categoryId: category.id,
          realCost: toDecimalString(money.realCost),
          alternativeCost: toDecimalString(money.alternativeCost),
          savedAmount: toDecimalString(money.savedAmount),
          mode: money.mode,
          savingContext: money.savingContext,
          paymentMode: payment.paymentMode,
          date,
          note: encryptOptionalText(note),
          paidByUserId: ownership.paidByUserId,
          beneficiaries: {
            create: ownership.beneficiaryUserIds.map((userId) => ({ userId })),
          },
          source: existingEntry.source,
          habitOccurrenceId: existingEntry.habitOccurrenceId,
          createdByUserId: existingEntry.createdByUserId ?? currentUser.id,
          visibility: EntryVisibility.workspace,
        },
      });
    });

    revalidateEntryDependentViews(workspaceId, { revalidatePath, updateTag });

    return {
      success: true,
      message: t.entryActions.updated,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to update entry:", error);
    return {
      success: false,
      message:
        t.entryActions.updateFailedDb,
    };
  }
}

type DeleteEntryResult = {
  success: boolean;
  message: string;
};

export async function deleteEntry(entryId: string): Promise<DeleteEntryResult> {
  const t = await getActionTranslations();
  const id = entryId.trim();

  if (!id) {
    return {
      success: false,
      message: t.entryActions.invalidId,
    };
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();
    const entry = await prisma.entry.findUnique({
      where: { id, workspaceId },
      select: {
        id: true,
        source: true,
        habitOccurrenceId: true,
      },
    });

    if (!entry) {
      return {
        success: false,
        message: t.entryActions.notFound,
      };
    }

    if (entry.habitOccurrenceId) {
      const habitOccurrence = await prisma.habitOccurrence.findFirst({
        where: {
          id: entry.habitOccurrenceId,
          habit: { workspaceId },
        },
        include: {
          habit: {
            select: {
              workspaceId: true,
            },
          },
        },
      });

      await requireWorkspaceAccessForRecord(habitOccurrence, "Occorrenza abitudine");

      await prisma.$transaction([
        prisma.entry.delete({
          where: { id, workspaceId },
        }),
        prisma.habitOccurrence.updateMany({
          where: {
            id: entry.habitOccurrenceId,
            habit: { workspaceId },
          },
          data: {
            status: "skipped",
          },
        }),
      ]);
    } else {
      await prisma.entry.delete({
        where: { id, workspaceId },
      });
    }

    revalidateEntryDependentViews(workspaceId, { revalidatePath, updateTag });

    return {
      success: true,
      message: t.entryActions.deleted,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to delete entry:", error);
    return {
      success: false,
      message: t.validation.deleteError,
    };
  }
}
