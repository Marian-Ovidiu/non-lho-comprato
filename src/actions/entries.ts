"use server";

import { subDays } from "date-fns";
import { Prisma } from "@/src/lib/generated/prisma/client";
import { revalidatePath } from "next/cache";

import { DEFAULT_CATEGORIES, mergeCategoryOptions } from "@/src/lib/categories";
import { calculateSavedAmount } from "@/src/lib/entry-calculations";
import { resolveIsFirstEntryOfDay } from "@/src/lib/entry-first-of-day";
import { getGlobalStreak } from "@/src/actions/streaks";
import {
  parseBeneficiaryUserIdsFromForm,
  parsePaidByUserIdFromForm,
  validateEntryOwnership,
} from "@/src/lib/entry-ownership";
import { EntryVisibility, type Person } from "@/src/lib/generated/prisma/enums";
import { syncEntryPersonColumns } from "@/src/lib/entry-person-sync";
import { refreshSupabaseSessionForAction } from "@/src/lib/auth/action-session";
import { withDatabaseRetry } from "@/src/lib/db-retry";
import { prisma } from "@/src/lib/prisma";
import { buildPersonWhere, type PersonFilterValue } from "@/src/lib/person-filter";
import type { LegacyPersonValue } from "@/src/lib/ui-person";
import {
  resolveEntryPeopleFromRecord,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";
import {
  getCurrentUser,
  getCurrentWorkspaceId,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceScopedWhere,
  requireWorkspaceAccessForRecord,
} from "@/src/lib/workspace-context";
import {
  formatEntryLoadError,
  isEntryLoadDebugEnabled,
  logEntryLoadStep,
} from "@/src/lib/entry-load-debug";
import {
  entryListSelect,
  entryListSelectWithBeneficiaries,
} from "@/src/lib/entry-list-select";
import {
  buildExpenseSuggestion,
  type ExpenseSuggestionCandidate,
  type ExpenseSuggestionInput,
  type ExpenseSuggestionResult,
} from "@/src/lib/expense-suggestion";
import { isWorkspaceDebugEnabled, logWorkspaceDebug } from "@/src/lib/workspace-debug";

type CreateEntryResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
  isFirstEntryCreated?: boolean;
  isFirstEntryOfDay?: boolean;
  streakFrom?: number;
  streakTo?: number;
};

type EntryWithCategory = {
  id: string;
  title: string;
  categoryId: string;
  realCost: unknown;
  alternativeCost: unknown;
  savedAmount: unknown;
  date: Date;
  note: string | null;
  source: string;
  person: Person;
  paidBy: Person;
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
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  date: string;
  note: string | null;
  source: string;
  person: LegacyPersonValue;
  paidByUserId: string;
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
  realCost: number;
  alternativeCost: number;
  date: string;
  note: string | null;
  source: string;
  paidByUserId: string;
  beneficiaryUserIds: string[];
};

type EntryEditRecord = {
  id: string;
  title: string;
  categoryId: string;
  realCost: unknown;
  alternativeCost: unknown;
  date: Date;
  note: string | null;
  source: string;
  paidByUserId: string | null;
  workspaceId: string | null;
  beneficiaries: { userId: string }[];
};

type MonthlySummary = {
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
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
  realCost: unknown;
  savedAmount: unknown;
  alternativeCost: unknown;
  note: string | null;
};

type DashboardReflectionEntry = {
  category: {
    id: string;
    name: string;
  };
  savedAmount: unknown;
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
  person?: PersonFilterValue;
  q?: string;
  cursor?: string;
  limit?: number;
  members?: WorkspaceMemberOption[] | Promise<WorkspaceMemberOption[]>;
};

function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getMoney(formData: FormData, name: string): {
  value: number;
  error?: string;
} {
  const raw = getText(formData, name);

  if (!raw) {
    return { value: Number.NaN, error: "Questo campo è obbligatorio" };
  }

  const normalized = raw.replace(",", ".");
  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    return { value: Number.NaN, error: "Inserisci un numero valido" };
  }

  if (value < 0) {
    return { value, error: "Il valore deve essere maggiore o uguale a 0" };
  }

  return { value };
}

function resolveAlternativeCost(
  formData: FormData,
  realCost: { value: number; error?: string },
): { value: number; error?: string } {
  const raw = getText(formData, "alternativeCost");

  if (!raw) {
    if (realCost.error) {
      return { value: Number.NaN };
    }

    return { value: realCost.value };
  }

  return getMoney(formData, "alternativeCost");
}

function toDecimalString(value: number): string {
  return value.toFixed(2);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
}

function tryRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    console.warn(`Failed to revalidate ${path}:`, error);
  }
}

async function resolveCategory(categoryId: string, workspaceId: string) {
  let category = await prisma.category.findFirst({
    where: await getCurrentWorkspaceScopedWhere({
      id: categoryId,
    }),
  });

  if (!category) {
    category = await prisma.category.findFirst({
      where: await getCurrentWorkspaceScopedWhere({
        slug: categoryId,
      }),
    });
  }

  if (!category) {
    const fallbackCategory = DEFAULT_CATEGORIES.find(
      (item) => item.slug === categoryId,
    );

    if (fallbackCategory) {
      category = await prisma.category.upsert({
        where: { slug: fallbackCategory.slug },
        update: {
          name: fallbackCategory.name,
          icon: fallbackCategory.icon,
          color: fallbackCategory.color,
          workspaceId,
        },
        create: {
          name: fallbackCategory.name,
          slug: fallbackCategory.slug,
          icon: fallbackCategory.icon,
          color: fallbackCategory.color,
          workspaceId,
        },
      });
    }
  }

  return category;
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

function isMissingEntryBeneficiaryTable(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String(error.code) : "";
  if (code === "P2021") {
    return true;
  }

  const message = "message" in error ? String(error.message) : "";
  return (
    message.includes("EntryBeneficiary") &&
    message.includes("does not exist")
  );
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
      prismaCode === "P2021" || isMissingEntryBeneficiaryTable(error)
        ? 'Run "npx prisma migrate deploy" to create EntryBeneficiary.'
        : undefined,
  });
  console.error(error);
}

async function findEntriesForList(
  where: Awaited<ReturnType<typeof getCurrentWorkspaceScopedWhere>>,
): Promise<EntryWithCategory[]> {
  const baseQuery = {
    where,
    orderBy: [
      {
        date: "desc" as const,
      },
      {
        createdAt: "desc" as const,
      },
      {
        id: "desc" as const,
      },
    ],
    select: entryListSelect,
  };

  try {
    return await prisma.entry.findMany({
      ...baseQuery,
      select: entryListSelectWithBeneficiaries,
    });
  } catch (error) {
    if (!isMissingEntryBeneficiaryTable(error)) {
      throw error;
    }

    logEntryLoadError("findEntriesForList.beneficiariesInclude", error, {
      fallback: "legacy-person-fields",
      where,
    });

    const entries = await prisma.entry.findMany(baseQuery);
    return entries.map((entry) => ({
      ...entry,
      beneficiaries: [],
    }));
  }
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

  try {
    if (options.cursor) {
      return await prisma.entry.findMany({
        where,
        take: options.limit + 1,
        cursor: { id: options.cursor },
        skip: 1,
        orderBy,
        select: entryListSelectWithBeneficiaries,
      });
    }

    return await prisma.entry.findMany({
      where,
      take: options.limit + 1,
      orderBy,
      select: entryListSelectWithBeneficiaries,
    });
  } catch (error) {
    if (!isMissingEntryBeneficiaryTable(error)) {
      throw error;
    }

    logEntryLoadError("findEntriesPage.beneficiariesInclude", error, {
      fallback: "legacy-person-fields",
      where,
      cursor: options.cursor ?? null,
      limit: options.limit,
    });

    const entries = options.cursor
      ? await prisma.entry.findMany({
          where,
          take: options.limit + 1,
          cursor: { id: options.cursor },
          skip: 1,
          orderBy,
          select: entryListSelect,
        })
      : await prisma.entry.findMany({
          where,
          take: options.limit + 1,
          orderBy,
          select: entryListSelect,
        });

    return entries.map((entry) => ({
      ...entry,
      beneficiaries: [],
    }));
  }
}

async function findExpenseSuggestionCandidates(
  where: Prisma.EntryWhereInput,
): Promise<Array<ExpenseSuggestionCandidate>> {
  try {
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
      .filter((entry) => !isLikelyImportedNoise(entry.title, entry.note))
      .map((entry) => ({
        title: entry.title,
        realCost: toNumber(entry.realCost),
        date: entry.date,
        paidByUserId: entry.paidByUserId,
        beneficiaryUserIds: entry.beneficiaries.map(
          (beneficiary) => beneficiary.userId,
        ),
      }));
  } catch (error) {
    if (!isMissingEntryBeneficiaryTable(error)) {
      throw error;
    }

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
      },
    });

    return entries
      .filter((entry) => !isLikelyImportedNoise(entry.title, entry.note))
      .map((entry) => ({
        title: entry.title,
        realCost: toNumber(entry.realCost),
        date: entry.date,
        paidByUserId: entry.paidByUserId,
        beneficiaryUserIds: [],
      }));
  }
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
      note: {
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

function serializeEntry(
  entry: EntryWithCategory,
  members: WorkspaceMemberOption[],
): SerializableEntry {
  const people = resolveEntryPeopleFromRecord(entry, members);

  return {
    id: entry.id,
    title: entry.title,
    categoryId: entry.categoryId,
    realCost: toNumber(entry.realCost),
    alternativeCost: toNumber(entry.alternativeCost),
    savedAmount: toNumber(entry.savedAmount),
    date: entry.date.toISOString(),
    note: entry.note,
    source: entry.source,
    person: entry.person,
    paidByUserId: people.paidByUserId,
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

export async function getEntries(
  person?: PersonFilterValue,
): Promise<SerializableEntry[]> {
  let workspaceId = "unknown";

  logEntryLoadStep("start", {
    personFilter: person ?? "all",
  });

  try {
    const [workspaceWhere, members] = await Promise.all([
      getCurrentWorkspaceScopedWhere(buildPersonWhere(person)),
      getCurrentWorkspaceMembers(),
    ]);

    workspaceId = workspaceWhere.workspaceId;

    logEntryLoadStep("where", {
      workspaceId,
      personFilter: person ?? "all",
      prismaWhere: workspaceWhere,
    });

    const rawCount = await prisma.entry.count({
      where: workspaceWhere,
    });

    logEntryLoadStep("rawCount", {
      workspaceId,
      rawCount,
    });

    const entries = await findEntriesForList(workspaceWhere);

    logEntryLoadStep("result", {
      workspaceId,
      rawCount,
      resultLength: entries.length,
    });

    if (isEntryLoadDebugEnabled() || isWorkspaceDebugEnabled()) {
      logWorkspaceDebug("getEntries", {
        workspaceId,
        personFilter: person ?? "all",
        prismaWhere: workspaceWhere,
        rawCount,
        entryCount: entries.length,
      });
    }

    return entries.map((entry) => serializeEntry(entry, members));
  } catch (error) {
    logEntryLoadError("getEntries", error, {
      workspaceId,
      personFilter: person ?? "all",
    });

    logEntryLoadStep("error", {
      workspaceId,
      personFilter: person ?? "all",
      message: formatEntryLoadError(error),
    });

    if (isWorkspaceDebugEnabled()) {
      logWorkspaceDebug("getEntries.error", {
        workspaceId,
        personFilter: person ?? "all",
        message: formatEntryLoadError(error),
      });
    }

    throw error;
  }
}

export async function getEntriesPage(
  personOrOptions?: PersonFilterValue | EntriesPageOptions,
  maybeOptions?: Omit<EntriesPageOptions, "person">,
): Promise<EntriesPageResult> {
  await refreshSupabaseSessionForAction();

  const options =
    typeof personOrOptions === "string" || personOrOptions === undefined
      ? {
          person: personOrOptions,
          ...(maybeOptions ?? {}),
        }
      : personOrOptions;

  const limit = options.limit ?? 20;
  const cursor = options.cursor?.trim() || undefined;
  const person = options.person;
  const searchQuery = normalizeSearchQuery(options.q);

  let workspaceId = "unknown";

  try {
    const membersPromise = options.members
      ? Promise.resolve(options.members)
      : getCurrentWorkspaceMembers();
    const [workspaceWhere, members] = await Promise.all([
      getCurrentWorkspaceScopedWhere(buildPersonWhere(person)),
      membersPromise,
    ]);

    workspaceId = workspaceWhere.workspaceId;
    const searchWhere = buildEntriesSearchWhere(searchQuery, members);
    const combinedWhere =
      Object.keys(searchWhere).length > 0
        ? {
            AND: [workspaceWhere, searchWhere],
          }
        : workspaceWhere;

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
    logEntryLoadError("getEntriesPage", error, {
      workspaceId,
      personFilter: person ?? "all",
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
    const entrySelect = {
      id: true,
      title: true,
      categoryId: true,
      realCost: true,
      alternativeCost: true,
      date: true,
      note: true,
      source: true,
      paidByUserId: true,
      workspaceId: true,
    } as const;

    let entry: EntryEditRecord | null = null;

    try {
      entry = await prisma.entry.findUnique({
        where: { id },
        select: {
          ...entrySelect,
          beneficiaries: {
            select: {
              userId: true,
            },
          },
        },
      });
    } catch (error) {
      if (!isMissingEntryBeneficiaryTable(error)) {
        throw error;
      }

      logEntryLoadError("getEntryById.beneficiariesSelect", error, {
        entryId: id,
        fallback: "legacy-person-fields",
      });

      const legacyEntry = await prisma.entry.findUnique({
        where: { id },
        select: entrySelect,
      });

      entry = legacyEntry
        ? {
            ...legacyEntry,
            beneficiaries: [],
          }
        : null;
    }

    if (!entry) {
      return null;
    }

    await requireWorkspaceAccessForRecord(entry, "Movimento");

    const members = await getCurrentWorkspaceMembers();
    const people = resolveEntryPeopleFromRecord(entry, members);

    return {
      id: entry.id,
      title: entry.title,
      categoryId: entry.categoryId,
      realCost: toNumber(entry.realCost),
      alternativeCost: toNumber(entry.alternativeCost),
      date: entry.date.toISOString(),
      note: entry.note,
      source: entry.source,
      paidByUserId: people.paidByUserId,
      beneficiaryUserIds: people.beneficiaryUserIds,
    };
  } catch (error) {
    logEntryLoadError("getEntryById", error, { entryId: id });
    throw error;
  }
}

export async function getDashboardSummary(
  person?: PersonFilterValue,
): Promise<MonthlySummary> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const nextMonthStart = startOfNextMonth(now);
  const workspaceWhere = await getCurrentWorkspaceScopedWhere({
    ...buildPersonWhere(person),
    date: {
      gte: monthStart,
      lt: nextMonthStart,
    },
  });

  const entries = await prisma.entry.findMany({
    where: workspaceWhere,
    select: {
      realCost: true,
      alternativeCost: true,
      savedAmount: true,
    },
  });

  if (isWorkspaceDebugEnabled()) {
    const allTimeCount = await prisma.entry.count({
      where: {
        workspaceId: workspaceWhere.workspaceId,
      },
    });

    logWorkspaceDebug("getDashboardSummary", {
      workspaceId: workspaceWhere.workspaceId,
      personFilter: person ?? "all",
      monthStart: monthStart.toISOString(),
      nextMonthStart: nextMonthStart.toISOString(),
      entriesThisMonth: entries.length,
      entriesAllTimeInWorkspace: allTimeCount,
    });
  }

  const summary: MonthlySummary = {
    totalRealSpent: 0,
    totalAlternativeCost: 0,
    totalSaved: 0,
    entriesCount: 0,
  };

  for (const entry of entries) {
    summary.totalRealSpent += Number(entry.realCost);
    summary.totalAlternativeCost += Number(entry.alternativeCost);
    summary.totalSaved += Number(entry.savedAmount);
    summary.entriesCount += 1;
  }

  return {
    totalRealSpent: Number(summary.totalRealSpent.toFixed(2)),
    totalAlternativeCost: Number(summary.totalAlternativeCost.toFixed(2)),
    totalSaved: Number(summary.totalSaved.toFixed(2)),
    entriesCount: summary.entriesCount,
  };
}

export async function getDashboardEntrySnapshot(
  person?: PersonFilterValue,
): Promise<DashboardEntrySnapshot> {
  const workspaceWhere = await getCurrentWorkspaceScopedWhere(
    buildPersonWhere(person),
  );
  const weekStart = subDays(new Date(), 7);

  try {
    const [entryCount, firstEntry, recentEntries, weekEntries] =
      await withDatabaseRetry(
        () =>
          Promise.all([
        prisma.entry.count({
          where: workspaceWhere,
        }),
        prisma.entry.findFirst({
          where: workspaceWhere,
          orderBy: [
            {
              date: "asc",
            },
            {
              createdAt: "asc",
            },
            {
              id: "asc",
            },
          ],
          select: {
            date: true,
          },
        }),
        prisma.entry.findMany({
          where: workspaceWhere,
          orderBy: [
            {
              date: "desc",
            },
            {
              createdAt: "desc",
            },
            {
              id: "desc",
            },
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
          where: {
            ...workspaceWhere,
            date: {
              gte: weekStart,
            },
          },
          orderBy: [
            {
              date: "asc",
            },
            {
              createdAt: "asc",
            },
            {
              id: "asc",
            },
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
      recentEntries,
      weekEntries,
    };
  } catch (error) {
    console.error("Failed to load dashboard entry snapshot:", error);
    throw error;
  }
}

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: await getCurrentWorkspaceScopedWhere(),
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        icon: true,
      },
    });

    return mergeCategoryOptions(categories);
  } catch (error) {
    console.warn("Falling back to static categories:", error);
    return mergeCategoryOptions([]);
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
  const realCost = getMoney(formData, "realCost");
  const alternativeCost = resolveAlternativeCost(formData, realCost);
  let members: WorkspaceMemberOption[] = [];

  try {
    members = await getCurrentWorkspaceMembers();
  } catch {
    members = [];
  }

  const ownership = validateEntryOwnership(
    {
      paidByUserId: parsePaidByUserIdFromForm(formData),
      beneficiaryUserIds: parseBeneficiaryUserIdsFromForm(formData),
    },
    members,
  );

  if (!title) {
    errors.title = "Il titolo è obbligatorio";
  } else if (title.length < 2) {
    errors.title = "Il titolo deve avere almeno 2 caratteri";
  }

  if (!categoryId) {
    errors.categoryId = "Seleziona una categoria";
  }

  if (realCost.error) {
    errors.realCost = realCost.error;
  }

  if (alternativeCost.error) {
    errors.alternativeCost = alternativeCost.error;
  }

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

  const personFields = syncEntryPersonColumns(
    ownership.paidByUserId,
    ownership.beneficiaryUserIds,
    members,
  );

  const normalizedAlternativeCost = alternativeCost.value;
  const savedAmount = calculateSavedAmount(
    realCost.value,
    normalizedAlternativeCost,
  );

  try {
    const currentUser = await getCurrentUser();
    const workspaceId = await getCurrentWorkspaceId();
    const existingEntryCount = await prisma.entry.count({
      where: await getCurrentWorkspaceScopedWhere(),
    });
    const category = await resolveCategory(categoryId, workspaceId);

    if (!category) {
      return {
        success: false,
        message: "Controlla i campi evidenziati",
        errors: {
          categoryId: "Seleziona una categoria valida",
        },
      };
    }

    const workspaceWhere = await getCurrentWorkspaceScopedWhere();
    const isFirstEntryOfDay = await resolveIsFirstEntryOfDay(
      date,
      workspaceWhere,
      prisma,
    );
    let streakFrom: number | undefined;
    let streakTo: number | undefined;

    if (isFirstEntryOfDay) {
      streakFrom = (await getGlobalStreak()).currentStreak;
    }

    await prisma.entry.create({
      data: {
        workspaceId,
        title,
        categoryId: category.id,
        realCost: toDecimalString(realCost.value),
        alternativeCost: toDecimalString(normalizedAlternativeCost),
        savedAmount: toDecimalString(savedAmount),
        date,
        isFirstEntryOfDay,
        note: note || null,
        source: "manual",
        paidByUserId: ownership.paidByUserId,
        beneficiaries: {
          create: ownership.beneficiaryUserIds.map((userId) => ({ userId })),
        },
        person: personFields.person,
        paidBy: personFields.paidBy,
        createdByUserId: currentUser.id,
        visibility: EntryVisibility.workspace,
      },
    });

    if (isFirstEntryOfDay) {
      streakTo = (await getGlobalStreak()).currentStreak;
    }

    tryRevalidatePath("/");
    tryRevalidatePath("/entries");
    tryRevalidatePath("/stats");

    return {
      success: true,
      message: "Entrata salvata con successo",
      isFirstEntryCreated: existingEntryCount === 0,
      isFirstEntryOfDay,
      streakFrom,
      streakTo,
    };
  } catch (error) {
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
  const realCost = getMoney(formData, "realCost");
  const alternativeCost = resolveAlternativeCost(formData, realCost);
  let members: WorkspaceMemberOption[] = [];

  try {
    members = await getCurrentWorkspaceMembers();
  } catch {
    members = [];
  }

  const ownership = validateEntryOwnership(
    {
      paidByUserId: parsePaidByUserIdFromForm(formData),
      beneficiaryUserIds: parseBeneficiaryUserIdsFromForm(formData),
    },
    members,
  );

  if (!title) {
    errors.title = "Il titolo è obbligatorio";
  } else if (title.length < 2) {
    errors.title = "Il titolo deve avere almeno 2 caratteri";
  }

  if (!categoryId) {
    errors.categoryId = "Seleziona una categoria";
  }

  if (realCost.error) {
    errors.realCost = realCost.error;
  }

  if (alternativeCost.error) {
    errors.alternativeCost = alternativeCost.error;
  }

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

  const personFields = syncEntryPersonColumns(
    ownership.paidByUserId,
    ownership.beneficiaryUserIds,
    members,
  );

  const normalizedAlternativeCost = alternativeCost.value;
  const savedAmount = calculateSavedAmount(
    realCost.value,
    normalizedAlternativeCost,
  );

  try {
    const existingEntry = await prisma.entry.findUnique({
      where: { id },
      select: {
        id: true,
        source: true,
        habitOccurrenceId: true,
        workspaceId: true,
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

    await requireWorkspaceAccessForRecord(existingEntry, "Movimento");

    const currentUser = await getCurrentUser();
    const workspaceId = await getCurrentWorkspaceId();
    const category = await resolveCategory(categoryId, workspaceId);

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
        where: { entryId: id },
      });

      await tx.entry.update({
        where: { id },
        data: {
          workspaceId,
          title,
          categoryId: category.id,
          realCost: toDecimalString(realCost.value),
          alternativeCost: toDecimalString(normalizedAlternativeCost),
          savedAmount: toDecimalString(savedAmount),
          date,
          note: note || null,
          paidByUserId: ownership.paidByUserId,
          beneficiaries: {
            create: ownership.beneficiaryUserIds.map((userId) => ({ userId })),
          },
          person: personFields.person,
          paidBy: personFields.paidBy,
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

    return {
      success: true,
      message: "Movimento aggiornato con successo",
    };
  } catch (error) {
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
    const entry = await prisma.entry.findUnique({
      where: { id },
      select: {
        id: true,
        source: true,
        habitOccurrenceId: true,
        workspaceId: true,
      },
    });

    if (!entry) {
      return {
        success: false,
        message: "Movimento non trovato",
      };
    }

    await requireWorkspaceAccessForRecord(entry, "Movimento");

    if (entry.habitOccurrenceId) {
      const habitOccurrence = await prisma.habitOccurrence.findUnique({
        where: { id: entry.habitOccurrenceId },
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
          where: { id },
        }),
        prisma.habitOccurrence.update({
          where: { id: entry.habitOccurrenceId },
          data: {
            status: "skipped",
          },
        }),
      ]);
    } else {
      await prisma.entry.delete({
        where: { id },
      });
    }

    tryRevalidatePath("/");
    tryRevalidatePath("/entries");
    tryRevalidatePath("/stats");
    tryRevalidatePath("/habits");
    tryRevalidatePath("/goals");
    tryRevalidatePath("/reports/monthly");

    return {
      success: true,
      message: "Movimento eliminato",
    };
  } catch (error) {
    console.error("Failed to delete entry:", error);
    return {
      success: false,
      message: "Si è verificato un errore durante l'eliminazione",
    };
  }
}
