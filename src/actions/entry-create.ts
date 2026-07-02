"use server";

import { revalidatePath, updateTag } from "next/cache";

import { getGlobalStreak } from "@/src/actions/streaks";
import { EntryVisibility } from "@/src/lib/generated/prisma/enums";
import { resolveIsFirstEntryOfDay } from "@/src/lib/entry-first-of-day";
import type { EntryMoneyResult } from "@/src/lib/entry-domain";
import type { EntryPaymentModeValue } from "@/src/lib/entry-payment-mode";
import { prisma } from "@/src/lib/prisma";
import type { Prisma } from "@/src/lib/generated/prisma/client";
import { encryptOptionalText } from "@/src/lib/field-encryption";
import {
  getCurrentWorkspaceScopedWhere,
  getCurrentWorkspaceTimezone,
} from "@/src/lib/workspace-context";

export type CreateEntryResult = {
  success: boolean;
  message: string;
  entryId?: string;
  errors?: Record<string, string>;
  isFirstEntryCreated?: boolean;
  isFirstEntryOfDay?: boolean;
  streakFrom?: number;
  streakTo?: number;
};

export type EntryCreationSource = "manual" | "habit" | "imported";

export type NormalizedEntryCreateInput = {
  workspaceId: string;
  currentUserId: string;
  title: string;
  categoryId: string;
  date: Date;
  note?: string | null;
  money: EntryMoneyResult;
  paymentMode: EntryPaymentModeValue;
  paidByUserId: string;
  beneficiaryUserIds: string[];
  source: EntryCreationSource;
  visibility?: EntryVisibility;
  importedTransactionId?: string | null;
};

export type EntryDayCountClientLike = {
  entry: {
    count(args: { where: Prisma.EntryWhereInput }): Promise<number>;
    findFirst(args: {
      where: Prisma.EntryWhereInput;
      select?: Record<string, unknown>;
    }): Promise<{ id: string } | null>;
    findUnique(args: {
      where: Record<string, unknown>;
      select?: Record<string, unknown>;
    }): Promise<{ id: string } | null>;
  };
};

export type EntryCreatePrismaLike = EntryDayCountClientLike & {
  entry: EntryDayCountClientLike["entry"] & {
    create(args: {
      data: Record<string, unknown>;
      select?: Record<string, unknown>;
    }): Promise<{ id: string }>;
  };
  importedTransaction: {
    findUnique(args: {
      where: { id: string; workspaceId?: string };
      select: { workspaceId: true } | { workspaceId: true; id?: true };
    }): Promise<{ workspaceId: string } | null>;
    update(args: {
      where: { id: string; workspaceId?: string };
      data: Record<string, unknown>;
    }): Promise<unknown>;
  };
  $transaction<T>(callback: (tx: EntryCreatePrismaLike) => Promise<T>): Promise<T>;
};

export type EntryCreateDependencies = {
  prisma?: unknown;
  getCurrentWorkspaceScopedWhere?: () => Promise<Prisma.EntryWhereInput>;
  getCurrentWorkspaceTimezone?: () => Promise<string>;
  resolveIsFirstEntryOfDay?: (
    date: Date,
    timeZone: string,
    baseWhere: Prisma.EntryWhereInput,
    client: EntryDayCountClientLike,
    options?: { excludeEntryId?: string },
  ) => Promise<boolean>;
  getGlobalStreak?: () => Promise<{ currentStreak: number }>;
  revalidatePath?: (path: string) => unknown;
  updateTag?: (tag: string) => unknown;
};

const DEFAULT_INVALIDATION_PATHS = [
  "/",
  "/entries",
  "/stats",
  "/budget",
  "/workspace/budgets",
  "/more",
];

function toDecimalString(value: number): string {
  return value.toFixed(2);
}

function tryRevalidatePath(
  path: string,
  revalidate: (path: string) => unknown,
): void {
  try {
    revalidate(path);
  } catch (error) {
    console.warn(`Failed to revalidate ${path}:`, error);
  }
}

export async function createEntryFromNormalizedInput(
  input: NormalizedEntryCreateInput,
  deps: EntryCreateDependencies = {},
): Promise<CreateEntryResult> {
  const prismaClient = (deps.prisma ?? prisma) as EntryCreatePrismaLike;
  const getWorkspaceWhere =
    deps.getCurrentWorkspaceScopedWhere ?? getCurrentWorkspaceScopedWhere;
  const getWorkspaceTimeZone =
    deps.getCurrentWorkspaceTimezone ?? getCurrentWorkspaceTimezone;
  const resolveFirstEntryOfDay = (
    deps.resolveIsFirstEntryOfDay ?? resolveIsFirstEntryOfDay
  ) as (
    date: Date,
    timeZone: string,
    baseWhere: Prisma.EntryWhereInput,
    client: EntryDayCountClientLike,
    options?: { excludeEntryId?: string },
  ) => Promise<boolean>;
  const loadGlobalStreak = deps.getGlobalStreak ?? getGlobalStreak;
  const revalidate = (deps.revalidatePath ?? revalidatePath) as (
    path: string,
  ) => unknown;
  const updateCacheTag = deps.updateTag ?? updateTag;

  const [currentWorkspaceWhere, timeZone] = await Promise.all([
    getWorkspaceWhere() as Promise<Prisma.EntryWhereInput & { workspaceId: string }>,
    getWorkspaceTimeZone(),
  ]);

  if (currentWorkspaceWhere.workspaceId !== input.workspaceId) {
    return {
      success: false,
      message: "Workspace non valido",
    };
  }

  const isFirstEntryOfDay = await resolveFirstEntryOfDay(
    input.date,
    timeZone,
    currentWorkspaceWhere,
    prismaClient as EntryDayCountClientLike,
  );

  // Only the first entry of a day can be the very first entry of the workspace
  // (otherwise an entry already exists today). Use a cheap existence check
  // (LIMIT 1) instead of counting every row, and read the streak once: the
  // cached streak returns the same value before and after this insert, so the
  // previous second read was pure overhead.
  let isFirstEntryCreated = false;
  let streakFrom: number | undefined;
  let streakTo: number | undefined;

  if (isFirstEntryOfDay) {
    const [existingEntry, streak] = await Promise.all([
      prismaClient.entry.findFirst({
        where: currentWorkspaceWhere,
        select: { id: true },
      }),
      loadGlobalStreak(),
    ]);

    isFirstEntryCreated = existingEntry === null;
    streakFrom = streak.currentStreak;
    streakTo = streak.currentStreak;
  }

  const importedTransactionId = input.importedTransactionId?.trim() || null;

  if (importedTransactionId) {
    const importedTransaction = await prismaClient.importedTransaction.findUnique({
      where: { id: importedTransactionId, workspaceId: input.workspaceId },
      select: { workspaceId: true },
    });

    if (!importedTransaction || importedTransaction.workspaceId !== input.workspaceId) {
      return {
        success: false,
        message: "Transazione importata non valida per questo workspace",
      };
    }
  }

  try {
    const entry = await prismaClient.$transaction(async (tx) => {
      const created = await tx.entry.create({
        data: {
          workspaceId: input.workspaceId,
          title: input.title,
          categoryId: input.categoryId,
          realCost: toDecimalString(input.money.realCost),
          alternativeCost: toDecimalString(input.money.alternativeCost),
          savedAmount: toDecimalString(input.money.savedAmount),
          mode: input.money.mode,
          savingContext: input.money.savingContext,
          paymentMode: input.paymentMode,
          date: input.date,
          isFirstEntryOfDay,
          note: encryptOptionalText(input.note),
          source: input.source,
          paidByUserId: input.paidByUserId,
          beneficiaries: {
            create: input.beneficiaryUserIds.map((userId) => ({ userId })),
          },
          createdByUserId: input.currentUserId,
          visibility: input.visibility ?? EntryVisibility.workspace,
        },
      });

      if (importedTransactionId) {
        await tx.importedTransaction.update({
          where: {
            id: importedTransactionId,
            workspaceId: input.workspaceId,
          },
          data: {
            entryId: created.id,
            status: "confirmed",
          },
        });
      }

      return created;
    });

    for (const path of DEFAULT_INVALIDATION_PATHS) {
      tryRevalidatePath(path, revalidate);
    }

    updateCacheTag(`entries:${input.workspaceId}`);
    updateCacheTag(`goals:${input.workspaceId}`);

    return {
      success: true,
      message: "Entrata salvata con successo",
      entryId: entry.id,
      isFirstEntryCreated,
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
