"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { Prisma } from "@/src/lib/generated/prisma/client";
import { refreshSupabaseSessionForAction } from "@/src/lib/auth/action-session";
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

type BudgetPrismaLike = {
  budget: {
    findMany: (args: Record<string, unknown>) => Promise<BudgetSummarySource[]>;
    findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    create: (args: Record<string, unknown>) => Promise<{ id: string }>;
    update: (args: Record<string, unknown>) => Promise<{ id: string }>;
    delete: (args: Record<string, unknown>) => Promise<{ id: string }>;
  };
  category: {
    findMany: (args: Record<string, unknown>) => Promise<BudgetCategoryOption[]>;
    findFirst: (args: Record<string, unknown>) => Promise<BudgetCategoryOption | null>;
  };
  entry: {
    findMany: (args: Record<string, unknown>) => Promise<BudgetSummaryEntry[]>;
  };
};

type BudgetActionDeps = {
  prisma: BudgetPrismaLike;
  refreshSupabaseSessionForAction: () => Promise<unknown>;
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

function mapKnownBudgetError(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Esiste già un budget con questa combinazione di periodo e scope.";
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
    alertSelection: selectBudgetAlertSelection(summarizedBudgets),
  };
}

async function createBudgetRecord(
  deps: BudgetActionDeps,
  formData: FormData,
): Promise<BudgetActionResult> {
  await deps.refreshSupabaseSessionForAction();

  try {
    const currentUser = await deps.getCurrentUser();
    const workspace = await deps.getCurrentWorkspace();
    await deps.assertWorkspaceMember(currentUser.id, workspace.id);

    const rawInput = {
      scope: getFormText(formData, "scope"),
      period: getFormText(formData, "period"),
      amount: getFormText(formData, "amount"),
      categoryId: getFormText(formData, "categoryId"),
      scopeKey: getFormText(formData, "scopeKey"),
      currency: getFormText(formData, "currency"),
    };

    const validation = validateBudgetScopeInput(rawInput);
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
          categoryId: "La categoria selezionata non appartiene a questo workspace.",
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
      },
      select: { id: true },
    });

    if (duplicate) {
      return toActionResult("Esiste già un budget con questa combinazione di periodo e scope.");
    }

    const created = await deps.prisma.budget.create({
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

    revalidateBudgetPaths(deps);

    return {
      success: true,
      message: "Budget creato.",
      budgetId: created.id,
    };
  } catch (error) {
    unstable_rethrow(error);
    const mapped = mapKnownBudgetError(error);
    if (mapped) {
      return toActionResult(mapped);
    }

    console.error("createBudgetAction failed:", error);
    return toActionResult("Non riesco a creare il budget adesso. Riprova.");
  }
}

async function updateBudgetRecord(
  deps: BudgetActionDeps,
  formData: FormData,
): Promise<BudgetActionResult> {
  await deps.refreshSupabaseSessionForAction();

  try {
    const currentUser = await deps.getCurrentUser();
    const workspace = await deps.getCurrentWorkspace();
    await deps.assertWorkspaceMember(currentUser.id, workspace.id);

    const budgetId = getFormText(formData, "budgetId");
    if (!budgetId) {
      return toActionResult("ID budget non valido.", {
        budgetId: "Seleziona un budget valido.",
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
      return toActionResult("Budget non trovato.");
    }

    const rawInput = {
      scope: getFormText(formData, "scope"),
      period: getFormText(formData, "period"),
      amount: getFormText(formData, "amount"),
      categoryId: getFormText(formData, "categoryId"),
      scopeKey: getFormText(formData, "scopeKey"),
      currency: getFormText(formData, "currency"),
    };

    const validation = validateBudgetScopeInput(rawInput);
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
          categoryId: "La categoria selezionata non appartiene a questo workspace.",
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
      return toActionResult("Esiste già un budget con questa combinazione di periodo e scope.");
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
      message: "Budget aggiornato.",
      budgetId,
    };
  } catch (error) {
    unstable_rethrow(error);
    const mapped = mapKnownBudgetError(error);
    if (mapped) {
      return toActionResult(mapped);
    }

    console.error("updateBudgetAction failed:", error);
    return toActionResult("Non riesco ad aggiornare il budget adesso. Riprova.");
  }
}

async function deleteBudgetRecord(
  deps: BudgetActionDeps,
  formData: FormData,
): Promise<BudgetActionResult> {
  await deps.refreshSupabaseSessionForAction();

  try {
    const currentUser = await deps.getCurrentUser();
    const workspace = await deps.getCurrentWorkspace();
    await deps.assertWorkspaceMember(currentUser.id, workspace.id);

    const budgetId = getFormText(formData, "budgetId");
    if (!budgetId) {
      return toActionResult("ID budget non valido.", {
        budgetId: "Seleziona un budget valido.",
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
      return toActionResult("Budget non trovato.");
    }

    await deps.prisma.budget.delete({
      where: { id: budgetId, workspaceId: workspace.id },
    });

    revalidateBudgetPaths(deps);

    return {
      success: true,
      message: "Budget eliminato.",
      budgetId,
    };
  } catch (error) {
    unstable_rethrow(error);
    const mapped = mapKnownBudgetError(error);
    if (mapped) {
      return toActionResult(mapped);
    }

    console.error("deleteBudgetAction failed:", error);
    return toActionResult("Non riesco a eliminare il budget adesso. Riprova.");
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
