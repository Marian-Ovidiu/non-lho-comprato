import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.DATABASE_URL ??=
  "postgresql://goal_test:goal_test@127.0.0.1:5432/goal_test";
process.env.DIRECT_URL ??= process.env.DATABASE_URL;

type FakeGoal = {
  id: string;
  workspaceId: string;
  title: string;
  targetAmount: string;
  emoji: string | null;
  isActive: boolean;
};

async function createFakeGoalWorld(options?: { failCreate?: boolean }) {
  const { createGoalActions } = await import("@/src/actions/goals");
  const workspaceId = "workspace-1";
  const goals: FakeGoal[] = [
    {
      id: "goal-own",
      workspaceId,
      title: "Vacanza",
      targetAmount: "100.00",
      emoji: null,
      isActive: true,
    },
    {
      id: "goal-foreign",
      workspaceId: "workspace-2",
      title: "Altrui",
      targetAmount: "50.00",
      emoji: null,
      isActive: true,
    },
  ];
  const updatedTags: string[] = [];
  const revalidatedPaths: string[] = [];

  const findByWhere = (where: { id: string; workspaceId: string }) =>
    goals.find(
      (goal) => goal.id === where.id && goal.workspaceId === where.workspaceId,
    ) ?? null;

  const actions = await createGoalActions({
    prisma: {
      goal: {
        create: async ({ data }) => {
          if (options?.failCreate) {
            throw new Error("boom");
          }

          const created: FakeGoal = {
            id: `goal-${goals.length + 1}`,
            workspaceId: data.workspaceId as string,
            title: data.title as string,
            targetAmount: data.targetAmount as string,
            emoji: (data.emoji as string | null) ?? null,
            isActive: Boolean(data.isActive),
          };
          goals.push(created);
          return { id: created.id };
        },
        // Return a snapshot like real Prisma does: the action must not see
        // later mutations through the reference it holds.
        findUnique: async ({ where }) => {
          const found = findByWhere(where);
          return found ? { ...found } : null;
        },
        update: async ({ where, data }) => {
          const goal = findByWhere(where);
          if (!goal) {
            throw new Error("Record not found");
          }
          goal.isActive = Boolean(data.isActive);
          return { id: goal.id };
        },
        delete: async ({ where }) => {
          const goal = findByWhere(where);
          if (!goal) {
            throw new Error("Record not found");
          }
          goals.splice(goals.indexOf(goal), 1);
          return { id: goal.id };
        },
      },
    },
    getCurrentWorkspaceId: async () => workspaceId,
    revalidatePath: (path) => {
      revalidatedPaths.push(path);
    },
    updateTag: (tag) => {
      updatedTags.push(tag);
    },
  });

  return { actions, goals, updatedTags, revalidatedPaths, workspaceId };
}

function goalFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value);
  }
  return formData;
}

describe("createGoal", () => {
  it("persists a goal with a locale-formatted amount", async () => {
    const world = await createFakeGoalWorld();

    const result = await world.actions.createGoal(
      goalFormData({ title: "Moto", emoji: "", targetAmount: "1.234,56" }),
    );

    assert.equal(result.success, true);
    const created = world.goals.find((goal) => goal.title === "Moto");
    assert.ok(created);
    assert.equal(created.targetAmount, "1234.56");
    assert.equal(created.workspaceId, world.workspaceId);
    assert.equal(created.isActive, true);
    assert.deepEqual(world.updatedTags, [`goals:${world.workspaceId}`]);
  });

  it("returns field errors without touching the database", async () => {
    const world = await createFakeGoalWorld();
    const before = world.goals.length;

    const result = await world.actions.createGoal(
      goalFormData({ title: "V", emoji: "abcde", targetAmount: "abc" }),
    );

    assert.equal(result.success, false);
    assert.equal(result.errors?.title, "Il titolo deve avere almeno 2 caratteri");
    assert.equal(result.errors?.targetAmount, "Inserisci un numero valido");
    assert.equal(result.errors?.emoji, "Usa al massimo 4 caratteri");
    assert.equal(world.goals.length, before);
    assert.deepEqual(world.updatedTags, []);
  });

  it("reports a generic failure when the create throws", async () => {
    const world = await createFakeGoalWorld({ failCreate: true });

    const result = await world.actions.createGoal(
      goalFormData({ title: "Moto", emoji: "", targetAmount: "10" }),
    );

    assert.equal(result.success, false);
    assert.match(result.message, /Non riesco a salvare/);
    assert.deepEqual(world.updatedTags, []);
  });
});

describe("deleteGoal", () => {
  it("rejects a goal that belongs to another workspace", async () => {
    const world = await createFakeGoalWorld();

    const result = await world.actions.deleteGoal("goal-foreign");

    assert.equal(result.success, false);
    assert.equal(result.message, "Obiettivo non trovato");
    assert.equal(world.goals.length, 2);
    assert.deepEqual(world.updatedTags, []);
  });

  it("deletes an own goal and invalidates the cache tag", async () => {
    const world = await createFakeGoalWorld();

    const result = await world.actions.deleteGoal("goal-own");

    assert.equal(result.success, true);
    assert.equal(
      world.goals.some((goal) => goal.id === "goal-own"),
      false,
    );
    assert.deepEqual(world.updatedTags, [`goals:${world.workspaceId}`]);
  });

  it("rejects a blank id without hitting the database", async () => {
    const world = await createFakeGoalWorld();

    const result = await world.actions.deleteGoal("   ");

    assert.equal(result.success, false);
    assert.equal(result.message, "ID obiettivo non valido");
    assert.equal(world.goals.length, 2);
  });
});

describe("toggleGoalActive", () => {
  it("archives an active goal and reactivates it back", async () => {
    const world = await createFakeGoalWorld();

    const archived = await world.actions.toggleGoalActive("goal-own");
    assert.equal(archived.success, true);
    assert.equal(archived.message, "Obiettivo archiviato");
    assert.equal(world.goals[0].isActive, false);

    const reactivated = await world.actions.toggleGoalActive("goal-own");
    assert.equal(reactivated.success, true);
    assert.equal(reactivated.message, "Obiettivo riattivato");
    assert.equal(world.goals[0].isActive, true);
  });

  it("rejects a goal that belongs to another workspace", async () => {
    const world = await createFakeGoalWorld();

    const result = await world.actions.toggleGoalActive("goal-foreign");

    assert.equal(result.success, false);
    assert.equal(result.message, "Obiettivo non trovato");
    assert.equal(
      world.goals.find((goal) => goal.id === "goal-foreign")?.isActive,
      true,
    );
  });
});
