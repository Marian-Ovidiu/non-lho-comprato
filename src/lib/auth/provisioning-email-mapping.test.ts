import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/non_lho_comprato_test";

type TestUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

type TestWorkspace = {
  id: string;
  name: string;
  kind: "private" | "shared";
  ownerUserId: string;
};

type TestEntry = {
  id: string;
  workspaceId: string;
  createdByUserId: string | null;
  paidByUserId: string | null;
};

type TestEntryBeneficiary = {
  entryId: string;
  userId: string;
};

type TestState = {
  users: TestUser[];
  workspaces: TestWorkspace[];
  memberships: Array<{ workspaceId: string; userId: string }>;
  entries: TestEntry[];
  beneficiaries: TestEntryBeneficiary[];
  createdUsers: TestUser[];
};

type TestEntryFindManyArgs = {
  where: {
    workspaceId: string;
    OR: Array<Record<string, unknown>>;
  };
};

type PatchablePrisma = {
  user: unknown;
  workspace: unknown;
  entry: {
    findMany(args: TestEntryFindManyArgs): Promise<TestEntry[]>;
  };
  entryBeneficiary: unknown;
  $disconnect(): Promise<void>;
};

let prisma: PatchablePrisma;
let ensureAppUserForAuthUser: typeof import("@/src/lib/auth/provisioning")["ensureAppUserForAuthUser"];
let getAccessibleWorkspacesForUserId: typeof import("@/src/lib/auth/provisioning")["getAccessibleWorkspacesForUserId"];
let originalUserDelegate: unknown;
let originalWorkspaceDelegate: unknown;
let originalEntryDelegate: PatchablePrisma["entry"];
let originalEntryBeneficiaryDelegate: unknown;
let state: TestState;

function cloneUser(user: TestUser): TestUser {
  return { ...user };
}

function createPrismaFake(testState: TestState) {
  return {
    user: {
      async findUnique({ where }: { where: { id?: string; email?: string } }) {
        if (where.id !== undefined) {
          const user = testState.users.find((candidate) => candidate.id === where.id);
          return user ? cloneUser(user) : null;
        }

        if (where.email !== undefined) {
          // Mirrors PostgreSQL text uniqueness semantics used by Prisma: exact match,
          // not case-insensitive. This documents the pre-migration normalization risk.
          const user = testState.users.find((candidate) => candidate.email === where.email);
          return user ? cloneUser(user) : null;
        }

        return null;
      },
      async update({ where, data }: { where: { id: string }; data: Partial<TestUser> }) {
        const index = testState.users.findIndex((candidate) => candidate.id === where.id);
        if (index === -1) {
          throw new Error(`User not found: ${where.id}`);
        }

        testState.users[index] = {
          ...testState.users[index],
          ...data,
        };

        return cloneUser(testState.users[index]);
      },
      async create({ data }: { data: TestUser }) {
        if (testState.users.some((candidate) => candidate.id === data.id)) {
          throw new Error(`Duplicate user id: ${data.id}`);
        }

        const user = cloneUser(data);
        testState.users.push(user);
        testState.createdUsers.push(cloneUser(user));
        return cloneUser(user);
      },
    },
    workspace: {
      async findMany({ where }: { where: { OR: Array<Record<string, unknown>> } }) {
        const ownerUserId = where.OR.find((condition) => "ownerUserId" in condition)?.ownerUserId;
        const membershipUserId = (
          where.OR.find((condition) => "members" in condition)?.members as
            | { some?: { userId?: string } }
            | undefined
        )?.some?.userId;

        return testState.workspaces
          .filter((workspace) => {
            const ownsWorkspace = ownerUserId === workspace.ownerUserId;
            const isMember = testState.memberships.some(
              (membership) =>
                membership.workspaceId === workspace.id &&
                membership.userId === membershipUserId,
            );

            return ownsWorkspace || isMember;
          })
          .map((workspace) => ({ ...workspace }));
      },
    },
    entry: {
      async findMany({ where }: { where: { workspaceId: string; OR: Array<Record<string, unknown>> } }) {
        return testState.entries.filter((entry) => {
          if (entry.workspaceId !== where.workspaceId) {
            return false;
          }

          return where.OR.some((condition) => {
            if ("createdByUserId" in condition) {
              return entry.createdByUserId === condition.createdByUserId;
            }

            if ("paidByUserId" in condition) {
              return entry.paidByUserId === condition.paidByUserId;
            }

            if ("beneficiaries" in condition) {
              const userId = (condition.beneficiaries as { some?: { userId?: string } }).some?.userId;
              return testState.beneficiaries.some(
                (beneficiary) => beneficiary.entryId === entry.id && beneficiary.userId === userId,
              );
            }

            return false;
          });
        });
      },
    },
    entryBeneficiary: {},
  };
}

function resetState(overrides: Partial<TestState> = {}) {
  state = {
    users: [],
    workspaces: [],
    memberships: [],
    entries: [],
    beneficiaries: [],
    createdUsers: [],
    ...overrides,
  };

  const fake = createPrismaFake(state);
  prisma.user = fake.user;
  prisma.workspace = fake.workspace;
  prisma.entry = fake.entry;
  prisma.entryBeneficiary = fake.entryBeneficiary;
}

before(async () => {
  const prismaModule = await import("@/src/lib/prisma");
  prisma = prismaModule.prisma as unknown as PatchablePrisma;
  ({ ensureAppUserForAuthUser, getAccessibleWorkspacesForUserId } = await import(
    "@/src/lib/auth/provisioning"
  ));

  originalUserDelegate = prisma.user;
  originalWorkspaceDelegate = prisma.workspace;
  originalEntryDelegate = prisma.entry;
  originalEntryBeneficiaryDelegate = prisma.entryBeneficiary;
});

beforeEach(() => {
  resetState();
});

after(async () => {
  prisma.user = originalUserDelegate;
  prisma.workspace = originalWorkspaceDelegate;
  prisma.entry = originalEntryDelegate;
  prisma.entryBeneficiary = originalEntryBeneficiaryDelegate;

  await prisma.$disconnect();
});

describe("email-based auth provisioning for Supabase project migration", () => {
  it("returns the existing app User.id when the same email logs in with a new Supabase auth id", async () => {
    resetState({
      users: [
        {
          id: "old-app-user-id",
          email: "person@example.com",
          name: "Existing Name",
          image: null,
        },
      ],
    });

    const user = await ensureAppUserForAuthUser({
      id: "new-supabase-auth-id",
      email: "person@example.com",
      name: "Updated Name",
      image: "https://example.com/avatar.png",
    });

    assert.equal(user.id, "old-app-user-id");
    assert.equal(state.users.length, 1);
    assert.equal(state.createdUsers.length, 0);
    assert.equal(state.users[0].name, "Updated Name");
    assert.equal(state.users[0].image, "https://example.com/avatar.png");
  });

  it("does not create a duplicate User when a new Supabase auth id matches by email", async () => {
    resetState({
      users: [
        {
          id: "stable-app-user-id",
          email: "friend@example.com",
          name: "Friend",
          image: null,
        },
      ],
    });

    await ensureAppUserForAuthUser({
      id: "new-auth-id-for-friend",
      email: "friend@example.com",
      name: "Friend New Metadata",
      image: null,
    });

    assert.deepEqual(
      state.users.map((user) => user.id),
      ["stable-app-user-id"],
    );
    assert.equal(state.createdUsers.length, 0);
  });

  it("updates metadata and returns the existing user when auth id already equals User.id", async () => {
    resetState({
      users: [
        {
          id: "same-auth-and-app-id",
          email: "old@example.com",
          name: "Old Name",
          image: null,
        },
      ],
    });

    const user = await ensureAppUserForAuthUser({
      id: "same-auth-and-app-id",
      email: "new@example.com",
      name: "New Name",
      image: "https://example.com/new.png",
    });

    assert.equal(user.id, "same-auth-and-app-id");
    assert.equal(user.email, "new@example.com");
    assert.equal(user.name, "New Name");
    assert.equal(user.image, "https://example.com/new.png");
    assert.equal(state.users.length, 1);
    assert.equal(state.createdUsers.length, 0);
  });

  it("creates a new User only when neither auth id nor email matches an existing app user", async () => {
    resetState({
      users: [
        {
          id: "existing-user",
          email: "existing@example.com",
          name: "Existing",
          image: null,
        },
      ],
    });

    const user = await ensureAppUserForAuthUser({
      id: "brand-new-auth-id",
      email: "new@example.com",
      name: "New User",
      image: null,
    });

    assert.equal(user.id, "brand-new-auth-id");
    assert.equal(user.email, "new@example.com");
    assert.equal(state.users.length, 2);
    assert.deepEqual(
      state.createdUsers.map((createdUser) => createdUser.id),
      ["brand-new-auth-id"],
    );
  });

  it("creates a new User for a missing-email auth account when no id mapping exists", async () => {
    resetState({
      users: [
        {
          id: "existing-user",
          email: "existing@example.com",
          name: "Existing",
          image: null,
        },
      ],
    });

    const user = await ensureAppUserForAuthUser({
      id: "email-less-auth-id",
      email: null,
      name: "No Email",
      image: null,
    });

    assert.equal(user.id, "email-less-auth-id");
    assert.equal(user.email, null);
    assert.equal(state.users.length, 2);
    assert.equal(state.createdUsers.length, 1);
  });

  it("documents current mixed-case email behavior: existing DB emails must be normalized before migration", async () => {
    resetState({
      users: [
        {
          id: "mixed-case-app-user",
          email: "Person@Example.com",
          name: "Mixed Case",
          image: null,
        },
      ],
    });

    const user = await ensureAppUserForAuthUser({
      id: "new-auth-id-for-mixed-case-email",
      email: "PERSON@example.com",
      name: "Mixed Case Login",
      image: null,
    });

    assert.equal(user.id, "new-auth-id-for-mixed-case-email");
    assert.equal(user.email, "person@example.com");
    assert.equal(state.users.length, 2);
    assert.equal(state.createdUsers.length, 1);
  });

  it("keeps old workspace access when the user is matched by email", async () => {
    resetState({
      users: [
        {
          id: "old-app-user-id",
          email: "member@example.com",
          name: "Member",
          image: null,
        },
      ],
      workspaces: [
        {
          id: "old-workspace",
          name: "Old Workspace",
          kind: "shared",
          ownerUserId: "someone-else",
        },
      ],
      memberships: [
        {
          workspaceId: "old-workspace",
          userId: "old-app-user-id",
        },
      ],
    });

    const user = await ensureAppUserForAuthUser({
      id: "new-supabase-auth-id",
      email: "member@example.com",
      name: "Member",
      image: null,
    });
    const workspaces = await getAccessibleWorkspacesForUserId(user.id);

    assert.equal(user.id, "old-app-user-id");
    assert.deepEqual(
      workspaces.map((workspace) => workspace.id),
      ["old-workspace"],
    );
  });

  it("keeps old entry and beneficiary visibility when the user is matched by email", async () => {
    resetState({
      users: [
        {
          id: "old-app-user-id",
          email: "entries@example.com",
          name: "Entry User",
          image: null,
        },
      ],
      entries: [
        {
          id: "created-entry",
          workspaceId: "workspace-1",
          createdByUserId: "old-app-user-id",
          paidByUserId: null,
        },
        {
          id: "paid-entry",
          workspaceId: "workspace-1",
          createdByUserId: null,
          paidByUserId: "old-app-user-id",
        },
        {
          id: "beneficiary-entry",
          workspaceId: "workspace-1",
          createdByUserId: null,
          paidByUserId: null,
        },
        {
          id: "other-workspace-entry",
          workspaceId: "workspace-2",
          createdByUserId: "old-app-user-id",
          paidByUserId: null,
        },
      ],
      beneficiaries: [
        {
          entryId: "beneficiary-entry",
          userId: "old-app-user-id",
        },
      ],
    });

    const user = await ensureAppUserForAuthUser({
      id: "new-auth-id-for-entry-user",
      email: "entries@example.com",
      name: "Entry User",
      image: null,
    });
    const visibleEntries = await prisma.entry.findMany({
      where: {
        workspaceId: "workspace-1",
        OR: [
          { createdByUserId: user.id },
          { paidByUserId: user.id },
          { beneficiaries: { some: { userId: user.id } } },
        ],
      },
    });

    assert.equal(user.id, "old-app-user-id");
    assert.deepEqual(
      visibleEntries.map((entry: TestEntry) => entry.id).sort(),
      ["beneficiary-entry", "created-entry", "paid-entry"],
    );
  });
});
