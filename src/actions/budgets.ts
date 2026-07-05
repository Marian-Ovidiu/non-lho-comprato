"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { Prisma } from "@/src/lib/generated/prisma/client";
import { refreshSupabaseSessionForAction } from "@/src/lib/auth/action-session";
import { getActionTranslations } from "@/src/lib/i18n/server";
import { it } from "@/src/lib/i18n/it";
import type { Translations } from "@/src/lib/i18n";
import { withDatabaseRetry } from "@/src/lib/db-retry";
import { prisma } from "@/src/lib/prisma";
import {
  assertWorkspaceMember,
  getCurrentUser,
  getCurrentWorkspace,
  getCurrentWorkspaceId,
} from "@/src/lib/workspace-context";
import {
  buildBudgetScopeKey,
  validateBudgetScopeInput,
  type BudgetValidationErrors,
} from "@/src/lib/budget-model";
import {
  selectDashboardBudgetSelection,
  sortBudgetSummariesForManagement,
  summarizeBudget,
  type BudgetCategoryOption,
  type BudgetSummaryEntry,
  type BudgetSummarySource,
  type BudgetSummaryView,
} from "@/src/lib/budget-summary";
import {
  selectBudgetAlertSelection,
  type BudgetAlertSelection,
} from "@/src/lib/budget-alerts";
import { getBudgetPeriodRange } from "@/src/lib/budget-period";

export type BudgetActionResult = {
  success: boolean;
  message: string;
  errors?: BudgetActionErrors;
  budgetId?: string;
};

export type BudgetActionErrors = BudgetValidationErrors & {
  budgetId?: string;
  general?: string;
};

export type WorkspaceBudgetPageData = {
  workspace: {
    id: string;
    currency: string;
    timezone: string;
  };
  categories: BudgetCategoryOption[];
  budgets: BudgetSummaryView[];
  dashboardBudgetState: ReturnType<typeof selectDashboardBudgetSelection>;
  alertSelection: BudgetAlertSelection;
};

type BudgetDelegateLike = {
  findMany: (args: Record<string, unknown>) => Promise<BudgetSummarySource[]>;
  findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  create: (args: Record<string, unknown>) => Promise<{ id: string }>;
  update: (args: Record<string, unknown>) => Promise<{ id: string }>;
  delete: (args: Record<string, unknown>) => Promise<{ id: string }>;
};

type BudgetTransactionClientLike = {
  budget: BudgetDelegateLike;
};

type BudgetPrismaLike = BudgetTransactionClientLike & {
  category: {
    findMany: (args: Record<string, unknown>) => Promise<BudgetCategoryOption[]>;
    findFirst: (args: Record<string, unknown>) => Promise<BudgetCategoryOption | null>;
  };
  entry: {
    findMany: (args: Record<string, unknown>) => Promise<BudgetSummaryEntry[]>;
  };
  $transaction<T>(
    fn: (tx: BudgetTransactionClientLike) => Promise<T>,
  ): Promise<T>;
};

type BudgetActionDeps = {
  prisma: BudgetPrismaLike;
  refreshSupabaseSessionForAction: () => Promise<unknown>;
  getTranslations: () => Promise<Translations>;
  getCurrentUser: typeof getCurrentUser;
  getCurrentWorkspace: typeof getCurrentWorkspace;
  getCurrentWorkspaceId: typeof getCurrentWorkspaceId;
  assertWorkspaceMember: typeof assertWorkspaceMember;
  revalidatePath: typeof revalidatePath;
  now: () => Date;
};

const BUDGET_REVALIDATE_PATHS = ["/budget", "/workspace/budgets", "/", "/more"] as const;

function makeDefaultDeps(): BudgetActionDeps {
  return {
    prisma: prisma as unknown as BudgetPrismaLike,
    refreshSupabaseSessionForAction,
    getTranslations: getActionTranslations,
    getCurrentUser,
    getCurrentWorkspace,
    getCurrentWorkspaceId,
    assertWorkspaceMember,
    revalidatePath,
    now: () => new Date(),
  };
}

function revalidateBudgetPaths(deps: BudgetActionDeps) {
  for (const path of BUDGET_REVALIDATE_PATHS) {
    try {
      deps.revalidatePath(path);
    } catch (error) {
      console.warn(`Failed to revalidate ${path}:`, error);
    }
  }
}

function getBudgetActionErrors(
  validationErrors: BudgetValidationErrors,
): BudgetValidationErrors {
  return validationErrors;
}

function getFormText(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getFormTexts(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function mapKnownBudgetError(
  error: unknown,
  m: Translations["budgetActions"] = it.budgetActions,
): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return m.duplicate;
  }

  return null;
}

function toActionResult(
  message: string,
  errors?: BudgetActionErrors,
  budgetId?: string,
): BudgetActionResult {
  return {
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...(budgetId ? { budgetId } : {}),
  };
}

async function loadWorkspaceBudgetPageData(
  deps: BudgetActionDeps,
): Promise<WorkspaceBudgetPageData> {
  const t = await deps.getTranslations();
  const [user, workspace] = await Promise.all([
    deps.getCurrentUser(),
    deps.getCurrentWorkspace(),
  ]);
  await deps.assertWorkspaceMember(user.id, workspace.id);

  const [budgets, categories] = await Promise.all([
    deps.prisma.budget.findMany({
      where: { workspaceId: workspace.id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
            archivedAt: true,
          },
        },
      },
    }),
    deps.prisma.category.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        archivedAt: true,
      },
      orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { name: "asc" }],
    }),
  ]);

  const now = deps.now();

  let entries: BudgetSummaryEntry[] = [];
  if (budgets.length > 0) {
    const ranges = budgets.map((budget) =>
      getBudgetPeriodRange(budget.period, workspace.timezone ?? "Europe/Rome", now),
    );
    const start = new Date(
      Math.min(...ranges.map((range) => range.start.getTime())),
    );
    const end = new Date(
      Math.max(...ranges.map((range) => range.end.getTime())),
    );

    entries = await deps.prisma.entry.findMany({
      where: {
        workspaceId: workspace.id,
        date: {
          gte: start,
          lt: end,
        },
      },
      select: {
        categoryId: true,
        realCost: true,
        alternativeCost: true,
        savedAmount: true,
        mode: true,
        date: true,
      },
    });
  }

  const summarizedBudgets = budgets
    .map((budget) =>
      summarizeBudget(
        budget,
        entries,
        workspace.timezone ?? "Europe/Rome",
        now,
        workspace.currency ?? "EUR",
      ),
    );

  return {
    workspace: {
      id: workspace.id,
      currency: workspace.currency ?? "EUR",
      timezone: workspace.timezone ?? "Europe/Rome",
    },
    categories,
    budgets: sortBudgetSummariesForManagement(summarizedBudgets),
    dashboardBudgetState: selectDashboardBudgetSelection(summarizedBudgets),
    alertSelection: selectBudgetAlertSelection(summarizedBudgets, {}, t),
  };
}

async function createBudgetRecord(
  deps: BudgetActionDeps,
  formData: FormData,
): Promise<BudgetActionResult> {
  await deps.refreshSupabaseSessionForAction();
  const t = await deps.getTranslations();

  try {
    const currentUser = await deps.getCurrentUser();
    const workspace = await deps.getCurrentWorkspace();
    await deps.assertWorkspaceMember(currentUser.id, workspace.id);

    const requestedScope = getFormText(formData, "scope");
    const categoryIds = getFormTexts(formData, "categoryId");
    const primaryCategoryId = categoryIds[0] ?? null;
    const rawInput = {
      scope: requestedScope,
      period: getFormText(formData, "period"),
      amount: getFormText(formData, "amount"),
      categoryId: requestedScope === "category" ? primaryCategoryId : null,
      scopeKey: getFormText(formData, "scopeKey"),
      currency: getFormText(formData, "currency"),
    };

    const validation = validateBudgetScopeInput(rawInput, t.budgetActions);
    if (!validation.ok) {
      return toActionResult(
        "Controlla i campi evidenziati",
        getBudgetActionErrors(validation.errors),
      );
    }

    const normalized = validation.value;
    const targetCategoryIds =
      normalized.scope === "category" ? categoryIds : [];
    const uniqueCategoryIds = Array.from(new Set(targetCategoryIds));

    if (normalized.scope === "category") {
      if (uniqueCategoryIds.length === 0) {
        return toActionResult("Controlla i campi evidenziati", {
          categoryId: t.budgetActions.selectAtLeastOneCategory,
        });
      }

      for (const categoryId of uniqueCategoryIds) {
        const category = await deps.prisma.category.findFirst({
          where: {
            id: categoryId,
            workspaceId: workspace.id,
          },
          select: { id: true },
        });

        if (!category) {
          return toActionResult("Controlla i campi evidenziati", {
            categoryId: t.budgetActions.someCategoryNotInWorkspace,
          });
        }
      }
    }

    const categoryId = normalized.scope === "category" ? primaryCategoryId : null;
    const scopeKey = buildBudgetScopeKey(normalized.scope, categoryId);
    const duplicate = await deps.prisma.budget.findFirst({
      where: {
        workspaceId: workspace.id,
        period: normalized.period,
        scope: normalized.scope,
        scopeKey,
      },
      select: { id: true },
    });

    if (duplicate) {
      if (normalized.scope === "workspace" || targetCategoryIds.length <= 1) {
        return toActionResult(t.budgetActions.duplicate);
      }
    }

    let created: { id: string } | null = null;
    let skippedCount = 0;

    if (normalized.scope === "workspace") {
      created = await deps.prisma.budget.create({
        data: {
          workspaceId: workspace.id,
          scope: normalized.scope,
          scopeKey,
          categoryId,
          period: normalized.period,
          amount: normalized.amount.toFixed(2),
          currency: normalized.currency ?? workspace.currency ?? "EUR",
        },
        select: { id: true },
      });
    } else {
      // Create-or-skip across several categories must be atomic: without a
      // transaction a mid-loop failure persists some budgets while the user
      // is told the creation failed.
      const result = await deps.prisma.$transaction(async (tx) => {
        let txCreated: { id: string } | null = null;
        let txSkippedCount = 0;

        for (const targetCategoryId of uniqueCategoryIds) {
          const targetScopeKey = buildBudgetScopeKey("category", targetCategoryId);
          const existing = await tx.budget.findFirst({
            where: {
              workspaceId: workspace.id,
              period: normalized.period,
              scope: "category",
              scopeKey: targetScopeKey,
            },
            select: { id: true },
          });

          if (existing) {
            txSkippedCount += 1;
            continue;
          }

          const nextCreated = await tx.budget.create({
            data: {
              workspaceId: workspace.id,
              scope: "category",
              scopeKey: targetScopeKey,
              categoryId: targetCategoryId,
              period: normalized.period,
              amount: normalized.amount.toFixed(2),
              currency: normalized.currency ?? workspace.currency ?? "EUR",
            },
            select: { id: true },
          });
          txCreated ??= nextCreated;
        }

        return { created: txCreated, skippedCount: txSkippedCount };
      });

      created = result.created;
      skippedCount = result.skippedCount;
    }

    if (!created) {
      return toActionResult(t.budgetActions.duplicateForCategories);
    }

    revalidateBudgetPaths(deps);

    return {
      success: true,
      message:
        skippedCount > 0
          ? t.budgetActions.createdWithSkipped(skippedCount)
          : t.budgetActions.created,
      budgetId: created.id,
    };
  } catch (error) {
    unstable_rethrow(error);
    const mapped = mapKnownBudgetError(error, t.budgetActions);
    if (mapped) {
      return toActionResult(mapped);
    }

    console.error("createBudgetAction failed:", error);
    return toActionResult(t.budgetActions.createFailed);
  }
}

async function updateBudgetRecord(
  deps: BudgetActionDeps,
  formData: FormData,
): Promise<BudgetActionResult> {
  await deps.refreshSupabaseSessionForAction();
  const t = await deps.getTranslations();

  try {
    const currentUser = await deps.getCurrentUser();
    const workspace = await deps.getCurrentWorkspace();
    await deps.assertWorkspaceMember(currentUser.id, workspace.id);

    const budgetId = getFormText(formData, "budgetId");
    if (!budgetId) {
      return toActionResult(t.budgetActions.invalidId, {
        budgetId: t.budgetActions.selectValidBudget,
      });
    }

    const existingBudget = await deps.prisma.budget.findFirst({
      where: {
        id: budgetId,
        workspaceId: workspace.id,
      },
      select: {
        id: true,
        scope: true,
        scopeKey: true,
        categoryId: true,
        period: true,
      },
    });

    if (!existingBudget) {
      return toActionResult(t.budgetActions.notFound);
    }

    const rawInput = {
      scope: getFormText(formData, "scope"),
      period: getFormText(formData, "period"),
      amount: getFormText(formData, "amount"),
      categoryId: getFormText(formData, "categoryId"),
      scopeKey: getFormText(formData, "scopeKey"),
      currency: getFormText(formData, "currency"),
    };

    const validation = validateBudgetScopeInput(rawInput, t.budgetActions);
    if (!validation.ok) {
      return toActionResult(
        "Controlla i campi evidenziati",
        getBudgetActionErrors(validation.errors),
      );
    }

    const normalized = validation.value;
    const categoryId =
      normalized.scope === "category" ? normalized.categoryId : null;

    if (normalized.scope === "category") {
      const category = await deps.prisma.category.findFirst({
        where: {
          id: categoryId,
          workspaceId: workspace.id,
        },
        select: { id: true },
      });

      if (!category) {
        return toActionResult("Controlla i campi evidenziati", {
          categoryId: t.budgetActions.categoryNotInWorkspace,
        });
      }
    }

    const scopeKey = buildBudgetScopeKey(normalized.scope, categoryId);
    const duplicate = await deps.prisma.budget.findFirst({
      where: {
        workspaceId: workspace.id,
        period: normalized.period,
        scope: normalized.scope,
        scopeKey,
        id: { not: budgetId },
      },
      select: { id: true },
    });

    if (duplicate) {
      return toActionResult(t.budgetActions.duplicate);
    }

    await deps.prisma.budget.update({
      where: { id: budgetId, workspaceId: workspace.id },
      data: {
        scope: normalized.scope,
        scopeKey,
        categoryId,
        period: normalized.period,
        amount: normalized.amount.toFixed(2),
        currency: normalized.currency ?? workspace.currency ?? "EUR",
      },
    });

    revalidateBudgetPaths(deps);

    return {
      success: true,
      message: t.budgetActions.updated,
      budgetId,
    };
  } catch (error) {
    unstable_rethrow(error);
    const mapped = mapKnownBudgetError(error, t.budgetActions);
    if (mapped) {
      return toActionResult(mapped);
    }

    console.error("updateBudgetAction failed:", error);
    return toActionResult(t.budgetActions.updateFailed);
  }
}

async function deleteBudgetRecord(
  deps: BudgetActionDeps,
  formData: FormData,
): Promise<BudgetActionResult> {
  await deps.refreshSupabaseSessionForAction();
  const t = await deps.getTranslations();

  try {
    const currentUser = await deps.getCurrentUser();
    const workspace = await deps.getCurrentWorkspace();
    await deps.assertWorkspaceMember(currentUser.id, workspace.id);

    const budgetId = getFormText(formData, "budgetId");
    if (!budgetId) {
      return toActionResult(t.budgetActions.invalidId, {
        budgetId: t.budgetActions.selectValidBudget,
      });
    }

    const budget = await deps.prisma.budget.findFirst({
      where: {
        id: budgetId,
        workspaceId: workspace.id,
      },
      select: { id: true },
    });

    if (!budget) {
      return toActionResult(t.budgetActions.notFound);
    }

    await deps.prisma.budget.delete({
      where: { id: budgetId, workspaceId: workspace.id },
    });

    revalidateBudgetPaths(deps);

    return {
      success: true,
      message: t.budgetActions.deleted,
      budgetId,
    };
  } catch (error) {
    unstable_rethrow(error);
    const mapped = mapKnownBudgetError(error, t.budgetActions);
    if (mapped) {
      return toActionResult(mapped);
    }

    console.error("deleteBudgetAction failed:", error);
    return toActionResult(t.budgetActions.deleteFailed);
  }
}

export async function createBudgetActions(
  deps: BudgetActionDeps = makeDefaultDeps(),
) {
  return {
    getWorkspaceBudgetsAction: async (): Promise<WorkspaceBudgetPageData> =>
      withDatabaseRetry(
        () => loadWorkspaceBudgetPageData(deps),
        { label: "workspace-budgets" },
      ),
    createBudgetAction: async (formData: FormData): Promise<BudgetActionResult> =>
      createBudgetRecord(deps, formData),
    updateBudgetAction: async (formData: FormData): Promise<BudgetActionResult> =>
      updateBudgetRecord(deps, formData),
    deleteBudgetAction: async (formData: FormData): Promise<BudgetActionResult> =>
      deleteBudgetRecord(deps, formData),
  };
}

const defaultBudgetActionsPromise = createBudgetActions();

export async function getWorkspaceBudgetsAction(): Promise<WorkspaceBudgetPageData> {
  return (await defaultBudgetActionsPromise).getWorkspaceBudgetsAction();
}

export async function createBudgetAction(formData: FormData): Promise<BudgetActionResult> {
  return (await defaultBudgetActionsPromise).createBudgetAction(formData);
}

export async function updateBudgetAction(formData: FormData): Promise<BudgetActionResult> {
  return (await defaultBudgetActionsPromise).updateBudgetAction(formData);
}

export async function deleteBudgetAction(formData: FormData): Promise<BudgetActionResult> {
  return (await defaultBudgetActionsPromise).deleteBudgetAction(formData);
}
