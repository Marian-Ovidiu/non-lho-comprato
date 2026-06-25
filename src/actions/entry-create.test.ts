import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.DATABASE_URL ??=
  "postgresql://budget_test:budget_test@127.0.0.1:5432/budget_test";
process.env.DIRECT_URL ??= process.env.DATABASE_URL;

import type {
  EntryCreateDependencies,
  EntryCreatePrismaLike,
  EntryCreationSource,
  NormalizedEntryCreateInput,
} from "@/src/actions/entry-create";
import type { EntryMoneyResult } from "@/src/lib/entry-domain";

async function createFakeEntryWorld(
  options: { existingEntry?: { id: string } | null } = {},
) {
  const { createEntryFromNormalizedInput } = await import(
    "@/src/actions/entry-create"
  );

  const calls = {
    entryCount: 0,
    entryFindFirst: 0,
    entryCreateArgs: [] as Array<Record<string, unknown>>,
    importedFindUniqueArgs: [] as Array<Record<string, unknown>>,
    importedUpdateArgs: [] as Array<Record<string, unknown>>,
    revalidatedPaths: [] as string[],
    updatedTags: [] as string[],
    streakCalls: 0,
  };

  const prisma = {
    entry: {
      async count() {
        calls.entryCount += 1;
        return 0;
      },
      async findFirst() {
        calls.entryFindFirst += 1;
        return options.existingEntry ?? null;
      },
      async findUnique() {
        return null;
      },
      async create(args: Record<string, unknown>) {
        calls.entryCreateArgs.push(args);
        return { id: "entry-1" };
      },
    },
    importedTransaction: {
      async findUnique(args: Record<string, unknown>) {
        calls.importedFindUniqueArgs.push(args);
        const where = args.where as { id?: string };

        if (where?.id === "imported-foreign") {
          return { workspaceId: "foreign-workspace" };
        }

        if (where?.id === "imported-ok") {
          return { workspaceId: "workspace-1" };
        }

        return null;
      },
      async update(args: Record<string, unknown>) {
        calls.importedUpdateArgs.push(args);
        return { id: "imported-ok" };
      },
    },
    async $transaction<T>(callback: (tx: EntryCreatePrismaLike) => Promise<T>) {
      return callback(prisma as EntryCreatePrismaLike);
    },
  } as EntryCreatePrismaLike;

  const deps: EntryCreateDependencies = {
    prisma,
    getCurrentWorkspaceScopedWhere: async () => ({ workspaceId: "workspace-1" }),
    getCurrentWorkspaceTimezone: async () => "Europe/Rome",
    resolveIsFirstEntryOfDay: async () => false,
    getGlobalStreak: async () => {
      calls.streakCalls += 1;
      return { currentStreak: 7 };
    },
    revalidatePath: (path) => {
      calls.revalidatedPaths.push(path);
    },
    updateTag: (tag) => {
      calls.updatedTags.push(tag);
    },
  };

  const baseInput: NormalizedEntryCreateInput = {
    workspaceId: "workspace-1",
    currentUserId: "user-1",
    title: "Spesa",
    categoryId: "category-1",
    date: new Date("2026-06-18T10:00:00.000Z"),
    note: "Nota opzionale",
    money: {
      mode: "spent",
      savingContext: "none",
      realCost: 12,
      alternativeCost: 12,
      savedAmount: 0,
      amountSpent: 12,
      comparisonAmount: 12,
      savingImpact: 0,
    } satisfies EntryMoneyResult,
    paymentMode: "single_payer",
    paidByUserId: "user-1",
    beneficiaryUserIds: ["user-1"],
    source: "manual" as EntryCreationSource,
  };

  return {
    createEntryFromNormalizedInput,
    calls,
    deps,
    baseInput,
  };
}

describe("createEntryFromNormalizedInput", () => {
  it("accepts manual, habit and imported sources", async () => {
    const sources: EntryCreationSource[] = ["manual", "habit", "imported"];

    for (const source of sources) {
      const world = await createFakeEntryWorld();
      const result = await world.createEntryFromNormalizedInput(
        {
          ...world.baseInput,
          source,
        },
        world.deps,
      );

      assert.equal(result.success, true);
      const createdArgs = world.calls.entryCreateArgs[0] as {
        data: { source: string; visibility?: string };
      };
      assert.equal(createdArgs.data.source, source);
      assert.equal(createdArgs.data.visibility, "workspace");
    }
  });

  it("links an imported transaction only when the id is present", async () => {
    const worldWithoutImport = await createFakeEntryWorld();
    const withoutImport = await worldWithoutImport.createEntryFromNormalizedInput(
      {
        ...worldWithoutImport.baseInput,
        source: "imported",
      },
      worldWithoutImport.deps,
    );

    assert.equal(withoutImport.success, true);
    assert.equal(worldWithoutImport.calls.importedUpdateArgs.length, 0);

    const worldWithImport = await createFakeEntryWorld();
    const withImport = await worldWithImport.createEntryFromNormalizedInput(
      {
        ...worldWithImport.baseInput,
        source: "imported",
        importedTransactionId: "imported-ok",
      },
      worldWithImport.deps,
    );

    assert.equal(withImport.success, true);
    assert.equal(worldWithImport.calls.importedUpdateArgs.length, 1);
    assert.deepEqual(worldWithImport.calls.importedUpdateArgs[0], {
      where: { id: "imported-ok" },
      data: {
        entryId: "entry-1",
        status: "confirmed",
      },
    });
  });

  it("keeps first-entry streak behavior and invalidations", async () => {
    const world = await createFakeEntryWorld();
    world.deps.resolveIsFirstEntryOfDay = async () => true;

    const result = await world.createEntryFromNormalizedInput(
      {
        ...world.baseInput,
        source: "manual",
      },
      world.deps,
    );

    assert.equal(result.success, true);
    assert.equal(result.isFirstEntryOfDay, true);
    assert.equal(result.isFirstEntryCreated, true);
    assert.equal(result.streakFrom, 7);
    assert.equal(result.streakTo, 7);
    assert.deepEqual(world.calls.revalidatedPaths, [
      "/",
      "/entries",
      "/stats",
      "/workspace/budgets",
      "/more",
    ]);
    assert.deepEqual(world.calls.updatedTags, [
      "entries:workspace-1",
      "goals:workspace-1",
    ]);
    // The streak is read once (not before and after the insert), and the
    // first-ever-entry flag comes from a single LIMIT 1 existence check.
    assert.equal(world.calls.streakCalls, 1);
    assert.equal(world.calls.entryFindFirst, 1);
    assert.equal(world.calls.entryCount, 0);
  });

  it("does not flag isFirstEntryCreated when an entry already exists", async () => {
    const world = await createFakeEntryWorld({
      existingEntry: { id: "existing-entry" },
    });
    world.deps.resolveIsFirstEntryOfDay = async () => true;

    const result = await world.createEntryFromNormalizedInput(
      {
        ...world.baseInput,
        source: "manual",
      },
      world.deps,
    );

    assert.equal(result.success, true);
    assert.equal(result.isFirstEntryOfDay, true);
    assert.equal(result.isFirstEntryCreated, false);
    assert.equal(world.calls.entryFindFirst, 1);
    assert.equal(world.calls.streakCalls, 1);
  });

  it("skips the existence check and streak read when it is not the first of the day", async () => {
    const world = await createFakeEntryWorld();
    // The default world already stubs resolveIsFirstEntryOfDay to false.

    const result = await world.createEntryFromNormalizedInput(
      {
        ...world.baseInput,
        source: "manual",
      },
      world.deps,
    );

    assert.equal(result.success, true);
    assert.equal(result.isFirstEntryOfDay, false);
    assert.equal(result.isFirstEntryCreated, false);
    assert.equal(result.streakFrom, undefined);
    assert.equal(result.streakTo, undefined);
    assert.equal(world.calls.entryFindFirst, 0);
    assert.equal(world.calls.streakCalls, 0);
    assert.equal(world.calls.entryCount, 0);
  });

  it("rejects imported transactions from another workspace", async () => {
    const world = await createFakeEntryWorld();

    const result = await world.createEntryFromNormalizedInput(
      {
        ...world.baseInput,
        source: "imported",
        importedTransactionId: "imported-foreign",
      },
      world.deps,
    );

    assert.equal(result.success, false);
    assert.equal(world.calls.entryCreateArgs.length, 0);
    assert.equal(world.calls.importedUpdateArgs.length, 0);
  });
});
