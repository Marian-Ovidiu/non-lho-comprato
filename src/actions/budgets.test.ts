import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.DATABASE_URL ??=
  "postgresql://budget_test:budget_test@127.0.0.1:5432/budget_test";
process.env.DIRECT_URL ??= process.env.DATABASE_URL;

type SeedBudget = {
  id: string;
  workspaceId: string;
  scope: "workspace" | "category";
  scopeKey: string;
  categoryId: string | null;
  period: "weekly" | "monthly";
  amount: string;
  currency: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SeedCategory = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  archivedAt: Date | null;
};

type SeedEntry = {
  workspaceId: string;
  categoryId: string;
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  mode: "spent" | "avoided";
  date: Date;
};

type BudgetWhere = {
  workspaceId?: string;
  scope?: "workspace" | "category";
  period?: "weekly" | "monthly";
  scopeKey?: string;
  categoryId?: string | null;
  id?: string | { not?: string };
};

type CategoryWhere = {
  workspaceId?: string;
  id?: string;
};

type EntryWhere = {
  workspaceId?: string;
  date?: {
    gte?: Date;
    lt?: Date;
  };
};

async function createFakeBudgetWorld() {
  const { createBudgetActions } = await import("@/src/actions/budgets");
  const currentUser = {
    id: "user-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    email: "user@example.com",
    name: "Test User",
    image: null,
  };
  const workspace = {
    id: "workspace-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    name: "Workspace Test",
    kind: "private" as const,
    currency: "EUR",
    timezone: "Europe/Rome",
    language: "it",
    setupCompleted: true,
    ownerUserId: currentUser.id,
    lastSelectedAt: null,
  };
  const categories: SeedCategory[] = [
    {
      id: "category-1",
      workspaceId: workspace.id,
      name: "Spesa",
      slug: "spesa",
      icon: null,
      color: null,
      archivedAt: null,
    },
    {
      id: "category-2",
      workspaceId: workspace.id,
      name: "Svago",
      slug: "svago",
      icon: null,
      color: null,
      archivedAt: null,
    },
    {
      id: "foreign-category",
      workspaceId: "workspace-foreign",
      name: "Altro",
      slug: "altro",
      icon: null,
      color: null,
      archivedAt: null,
    },
  ];
  const budgets: SeedBudget[] = [];
  const entries: SeedEntry[] = [];
  const queryCounts = {
    transaction: 0,
    budgetFindMany: 0,
    budgetFindFirst: 0,
    budgetCreate: 0,
    budgetUpdate: 0,
    budgetDelete: 0,
    categoryFindMany: 0,
    categoryFindFirst: 0,
    entryFindMany: 0,
  };
  let budgetCounter = 0;

  function withCategoryRelation(budget: SeedBudget) {
    return {
      ...budget,
      category:
        budget.categoryId === null
          ? null
          : categories.find((category) => category.id === budget.categoryId) ?? null,
    };
  }

  function matchesBudget(budget: SeedBudget, where: BudgetWhere) {
    if (where.workspaceId && budget.workspaceId !== where.workspaceId) {
      return false;
    }

    if (where.scope && budget.scope !== where.scope) {
      return false;
    }

    if (where.period && budget.period !== where.period) {
      return false;
    }

    if (where.scopeKey && budget.scopeKey !== where.scopeKey) {
      return false;
    }

    if (where.categoryId !== undefined) {
      if (where.categoryId === null && budget.categoryId !== null) {
        return false;
      }
      if (where.categoryId && budget.categoryId !== where.categoryId) {
        return false;
      }
    }

    if (typeof where.id === "string" && budget.id !== where.id) {
      return false;
    }

    if (where.id && typeof where.id === "object" && "not" in where.id) {
      if (budget.id === where.id.not) {
        return false;
      }
    }

    return true;
  }

  let failBudgetCreateAtCall: number | null = null;

  const budgetDelegate = {
      async findMany({ where }: { where?: BudgetWhere }) {
        queryCounts.budgetFindMany += 1;
        return budgets
          .filter((budget) => (where ? matchesBudget(budget, where) : true))
          .map(withCategoryRelation);
      },
      async findFirst({ where }: { where?: BudgetWhere }) {
        queryCounts.budgetFindFirst += 1;
        return (
          budgets.find((budget) => (where ? matchesBudget(budget, where) : true)) ??
          null
        );
      },
      async create(args: Record<string, unknown>) {
        queryCounts.budgetCreate += 1;
        if (
          failBudgetCreateAtCall !== null &&
          queryCounts.budgetCreate === failBudgetCreateAtCall
        ) {
          throw new Error("Injected budget create failure");
        }
        const data = args.data as Record<string, unknown>;
        const id = `budget-${++budgetCounter}`;
        const budget: SeedBudget = {
          id,
          workspaceId: String(data.workspaceId),
          scope: data.scope as "workspace" | "category",
          scopeKey: String(data.scopeKey),
          categoryId: (data.categoryId as string | null | undefined) ?? null,
          period: data.period as "weekly" | "monthly",
          amount: String(data.amount),
          currency: (data.currency as string | null | undefined) ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        budgets.push(budget);
        return { id };
      },
      async update(args: Record<string, unknown>) {
        queryCounts.budgetUpdate += 1;
        const where = args.where as { id: string };
        const data = args.data as Record<string, unknown>;
        const budget = budgets.find((item) => item.id === where.id);
        if (!budget) {
          throw new Error("Budget not found");
        }

        Object.assign(budget, {
          scope: (data.scope as "workspace" | "category" | undefined) ?? budget.scope,
          scopeKey: (data.scopeKey as string | undefined) ?? budget.scopeKey,
          categoryId: (data.categoryId as string | null | undefined) ?? budget.categoryId,
          period: (data.period as "weekly" | "monthly" | undefined) ?? budget.period,
          amount: (data.amount as string | undefined) ?? budget.amount,
          currency: (data.currency as string | null | undefined) ?? budget.currency,
          updatedAt: new Date(),
        });

        return { id: budget.id };
      },
      async delete(args: Record<string, unknown>) {
        queryCounts.budgetDelete += 1;
        const where = args.where as { id: string };
        const index = budgets.findIndex((item) => item.id === where.id);
        if (index < 0) {
          throw new Error("Budget not found");
        }
        const [removed] = budgets.splice(index, 1);
        return { id: removed.id };
      },
  };

  const prisma = {
    budget: budgetDelegate,
    async $transaction<T>(
      fn: (tx: { budget: typeof budgetDelegate }) => Promise<T>,
    ): Promise<T> {
      queryCounts.transaction += 1;
      // Restore-on-throw mirrors the rollback semantics of a real transaction.
      const snapshot = budgets.map((budget) => ({ ...budget }));
      try {
        return await fn({ budget: budgetDelegate });
      } catch (error) {
        budgets.length = 0;
        budgets.push(...snapshot);
        throw error;
      }
    },
    category: {
      async findMany({ where }: { where?: CategoryWhere }) {
        queryCounts.categoryFindMany += 1;
        return categories.filter((category) => {
          if (where?.workspaceId && category.workspaceId !== where.workspaceId) {
            return false;
          }
          return true;
        });
      },
      async findFirst({ where }: { where?: CategoryWhere }) {
        queryCounts.categoryFindFirst += 1;
        return (
          categories.find((category) => {
            if (where?.workspaceId && category.workspaceId !== where.workspaceId) {
              return false;
            }
            if (where?.id && category.id !== where.id) {
              return false;
            }
            return true;
          }) ?? null
        );
      },
    },
    entry: {
      async findMany({ where }: { where?: EntryWhere }) {
        queryCounts.entryFindMany += 1;
        return entries
          .filter((entry) => {
            if (where?.workspaceId && entry.workspaceId !== where.workspaceId) {
              return false;
            }
            const gte = where?.date?.gte instanceof Date ? where.date.gte : null;
            const lt = where?.date?.lt instanceof Date ? where.date.lt : null;
            if (gte && entry.date < gte) {
              return false;
            }
            if (lt && entry.date >= lt) {
              return false;
            }
            return true;
          })
          .map((entry) => ({
            categoryId: entry.categoryId,
            realCost: entry.realCost,
            alternativeCost: entry.alternativeCost,
            savedAmount: entry.savedAmount,
            mode: entry.mode,
            date: entry.date,
          }));
      },
    },
  } as const;

  const deps = {
    prisma,
    refreshSupabaseSessionForAction: async () => undefined,
    getCurrentUser: async () => currentUser,
    getCurrentWorkspace: async () => workspace,
    getCurrentWorkspaceId: async () => workspace.id,
    assertWorkspaceMember: async (userId: string, workspaceId: string) => {
      assert.equal(userId, currentUser.id);
      assert.equal(workspaceId, workspace.id);
    },
    revalidatePath: () => undefined,
    now: () => new Date("2026-07-15T12:00:00.000Z"),
  };

  const actions = await createBudgetActions(deps);

  return {
    workspace,
    currentUser,
    categories,
    budgets,
    entries,
    prisma,
    actions,
    queryCounts,
    addEntry(entry: SeedEntry) {
      entries.push(entry);
    },
    setFailBudgetCreateAtCall(callNumber: number) {
      failBudgetCreateAtCall = callNumber;
    },
  };
}

function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

function buildMultiCategoryBudgetFormData(fields: {
  period: string;
  amount: string;
  categoryIds: string[];
  currency: string;
}): FormData {
  const formData = new FormData();
  formData.set("scope", "category");
  formData.set("period", fields.period);
  formData.set("amount", fields.amount);
  formData.set("scopeKey", fields.categoryIds[0] ?? "");
  formData.set("currency", fields.currency);
  for (const categoryId of fields.categoryIds) {
    formData.append("categoryId", categoryId);
  }
  return formData;
}

describe("budget actions", () => {
  it("creates a valid workspace budget", async () => {
    const world = await createFakeBudgetWorld();

    const result = await world.actions.createBudgetAction(
      buildFormData({
        scope: "workspace",
        period: "monthly",
        amount: "120",
        scopeKey: "workspace",
        currency: "EUR",
      }),
    );

    assert.equal(result.success, true);
    assert.equal(world.budgets.length, 1);
    assert.equal(world.budgets[0]?.scope, "workspace");
    assert.equal(world.budgets[0]?.scopeKey, "workspace");
  });

  it("creates a valid category budget", async () => {
    const world = await createFakeBudgetWorld();

    const result = await world.actions.createBudgetAction(
      buildFormData({
        scope: "category",
        period: "weekly",
        amount: "35",
        categoryId: "category-1",
        scopeKey: "category-1",
        currency: "EUR",
      }),
    );

    assert.equal(result.success, true);
    assert.equal(world.budgets.length, 1);
    assert.equal(world.budgets[0]?.categoryId, "category-1");
    assert.equal(world.budgets[0]?.scopeKey, "category-1");
  });

  it("creates one category budget for each selected category", async () => {
    const world = await createFakeBudgetWorld();

    const result = await world.actions.createBudgetAction(
      buildMultiCategoryBudgetFormData({
        period: "monthly",
        amount: "80",
        categoryIds: ["category-1", "category-2"],
        currency: "EUR",
      }),
    );

    assert.equal(result.success, true);
    assert.equal(world.budgets.length, 2);
    assert.deepEqual(
      world.budgets.map((budget) => budget.categoryId).sort(),
      ["category-1", "category-2"],
    );
    assert.deepEqual(
      world.budgets.map((budget) => budget.scopeKey).sort(),
      ["category-1", "category-2"],
    );
  });

  it("rolls back every category budget when one create fails", async () => {
    const world = await createFakeBudgetWorld();
    world.setFailBudgetCreateAtCall(2);

    const result = await world.actions.createBudgetAction(
      buildMultiCategoryBudgetFormData({
        period: "monthly",
        amount: "80",
        categoryIds: ["category-1", "category-2"],
        currency: "EUR",
      }),
    );

    assert.equal(result.success, false);
    assert.equal(world.queryCounts.transaction, 1);
    assert.equal(world.budgets.length, 0);
  });

  it("blocks amount <= 0", async () => {
    const world = await createFakeBudgetWorld();

    const result = await world.actions.createBudgetAction(
      buildFormData({
        scope: "workspace",
        period: "monthly",
        amount: "0",
        scopeKey: "workspace",
        currency: "EUR",
      }),
    );

    assert.equal(result.success, false);
    assert.equal(result.errors?.amount, "L'importo deve essere maggiore di 0.");
  });

  it("blocks a categoryId that belongs to another workspace", async () => {
    const world = await createFakeBudgetWorld();

    const result = await world.actions.createBudgetAction(
      buildFormData({
        scope: "category",
        period: "monthly",
        amount: "50",
        categoryId: "foreign-category",
        scopeKey: "foreign-category",
        currency: "EUR",
      }),
    );

    assert.equal(result.success, false);
    assert.match(result.message, /Controlla/);
    assert.equal(
      result.errors?.categoryId,
      "Una delle categorie selezionate non appartiene a questo workspace.",
    );
  });

  it("blocks a duplicate budget in the same workspace period scope and scopeKey", async () => {
    const world = await createFakeBudgetWorld();

    const createInput = buildFormData({
      scope: "workspace",
      period: "monthly",
      amount: "120",
      scopeKey: "workspace",
      currency: "EUR",
    });

    const first = await world.actions.createBudgetAction(createInput);
    const second = await world.actions.createBudgetAction(createInput);

    assert.equal(first.success, true);
    assert.equal(second.success, false);
    assert.match(second.message, /Esiste già un budget/);
    assert.equal(world.budgets.length, 1);
  });

  it("updates and deletes a budget", async () => {
    const world = await createFakeBudgetWorld();

    const created = await world.actions.createBudgetAction(
      buildFormData({
        scope: "workspace",
        period: "monthly",
        amount: "120",
        scopeKey: "workspace",
        currency: "EUR",
      }),
    );

    assert.equal(created.success, true);
    const budgetId = world.budgets[0]?.id ?? "";

    const updated = await world.actions.updateBudgetAction(
      buildFormData({
        budgetId,
        scope: "category",
        period: "weekly",
        amount: "75",
        categoryId: "category-1",
        scopeKey: "category-1",
        currency: "EUR",
      }),
    );

    assert.equal(updated.success, true);
    assert.equal(world.budgets[0]?.scope, "category");
    assert.equal(world.budgets[0]?.categoryId, "category-1");
    assert.equal(world.budgets[0]?.period, "weekly");

    const deleted = await world.actions.deleteBudgetAction(
      buildFormData({ budgetId }),
    );

    assert.equal(deleted.success, true);
    assert.equal(world.budgets.length, 0);
  });

  it("loads a workspace summary using only workspace entries and category-specific entries", async () => {
    const world = await createFakeBudgetWorld();
    world.addEntry({
      workspaceId: world.workspace.id,
      categoryId: "category-1",
      realCost: 30,
      alternativeCost: 50,
      savedAmount: 20,
      mode: "spent",
      date: new Date("2026-07-10T10:00:00.000Z"),
    });
    world.addEntry({
      workspaceId: world.workspace.id,
      categoryId: "category-1",
      realCost: 0,
      alternativeCost: 18,
      savedAmount: 18,
      mode: "avoided",
      date: new Date("2026-07-10T12:00:00.000Z"),
    });
    world.addEntry({
      workspaceId: world.workspace.id,
      categoryId: "category-2",
      realCost: 12,
      alternativeCost: 20,
      savedAmount: 8,
      mode: "spent",
      date: new Date("2026-07-11T10:00:00.000Z"),
    });
    world.addEntry({
      workspaceId: "workspace-foreign",
      categoryId: "category-1",
      realCost: 999,
      alternativeCost: 999,
      savedAmount: 0,
      mode: "spent",
      date: new Date("2026-07-11T10:00:00.000Z"),
    });

    await world.actions.createBudgetAction(
      buildFormData({
        scope: "workspace",
        period: "monthly",
        amount: "100",
        scopeKey: "workspace",
        currency: "EUR",
      }),
    );

    await world.actions.createBudgetAction(
      buildFormData({
        scope: "category",
        period: "monthly",
        amount: "40",
        categoryId: "category-1",
        scopeKey: "category-1",
        currency: "EUR",
      }),
    );

    const pageData = await world.actions.getWorkspaceBudgetsAction();
    const workspaceBudget = pageData.budgets.find((budget) => budget.scope === "workspace");
    const categoryBudget = pageData.budgets.find((budget) => budget.scope === "category");

    assert.equal(workspaceBudget?.spentAmount, 42);
    assert.equal(categoryBudget?.spentAmount, 30);
    assert.equal(categoryBudget?.wouldHaveSpentAmount, 68);
    assert.equal(pageData.dashboardBudgetState.mainBudget?.id, workspaceBudget?.id);
    assert.equal(
      pageData.dashboardBudgetState.categoryBudgets[0]?.id,
      categoryBudget?.id,
    );
    assert.equal(pageData.alertSelection.hasAlerts, true);
    assert.ok(pageData.alertSelection.primaryAlerts.length >= 1);
    assert.equal(world.queryCounts.budgetFindMany, 1);
    assert.equal(world.queryCounts.categoryFindMany, 1);
    assert.equal(world.queryCounts.entryFindMany, 1);
  });

  it("does not return alert selection when all budgets are ok", async () => {
    const world = await createFakeBudgetWorld();

    await world.actions.createBudgetAction(
      buildFormData({
        scope: "workspace",
        period: "monthly",
        amount: "200",
        scopeKey: "workspace",
        currency: "EUR",
      }),
    );

    world.addEntry({
      workspaceId: world.workspace.id,
      categoryId: "category-1",
      realCost: 20,
      alternativeCost: 30,
      savedAmount: 10,
      mode: "spent",
      date: new Date("2026-07-10T10:00:00.000Z"),
    });

    const pageData = await world.actions.getWorkspaceBudgetsAction();

    assert.equal(pageData.alertSelection.hasAlerts, false);
    assert.equal(pageData.alertSelection.primaryAlerts.length, 0);
    assert.equal(pageData.alertSelection.pageAlerts.length, 0);
    assert.equal(world.queryCounts.budgetFindMany, 1);
    assert.equal(world.queryCounts.categoryFindMany, 1);
    assert.equal(world.queryCounts.entryFindMany, 1);
  });

  it("limits alert selection to at most two primary alerts", async () => {
    const world = await createFakeBudgetWorld();

    await world.actions.createBudgetAction(
      buildFormData({
        scope: "workspace",
        period: "monthly",
        amount: "50",
        scopeKey: "workspace",
        currency: "EUR",
      }),
    );
    await world.actions.createBudgetAction(
      buildFormData({
        scope: "category",
        period: "monthly",
        amount: "20",
        categoryId: "category-1",
        scopeKey: "category-1",
        currency: "EUR",
      }),
    );
    await world.actions.createBudgetAction(
      buildFormData({
        scope: "category",
        period: "monthly",
        amount: "20",
        categoryId: "category-2",
        scopeKey: "category-2",
        currency: "EUR",
      }),
    );

    world.addEntry({
      workspaceId: world.workspace.id,
      categoryId: "category-1",
      realCost: 40,
      alternativeCost: 60,
      savedAmount: 20,
      mode: "spent",
      date: new Date("2026-07-10T10:00:00.000Z"),
    });
    world.addEntry({
      workspaceId: world.workspace.id,
      categoryId: "category-2",
      realCost: 40,
      alternativeCost: 60,
      savedAmount: 20,
      mode: "spent",
      date: new Date("2026-07-11T10:00:00.000Z"),
    });

    const pageData = await world.actions.getWorkspaceBudgetsAction();

    assert.equal(pageData.alertSelection.hasAlerts, true);
    assert.ok(pageData.alertSelection.primaryAlerts.length <= 2);
    assert.ok(pageData.alertSelection.pageAlerts.length >= 2);
  });
});
