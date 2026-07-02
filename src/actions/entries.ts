"use server";

import { subDays } from "date-fns";
import { Prisma } from "@/src/lib/generated/prisma/client";
import { cacheLife, cacheTag, revalidatePath, updateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { mergeCategoryOptions } from "@/src/lib/categories";
import {
  toEntryMoneyView,
  type EntryMode,
  type EntrySavingContext,
} from "@/src/lib/entry-domain";
import { logAndRethrowDataLoadError } from "@/src/lib/data-load-error";
import {
  decryptOptionalText,
  encryptOptionalText,
  shouldQueryEncryptedTextFields,
} from "@/src/lib/field-encryption";
import {
  entryMetricAggregateSelectSql,
  normalizeEntryMetricAggregate,
  type EntryMetricAggregateRow,
} from "@/src/lib/entry-metrics-query";
import { getMonthRangeForMonthKey, normalizeMonthKey } from "@/src/lib/workspace-dates";
import {
  parseBeneficiaryUserIdsFromForm,
  parsePaidByUserIdFromForm,
  validateEntryOwnership,
} from "@/src/lib/entry-ownership";
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
import { prisma } from "@/src/lib/prisma";
import {
  getDefaultPaidByUserId,
  getMemberLabel,
  resolveEntryPeopleFromRecord,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";
import {
  normalizeEntryPaymentMode,
  parseEntryPaymentModeFromForm,
  type EntryPaymentModeValue,
} from "@/src/lib/entry-payment-mode";
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

type EntryWithCategory = {
  id: string;
  title: string;
  categoryId: string;
  realCost: unknown;
  alternativeCost: unknown;
  savedAmount: unknown;
  mode: unknown;
  savingContext: unknown;
  paymentMode: unknown;
  date: Date;
  note: string | null;
  source: string;
  beneficiaries: { userId: string }[];
  paidByUserId: string | null;
  habitOccurrenceId: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
    icon: string | null;
  };
};

type SerializableEntry = {
  id: string;
  title: string;
  categoryId: string;
  mode: EntryMode;
  savingContext: EntrySavingContext;
  paymentMode: EntryPaymentModeValue;
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  amountSpent: number;
  comparisonAmount: number;
  savingImpact: number;
  date: string;
  note: string | null;
  source: string;
  paidByUserId: string;
  paidByLabel: string | null;
  beneficiaryUserIds: string[];
  habitOccurrenceId: string | null;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
    icon: string | null;
  };
};

type SerializableEntryEdit = {
  id: string;
  title: string;
  categoryId: string;
  mode: EntryMode;
  savingContext: EntrySavingContext;
  paymentMode: EntryPaymentModeValue;
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  amountSpent: number;
  comparisonAmount: number;
  savingImpact: number;
  date: string;
  note: string | null;
  source: string;
  paidByUserId: string;
  beneficiaryUserIds: string[];
};

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
  kind?: "all" | "spesa" | "evitata" | "confronto";
};

function toDecimalString(value: number): string {
  return value.toFixed(2);
}

function toFiniteNumber(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function tryRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    console.warn(`Failed to revalidate ${path}:`, error);
  }
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

function resolveEntryPaymentAndOwnership(
  formData: FormData,
  members: WorkspaceMemberOption[],
): {
  paymentMode: EntryPaymentModeValue;
  ownershipInput: {
    paidByUserId: string;
    beneficiaryUserIds: string[];
  };
  errors: Record<string, string>;
} {
  const paymentMode = parseEntryPaymentModeFromForm(formData);

  if (paymentMode !== "joint_account") {
    return {
      paymentMode,
      ownershipInput: {
        paidByUserId: parsePaidByUserIdFromForm(formData),
        beneficiaryUserIds: parseBeneficiaryUserIdsFromForm(formData),
      },
      errors: {},
    };
  }

  if (members.length !== 2) {
    return {
      paymentMode,
      ownershipInput: {
        paidByUserId: parsePaidByUserIdFromForm(formData),
        beneficiaryUserIds: parseBeneficiaryUserIdsFromForm(formData),
      },
      errors: {
        paymentMode: "Pagata insieme è disponibile solo nei workspace con due membri",
      },
    };
  }

  return {
    paymentMode,
    ownershipInput: {
      paidByUserId: getDefaultPaidByUserId(members),
      beneficiaryUserIds: members.map((member) => member.userId),
    },
    errors: {},
  };
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

function normalizeSearchQuery(query?: string): string {
  return query?.trim().toLowerCase() ?? "";
}

function isLikelyImportedNoise(title: string, note?: string | null): boolean {
  const text = `${title} ${note ?? ""}`.toLowerCase();

  return [
    "csv",
    "import",
    "statement",
    "transaction",
    "paypal",
    "stripe",
    "revolut",
    "nexi",
    "bank",
    "addebito",
    "bonifico",
  ].some((pattern) => text.includes(pattern));
}

function parseSimpleAmountQuery(query: string): Prisma.Decimal | null {
  const cleaned = query.replace(/[^\d,.-]/g, "").trim();

  if (!cleaned) {
    return null;
  }

  const normalized =
    cleaned.includes(",") && cleaned.includes(".")
      ? cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "")
      : cleaned.replace(",", ".");

  if (!/^[-+]?\d*(\.\d+)?$/.test(normalized) || normalized === "+" || normalized === "-" || normalized === "." || normalized === "-.") {
    return null;
  }

  try {
    return new Prisma.Decimal(normalized);
  } catch {
    return null;
  }
}

function buildEntriesSearchWhere(
  query: string,
  members: WorkspaceMemberOption[],
): Prisma.EntryWhereInput {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return {};
  }

  const matchingMemberIds = members
    .filter((member) => {
      const haystacks = [member.label, member.name, member.email, member.userId];
      return haystacks.some((value) =>
        value?.toLowerCase().includes(normalizedQuery),
      );
    })
    .map((member) => member.userId);

  const amount = parseSimpleAmountQuery(normalizedQuery);
  const textWhere: Prisma.EntryWhereInput[] = [
    {
      title: {
        contains: normalizedQuery,
        mode: "insensitive",
      },
    },
    {
      category: {
        is: {
          OR: [
            {
              name: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            {
              slug: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
          ],
        },
      },
    },
  ];

  if (shouldQueryEncryptedTextFields()) {
    textWhere.push({
      note: {
        contains: normalizedQuery,
        mode: "insensitive",
      },
    });
  }

  if (amount) {
    textWhere.push({
      OR: [
        { realCost: amount },
        { alternativeCost: amount },
        { savedAmount: amount },
      ],
    });
  }

  if (matchingMemberIds.length > 0) {
    textWhere.push({
      OR: [
        {
          paidByUserId: {
            in: matchingMemberIds,
          },
        },
        {
          beneficiaries: {
            some: {
              userId: {
                in: matchingMemberIds,
              },
            },
          },
        },
      ],
    });
  }

  return {
    OR: textWhere,
  };
}

function buildEntriesKindWhere(
  kind?: EntriesPageOptions["kind"],
): Prisma.EntryWhereInput {
  if (!kind || kind === "all") {
    return {};
  }

  if (kind === "evitata") {
    return { mode: "avoided" };
  }

  if (kind === "confronto") {
    return { mode: "spent", savingContext: "comparison" };
  }

  return { mode: "spent", savingContext: "none" };
}

function serializeEntry(
  entry: EntryWithCategory,
  members: WorkspaceMemberOption[],
): SerializableEntry {
  const people = resolveEntryPeopleFromRecord(entry, members);
  const money = toEntryMoneyView(entry);

  return {
    id: entry.id,
    title: entry.title,
    categoryId: entry.categoryId,
    mode: money.mode,
    savingContext: money.savingContext,
    paymentMode: normalizeEntryPaymentMode(entry.paymentMode),
    realCost: money.realCost,
    alternativeCost: money.alternativeCost,
    savedAmount: money.savedAmount,
    amountSpent: money.amountSpent,
    comparisonAmount: money.comparisonAmount,
    savingImpact: money.savingImpact,
    date: entry.date.toISOString(),
    note: decryptOptionalText(entry.note),
    source: entry.source,
    paidByUserId: people.paidByUserId,
    paidByLabel: getMemberLabel(members, people.paidByUserId),
    beneficiaryUserIds: people.beneficiaryUserIds,
    habitOccurrenceId: entry.habitOccurrenceId,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    category: {
      id: entry.category.id,
      name: entry.category.name,
      slug: entry.category.slug,
      color: entry.category.color,
      icon: entry.category.icon,
    },
  };
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
    return {
      entries: [],
      nextCursor: null,
      hasMore: false,
    };
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
    const people = resolveEntryPeopleFromRecord(entry, members);
    const money = toEntryMoneyView(entry);

    return {
      id: entry.id,
      title: entry.title,
      categoryId: entry.categoryId,
      mode: money.mode,
      savingContext: money.savingContext,
      paymentMode: normalizeEntryPaymentMode(entry.paymentMode),
      realCost: money.realCost,
      alternativeCost: money.alternativeCost,
      savedAmount: money.savedAmount,
      amountSpent: money.amountSpent,
      comparisonAmount: money.comparisonAmount,
      savingImpact: money.savingImpact,
      date: entry.date.toISOString(),
      note: decryptOptionalText(entry.note),
      source: entry.source,
      paidByUserId: people.paidByUserId,
      beneficiaryUserIds: people.beneficiaryUserIds,
    };
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
  const errors: Record<string, string> = {};

  const title = getText(formData, "title");
  const categoryId = getText(formData, "categoryId");
  const note = getText(formData, "note");
  const dateValue = getText(formData, "date");
  const entryMoney = resolveEntryMoneyFromForm(formData);

  if (!title) {
    errors.title = "Il titolo è obbligatorio";
  } else if (title.length < 2) {
    errors.title = "Il titolo deve avere almeno 2 caratteri";
  }

  if (!categoryId) {
    errors.categoryId = "Seleziona una categoria";
  }
  Object.assign(errors, entryMoney.errors);

  const date = new Date(dateValue);
  if (!dateValue || Number.isNaN(date.getTime())) {
    errors.date = "Inserisci una data valida";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Controlla i campi evidenziati",
      errors,
    };
  }

  if (!entryMoney.money) {
    return {
      success: false,
      message: "Controlla i campi evidenziati",
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
    const [currentUser, workspaceId, members, category] = await Promise.all([
      currentUserPromise,
      workspaceIdPromise,
      membersPromise,
      categoryPromise,
    ]);

    const payment = resolveEntryPaymentAndOwnership(formData, members);
    const ownership = validateEntryOwnership(payment.ownershipInput, members);

    Object.assign(errors, payment.errors);

    if (!ownership.ok) {
      Object.assign(errors, ownership.errors);
    }

    if (Object.keys(errors).length > 0 || !ownership.ok) {
      return {
        success: false,
        message: "Controlla i campi evidenziati",
        errors,
      };
    }

    if (!category) {
      return {
        success: false,
        message: "Controlla i campi evidenziati",
        errors: {
          categoryId: "Seleziona una categoria valida",
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
        revalidatePath: tryRevalidatePath,
        updateTag,
      },
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to create entry:", error);
    return {
      success: false,
      message:
        "Non riesco a salvare il movimento adesso. Controlla il database e riprova tra poco.",
    };
  }
}

export async function updateEntry(
  entryId: string,
  formData: FormData,
): Promise<CreateEntryResult> {
  const id = entryId.trim();
  const errors: Record<string, string> = {};

  if (!id) {
    errors.entryId = "ID movimento non valido";
  }

  const title = getText(formData, "title");
  const categoryId = getText(formData, "categoryId");
  const note = getText(formData, "note");
  const dateValue = getText(formData, "date");
  const entryMoney = resolveEntryMoneyFromForm(formData);
  let members: WorkspaceMemberOption[] = [];

  try {
    members = await getCurrentWorkspaceMembers();
  } catch {
    members = [];
  }

  const payment = resolveEntryPaymentAndOwnership(formData, members);
  const ownership = validateEntryOwnership(payment.ownershipInput, members);

  if (!title) {
    errors.title = "Il titolo è obbligatorio";
  } else if (title.length < 2) {
    errors.title = "Il titolo deve avere almeno 2 caratteri";
  }

  if (!categoryId) {
    errors.categoryId = "Seleziona una categoria";
  }
  Object.assign(errors, entryMoney.errors);
  Object.assign(errors, payment.errors);

  if (!ownership.ok) {
    Object.assign(errors, ownership.errors);
  }

  const date = new Date(dateValue);
  if (!dateValue || Number.isNaN(date.getTime())) {
    errors.date = "Inserisci una data valida";
  }

  if (Object.keys(errors).length > 0 || !ownership.ok) {
    return {
      success: false,
      message: "Controlla i campi evidenziati",
      errors,
    };
  }

  if (!entryMoney.money) {
    return {
      success: false,
      message: "Controlla i campi evidenziati",
      errors,
    };
  }

  const money = entryMoney.money;

  try {
    const workspaceId = await getCurrentWorkspaceId();
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
        message: "Movimento non trovato",
      };
    }

    const currentUser = await getCurrentUser();
    const category = await resolveEntryCategory(categoryId, workspaceId);

    if (!category) {
      return {
        success: false,
        message: "Controlla i campi evidenziati",
        errors: {
          categoryId: "Seleziona una categoria valida",
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

    tryRevalidatePath("/");
    tryRevalidatePath("/entries");
    tryRevalidatePath("/stats");
    tryRevalidatePath("/habits");
    tryRevalidatePath("/goals");
    tryRevalidatePath("/reports/monthly");
    tryRevalidatePath("/workspace/budgets");
    tryRevalidatePath("/more");
    updateTag(`entries:${workspaceId}`);
    updateTag(`goals:${workspaceId}`);

    return {
      success: true,
      message: "Movimento aggiornato con successo",
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to update entry:", error);
    return {
      success: false,
      message:
        "Non riesco ad aggiornare il movimento adesso. Controlla il database e riprova tra poco.",
    };
  }
}

type DeleteEntryResult = {
  success: boolean;
  message: string;
};

export async function deleteEntry(entryId: string): Promise<DeleteEntryResult> {
  const id = entryId.trim();

  if (!id) {
    return {
      success: false,
      message: "ID movimento non valido",
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
        message: "Movimento non trovato",
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

    tryRevalidatePath("/");
    tryRevalidatePath("/entries");
    tryRevalidatePath("/stats");
    tryRevalidatePath("/habits");
    tryRevalidatePath("/goals");
    tryRevalidatePath("/reports/monthly");
    tryRevalidatePath("/workspace/budgets");
    tryRevalidatePath("/more");
    updateTag(`entries:${workspaceId}`);
    updateTag(`goals:${workspaceId}`);

    return {
      success: true,
      message: "Movimento eliminato",
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to delete entry:", error);
    return {
      success: false,
      message: "Si è verificato un errore durante l'eliminazione",
    };
  }
}
