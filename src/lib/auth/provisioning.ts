import { prisma } from "@/src/lib/prisma";

const DEFAULT_LEGACY_WORKSPACE_ID = "legacy-marian-martina";
const DEFAULT_LEGACY_MARIAN_USER_ID = "legacy-marian";
const DEFAULT_LEGACY_MARTINA_USER_ID = "legacy-martina";
const shouldLogPerformance = process.env.NODE_ENV !== "production";

function logPerformance(label: string, startedAt: number) {
  if (!shouldLogPerformance) {
    return;
  }

  console.info(`[perf] ${label} ${Math.round(performance.now() - startedAt)}ms`);
}

type AuthUserLike = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

type AppUserLike = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? null;
}

function buildWorkspaceName(user: AppUserLike) {
  return user.name || user.email || "Workspace personale";
}

function getPrivateWorkspaceId(userId: string) {
  return `private-${userId}`;
}

export function getLegacyWorkspaceId() {
  return process.env.LEGACY_WORKSPACE_ID?.trim() || DEFAULT_LEGACY_WORKSPACE_ID;
}

export function getLegacyAuthMapping(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const marianEmail = normalizeEmail(process.env.LEGACY_MARIAN_EMAIL);
  if (marianEmail && normalizedEmail === marianEmail) {
    return {
      userId: DEFAULT_LEGACY_MARIAN_USER_ID,
      workspaceId: getLegacyWorkspaceId(),
    };
  }

  const martinaEmail = normalizeEmail(process.env.LEGACY_MARTINA_EMAIL);
  if (martinaEmail && normalizedEmail === martinaEmail) {
    return {
      userId: DEFAULT_LEGACY_MARTINA_USER_ID,
      workspaceId: getLegacyWorkspaceId(),
    };
  }

  return null;
}

async function ensureWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: "owner" | "member" = "member",
) {
  return prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    update: {
      role,
    },
    create: {
      workspaceId,
      userId,
      role,
    },
  });
}

export async function ensureAppUserForAuthUser(authUser: AuthUserLike) {
  const startedAt = performance.now();
  const legacyMapping = getLegacyAuthMapping(authUser.email);

  if (legacyMapping) {
    // TODO: replace this legacy-email bridge with proper invited-member onboarding.
    const user = await prisma.user.upsert({
      where: {
        id: legacyMapping.userId,
      },
      update: {
        email: authUser.email,
        name: authUser.name,
        image: authUser.image,
      },
      create: {
        id: legacyMapping.userId,
        email: authUser.email,
        name: authUser.name,
        image: authUser.image,
      },
    });

    logPerformance("auth/ensure-app-user-legacy", startedAt);
    return user;
  }

  const existingById = await prisma.user.findUnique({
    where: {
      id: authUser.id,
    },
  });

  if (existingById) {
    const user = await prisma.user.update({
      where: {
        id: authUser.id,
      },
      data: {
        email: authUser.email,
        name: authUser.name ?? existingById.name,
        image: authUser.image ?? existingById.image,
      },
    });

    logPerformance("auth/ensure-app-user-update", startedAt);
    return user;
  }

  const email = normalizeEmail(authUser.email);

  if (email) {
    const existingByEmail = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingByEmail) {
      const user = await prisma.user.update({
        where: {
          id: existingByEmail.id,
        },
        data: {
          name: authUser.name ?? existingByEmail.name,
          image: authUser.image ?? existingByEmail.image,
        },
      });

      logPerformance("auth/ensure-app-user-email", startedAt);
      return user;
    }
  }

  const user = await prisma.user.create({
    data: {
      id: authUser.id,
      email,
      name: authUser.name,
      image: authUser.image,
    },
  });

  logPerformance("auth/ensure-app-user-create", startedAt);
  return user;
}

export async function ensureDefaultWorkspaceForUser(user: AppUserLike) {
  const startedAt = performance.now();

  return prisma.$transaction(async (tx) => {
    const ownedWorkspace = await tx.workspace.findFirst({
      where: {
        ownerUserId: user.id,
      },
    });

    if (ownedWorkspace) {
      logPerformance("auth/ensure-default-workspace-owned", startedAt);
      return ownedWorkspace;
    }

    const membershipWorkspace = await tx.workspace.findFirst({
      where: {
        members: {
          some: {
            userId: user.id,
          },
        },
      },
    });

    if (membershipWorkspace) {
      logPerformance("auth/ensure-default-workspace-membership", startedAt);
      return membershipWorkspace;
    }

    // TODO: replace this bootstrap workspace creation with a real onboarding flow.
    const privateWorkspaceId = getPrivateWorkspaceId(user.id);

    try {
      const workspace = await tx.workspace.create({
        data: {
          id: privateWorkspaceId,
          name: buildWorkspaceName(user),
          kind: "private",
          ownerUserId: user.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "owner",
        },
      });

      logPerformance("auth/ensure-default-workspace-create", startedAt);
      return workspace;
    } catch (error) {
      const errorCode = (error as { code?: string } | null)?.code;

      if (errorCode !== "P2002") {
        throw error;
      }
      const existingWorkspace = await tx.workspace.findUnique({
        where: {
          id: privateWorkspaceId,
        },
      });

      if (!existingWorkspace) {
        throw error;
      }

      await tx.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: existingWorkspace.id,
            userId: user.id,
          },
        },
        update: {
          role: "owner",
        },
        create: {
          workspaceId: existingWorkspace.id,
          userId: user.id,
          role: "owner",
        },
      });

      logPerformance("auth/ensure-default-workspace-recover", startedAt);
      return existingWorkspace;
    }
  });
}

export async function ensureLegacyWorkspaceForUser(userId: string) {
  const startedAt = performance.now();
  const workspaceId = getLegacyWorkspaceId();
  const workspace = await prisma.workspace.findUnique({
    where: {
      id: workspaceId,
    },
  });

  if (!workspace) {
    throw new Error(`Legacy workspace not found: ${workspaceId}`);
  }

  await ensureWorkspaceMember(workspaceId, userId, "member");

  logPerformance("auth/ensure-legacy-workspace", startedAt);
  return workspace;
}
