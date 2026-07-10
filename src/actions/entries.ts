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
  buildEntriesKindWhere,
  buildEntriesSearchWhere,
  isLikelyImportedNoise,
  normalizeSearchQuery,
  type EntriesKindFilter,
} from "@/src/features/entries/search";

import { toMoneyNumber as toNumber } from "@/src/lib/money-number";

import { subDays } from "date-fns";
import { Prisma } from "@/src/lib/generated/prisma/client";
import { cacheLife, cacheTag, revalidatePath, updateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { mergeCategoryOptions } from "@/src/lib/categories";
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
  ordinarySpent: number;
  avoidedAmount: number;
  comparisonSaved: number;
  comparisonOverspent: number;
  grossPositiveImpact: number;
  netImpact: number;
  largeComparisonImpact: number;
  ordinaryImpact: number;
};

type ExpenseSuggestionRequest = ExpenseSuggestionInput;

type DashboardEntryPreview = {
  id: string;
  title: string;
  category: {
    name: string;
    slug: string;
  };
  date: Date;
  realCost: number;
  savedAmount: number;
  alternativeCost: number;
  note: string | null;
};

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
  recentEntries: DashboardEntryPreview[];
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
    const searchWhere = buildEntriesSearchWhere(searchQuery, members);
    const kindWhere = buildEntriesKindWhere(options?.kind);
    const combinedWhere =
      Object.keys(searchWhere).length > 0 || Object.keys(kindWhere).length > 0
        ? {
            AND: [monthWhere, searchWhere, kindWhere],
          }
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
  const ordinarySpentRows = await prisma.$queryRaw<Array<{ total: unknown }>>(Prisma.sql`
    SELECT COALESCE(SUM(e."realCost"), 0)::text AS "total"
    FROM "Entry" e
    WHERE e."workspaceId" = ${workspaceId}
      AND e."date" >= ${start}
      AND e."date" < ${end}
      AND e."mode"::text <> 'avoided'
      AND e."savingContext"::text <> 'comparison'
  `);
  const ordinarySpent = Number(ordinarySpentRows[0]?.total ?? 0);

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
    ordinarySpent: Number.isFinite(ordinarySpent) ? ordinarySpent : 0,
    avoidedAmount: agg.totalAvoidedAmount,
    comparisonSaved: agg.totalComparisonSaved,
    comparisonOverspent: agg.totalComparisonOverspent,
    grossPositiveImpact: agg.totalGrossPositiveImpact,
    netImpact: agg.totalNetImpact,
    largeComparisonImpact: agg.largeComparisonImpact,
    ordinaryImpact: agg.ordinaryImpact,
  };
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
    const [entryCount, firstEntry, recentEntries, weekEntries] =
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
          where: { workspaceId },
          orderBy: [
            { date: "desc" },
            { createdAt: "desc" },
            { id: "desc" },
          ],
          take: 3,
          select: {
            id: true,
            title: true,
            date: true,
            realCost: true,
            savedAmount: true,
            alternativeCost: true,
            note: true,
            category: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
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
      recentEntries: recentEntries.map((entry) => ({
        ...entry,
        note: decryptOptionalText(entry.note),
        realCost: toFiniteNumber(entry.realCost),
        savedAmount: toFiniteNumber(entry.savedAmount),
        alternativeCost: toFiniteNumber(entry.alternativeCost),
      })),
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
        },
      }),
      getCurrentWorkspaceLanguage(),
    ]);

    const archivedDefaultSlugs = new Set<string>();
    const activeCategories = [];

    for (const cat of allCategories) {
      if (cat.archivedAt !== null) {
        if (cat.isDefault) {
          archivedDefaultSlugs.add(cat.slug);
        }
      } else {
        activeCategories.push(cat);
      }
    }

    return mergeCategoryOptions(activeCategories, archivedDefaultSlugs, language);
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
