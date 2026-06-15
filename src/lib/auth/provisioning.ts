import { prisma } from "@/src/lib/prisma";
import {
  getLegacyAuthMapping,
  getLegacyPrimaryUserId,
  getLegacySecondaryUserId,
  getLegacyWorkspaceId,
  getProductionWorkspaceDisplayName,
  normalizeEmail,
} from "@/src/lib/auth/legacy-auth";
import { logWorkspaceResolutionSnapshot } from "@/src/lib/workspace-debug";

const shouldLogPerformance = process.env.NODE_ENV !== "production";

export {
  getLegacyAuthMapping,
  getLegacyPrimaryUserId,
  getLegacySecondaryUserId,
  getLegacyWorkspaceId,
  getProductionWorkspaceDisplayName,
  isLegacyAuthBridgeEnabled,
} from "@/src/lib/auth/legacy-auth";

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

function buildWorkspaceName(user: AppUserLike) {
  return user.name || user.email || "Workspace personale";
}

function getPrivateWorkspaceId(userId: string) {
  return `private-${userId}`;
}

type WorkspaceRecord = {
  id: string;
  name: string;
  kind: "private" | "shared";
  timezone: string;
  currency: string;
  ownerUserId: string;
};

function toWorkspaceRecord(workspace: {
  id: string;
  name: string;
  kind: string;
  timezone: string;
  currency: string;
  ownerUserId: string;
}): WorkspaceRecord {
  return {
    id: workspace.id,
    name: workspace.name,
    kind: workspace.kind === "shared" ? "shared" : "private",
    timezone: workspace.timezone,
    currency: workspace.currency,
    ownerUserId: workspace.ownerUserId,
  };
}

export async function countWorkspaceEntries(workspaceId: string) {
  return prisma.entry.count({
    where: {
      workspaceId,
    },
  });
}

export async function adoptProductionWorkspaceForUser(
  userId: string,
): Promise<WorkspaceRecord | null> {
  const workspaceId = getLegacyWorkspaceId();
  const legacyPrimaryUserId = getLegacyPrimaryUserId();
  const workspace = await prisma.workspace.findUnique({
    where: {
      id: workspaceId,
    },
    include: {
      _count: {
        select: {
          entries: true,
        },
      },
    },
  });

  if (!workspace || workspace._count.entries === 0) {
    return null;
  }

  const displayName = getProductionWorkspaceDisplayName();

  if (workspace.name !== displayName || workspace.kind !== "shared") {
    await prisma.workspace.update({
      where: {
        id: workspaceId,
      },
      data: {
        name: displayName,
        kind: "shared",
      },
    });
  }

  if (userId !== legacyPrimaryUserId) {
    await ensureWorkspaceMember(
      workspaceId,
      userId,
      userId === legacyPrimaryUserId ? "owner" : "member",
    );
  }

  return {
    id: workspace.id,
    name: displayName,
    kind: "shared",
    timezone: workspace.timezone,
    currency: workspace.currency,
    ownerUserId: workspace.ownerUserId,
  };
}

async function resolveCanonicalPrimaryUserId(): Promise<string | null> {
  const workspaceId = getLegacyWorkspaceId();
  const legacyPrimaryUserId = getLegacyPrimaryUserId();
  const legacySecondaryUserId = getLegacySecondaryUserId();
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerUserId: true },
  });

  if (
    workspace?.ownerUserId &&
    workspace.ownerUserId !== legacySecondaryUserId &&
    workspace.ownerUserId !== legacyPrimaryUserId
  ) {
    return workspace.ownerUserId;
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: {
        notIn: [legacySecondaryUserId, legacyPrimaryUserId],
      },
    },
    select: { userId: true },
    orderBy: { createdAt: "asc" },
  });

  return member?.userId ?? null;
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
    const email = normalizeEmail(authUser.email);
    const existingByEmail = email
      ? await prisma.user.findUnique({
          where: { email },
        })
      : null;
    const canonicalPrimaryUserId = await resolveCanonicalPrimaryUserId();
    const legacyPrimaryUserId = getLegacyPrimaryUserId();

    let targetUserId =
      existingByEmail?.id ??
      (legacyMapping.userId === legacyPrimaryUserId
        ? (canonicalPrimaryUserId ?? authUser.id)
        : legacyMapping.userId);

    if (
      legacyMapping.userId === legacyPrimaryUserId &&
      targetUserId === legacyPrimaryUserId &&
      canonicalPrimaryUserId
    ) {
      targetUserId = canonicalPrimaryUserId;
    }

    const user = await prisma.user.upsert({
      where: {
        id: targetUserId,
      },
      update: {
        email: authUser.email ?? existingByEmail?.email,
        name: authUser.name ?? existingByEmail?.name,
        image: authUser.image ?? existingByEmail?.image,
      },
      create: {
        id: targetUserId,
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
  const adoptedWorkspace = await adoptProductionWorkspaceForUser(userId);

  if (adoptedWorkspace) {
    logPerformance("auth/ensure-legacy-workspace-adopted", startedAt);
    return toWorkspaceRecord(adoptedWorkspace);
  }

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
  return toWorkspaceRecord(workspace);
}

export async function getAccessibleWorkspacesForUserId(userId: string) {
  return prisma.workspace.findMany({
    where: {
      OR: [
        {
          ownerUserId: userId,
        },
        {
          members: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      kind: true,
      timezone: true,
      currency: true,
      ownerUserId: true,
    },
  });
}

export async function resolveWorkspaceForAuthenticatedUser(
  authUser: AuthUserLike,
  selectedWorkspaceId?: string | null,
) {
  const user = await ensureAppUserForAuthUser(authUser);
  const accessibleWorkspaces = await getAccessibleWorkspacesForUserId(user.id);

  const { workspace, resolutionPath } = await resolveActiveWorkspaceForUser({
    userId: user.id,
    email: authUser.email,
    selectedWorkspaceId,
    accessibleWorkspaces,
  });

  await logWorkspaceResolutionSnapshot({
    source: "resolveWorkspaceForAuthenticatedUser",
    authUserId: authUser.id,
    authUserEmail: authUser.email,
    appUserId: user.id,
    selectedWorkspaceId: selectedWorkspaceId ?? null,
    resolvedWorkspace: workspace,
    accessibleWorkspaces,
    resolutionPath,
  });

  return {
    user,
    workspace,
    accessibleWorkspaces,
    resolutionPath,
  };
}

function pickAccessibleWorkspace(
  userId: string,
  accessibleWorkspaces: WorkspaceRecord[],
): WorkspaceRecord | null {
  if (accessibleWorkspaces.length === 0) {
    return null;
  }

  const privateWorkspace = accessibleWorkspaces.find(
    (workspace) => workspace.id === getPrivateWorkspaceId(userId),
  );

  if (privateWorkspace) {
    return privateWorkspace;
  }

  const ownedWorkspace = accessibleWorkspaces.find(
    (workspace) => workspace.ownerUserId === userId,
  );

  if (ownedWorkspace) {
    return ownedWorkspace;
  }

  return accessibleWorkspaces[0] ?? null;
}

async function resolveDefaultWorkspaceForUser(
  userId: string,
  email: string | null,
  accessibleWorkspaces: WorkspaceRecord[],
  resolutionPath: string,
): Promise<{ workspace: WorkspaceRecord; resolutionPath: string }> {
  const fallbackWorkspace = pickAccessibleWorkspace(userId, accessibleWorkspaces);

  if (fallbackWorkspace) {
    return {
      workspace: fallbackWorkspace,
      resolutionPath,
    };
  }

  return {
    workspace: toWorkspaceRecord(
      await ensureDefaultWorkspaceForUser({
        id: userId,
        email,
        name: null,
        image: null,
      }),
    ),
    resolutionPath: `${resolutionPath}:create-private`,
  };
}

export async function resolveActiveWorkspaceForUser({
  userId,
  email,
  selectedWorkspaceId,
  accessibleWorkspaces,
}: {
  userId: string;
  email: string | null;
  selectedWorkspaceId?: string | null;
  accessibleWorkspaces: WorkspaceRecord[];
}): Promise<{ workspace: WorkspaceRecord; resolutionPath: string }> {
  let ignoredSelectedWorkspace = false;

  if (selectedWorkspaceId) {
    const selectedWorkspace = accessibleWorkspaces.find(
      (workspace) => workspace.id === selectedWorkspaceId,
    );

    if (selectedWorkspace) {
      return {
        workspace: selectedWorkspace,
        resolutionPath: "cookie:selected",
      };
    }

    ignoredSelectedWorkspace = true;
  }

  const legacyMapping = getLegacyAuthMapping(email);

  if (legacyMapping) {
    const legacyWorkspace = accessibleWorkspaces.find(
      (workspace) => workspace.id === legacyMapping.workspaceId,
    );

    if (legacyWorkspace) {
      return {
        workspace: legacyWorkspace,
        resolutionPath: ignoredSelectedWorkspace
          ? "cookie:ignored-not-member:legacy-email:accessible"
          : "legacy-email:accessible",
      };
    }

    return {
      workspace: await ensureLegacyWorkspaceForUser(userId),
      resolutionPath: ignoredSelectedWorkspace
        ? "cookie:ignored-not-member:legacy-email:ensure"
        : "legacy-email:ensure",
    };
  }

  return resolveDefaultWorkspaceForUser(
    userId,
    email,
    accessibleWorkspaces,
    ignoredSelectedWorkspace ? "cookie:ignored-not-member" : "accessible:fallback",
  );
}
