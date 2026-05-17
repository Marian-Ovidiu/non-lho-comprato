import { prisma } from "@/src/lib/prisma";
import { logWorkspaceResolutionSnapshot } from "@/src/lib/workspace-debug";

const DEFAULT_LEGACY_WORKSPACE_ID = "legacy-marian-martina";
const DEFAULT_LEGACY_MARIAN_USER_ID = "legacy-marian";
const DEFAULT_LEGACY_MARTINA_USER_ID = "legacy-martina";
const DEFAULT_PRODUCTION_WORKSPACE_NAME = "Marian & Martina";
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

type WorkspaceRecord = {
  id: string;
  name: string;
  kind: "private" | "shared";
  ownerUserId: string;
};

function toWorkspaceRecord(workspace: {
  id: string;
  name: string;
  kind: string;
  ownerUserId: string;
}): WorkspaceRecord {
  return {
    id: workspace.id,
    name: workspace.name,
    kind: workspace.kind === "shared" ? "shared" : "private",
    ownerUserId: workspace.ownerUserId,
  };
}

export function getLegacyWorkspaceId() {
  return process.env.LEGACY_WORKSPACE_ID?.trim() || DEFAULT_LEGACY_WORKSPACE_ID;
}

export function getProductionWorkspaceDisplayName() {
  return (
    process.env.PRODUCTION_WORKSPACE_NAME?.trim() ||
    DEFAULT_PRODUCTION_WORKSPACE_NAME
  );
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

  if (userId !== DEFAULT_LEGACY_MARIAN_USER_ID) {
    await ensureWorkspaceMember(
      workspaceId,
      userId,
      userId === DEFAULT_LEGACY_MARIAN_USER_ID ? "owner" : "member",
    );
  }

  return {
    id: workspace.id,
    name: displayName,
    kind: "shared",
    ownerUserId: workspace.ownerUserId,
  };
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

async function resolveCanonicalMarianUserId(): Promise<string | null> {
  const workspaceId = getLegacyWorkspaceId();
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerUserId: true },
  });

  if (
    workspace?.ownerUserId &&
    workspace.ownerUserId !== DEFAULT_LEGACY_MARTINA_USER_ID &&
    workspace.ownerUserId !== DEFAULT_LEGACY_MARIAN_USER_ID
  ) {
    return workspace.ownerUserId;
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: {
        notIn: [DEFAULT_LEGACY_MARTINA_USER_ID, DEFAULT_LEGACY_MARIAN_USER_ID],
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
    // TODO: replace this legacy-email bridge with proper invited-member onboarding.
    const email = normalizeEmail(authUser.email);
    const existingByEmail = email
      ? await prisma.user.findUnique({
          where: { email },
        })
      : null;
    const canonicalMarianUserId = await resolveCanonicalMarianUserId();

    let targetUserId =
      existingByEmail?.id ??
      (legacyMapping.userId === DEFAULT_LEGACY_MARIAN_USER_ID
        ? (canonicalMarianUserId ?? authUser.id)
        : legacyMapping.userId);

    if (
      legacyMapping.userId === DEFAULT_LEGACY_MARIAN_USER_ID &&
      targetUserId === DEFAULT_LEGACY_MARIAN_USER_ID &&
      canonicalMarianUserId
    ) {
      targetUserId = canonicalMarianUserId;
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
  const productionId = getLegacyWorkspaceId();
  const productionWorkspace = accessibleWorkspaces.find(
    (workspace) => workspace.id === productionId,
  );

  const legacyMapping = getLegacyAuthMapping(email);

  if (legacyMapping) {
    const legacyWorkspace = accessibleWorkspaces.find(
      (workspace) => workspace.id === legacyMapping.workspaceId,
    );

    if (legacyWorkspace) {
      return {
        workspace: legacyWorkspace,
        resolutionPath: "legacy-email:accessible",
      };
    }

    return {
      workspace: await ensureLegacyWorkspaceForUser(userId),
      resolutionPath: "legacy-email:ensure",
    };
  }

  if (selectedWorkspaceId) {
    const selectedWorkspace = accessibleWorkspaces.find(
      (workspace) => workspace.id === selectedWorkspaceId,
    );

    if (selectedWorkspace) {
      if (productionWorkspace && selectedWorkspace.id !== productionId) {
        const [selectedEntries, productionEntries] = await Promise.all([
          countWorkspaceEntries(selectedWorkspace.id),
          countWorkspaceEntries(productionId),
        ]);

        if (selectedEntries === 0 && productionEntries > 0) {
          return {
            workspace: productionWorkspace,
            resolutionPath: "cookie:fallback-empty-to-production",
          };
        }
      }

      return {
        workspace: selectedWorkspace,
        resolutionPath: "cookie:selected",
      };
    }

    return resolveDefaultWorkspaceForUser(
      userId,
      email,
      accessibleWorkspaces,
      "cookie:ignored-not-member",
    );
  }

  return resolveDefaultWorkspaceForUser(
    userId,
    email,
    accessibleWorkspaces,
    "accessible:fallback",
  );
}
