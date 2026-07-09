import { prisma } from "@/src/lib/prisma";
import { logWorkspaceResolutionSnapshot } from "@/src/lib/workspace-debug";

const shouldLogPerformance = process.env.NODE_ENV !== "production";

function normalizeEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function logPerformance(label: string, startedAt: number) {
  if (!shouldLogPerformance) {
    return;
  }

  console.info(`[perf] ${label} ${Math.round(performance.now() - startedAt)}ms`);
}

type AuthUserLike = {
  id: string;
  email: string | null;
  emailVerified: boolean;
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
  language: string;
  ownerUserId: string;
  lastSelectedAt: Date | null;
};

function toWorkspaceRecord(workspace: {
  id: string;
  name: string;
  kind: string;
  timezone: string;
  currency: string;
  language: string;
  ownerUserId: string;
  lastSelectedAt?: Date | null;
}): WorkspaceRecord {
  return {
    id: workspace.id,
    name: workspace.name,
    kind: workspace.kind === "shared" ? "shared" : "private",
    timezone: workspace.timezone,
    currency: workspace.currency,
    language: workspace.language,
    ownerUserId: workspace.ownerUserId,
    lastSelectedAt: workspace.lastSelectedAt ?? null,
  };
}

export async function ensureAppUserForAuthUser(authUser: AuthUserLike) {
  const startedAt = performance.now();

  // Provisioning treats the email as an identity claim: it links new auth
  // accounts to existing app users and overwrites the stored address. An
  // unverified address from a misconfigured auth provider would therefore
  // allow taking over the account that owns it, or squatting the address
  // before its owner signs up. Refuse instead of trusting it.
  if (authUser.email && !authUser.emailVerified) {
    throw new Error(
      "Refusing to provision an account for an unverified email address",
    );
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
        // Normalize the incoming address (the email lookups below are
        // case-sensitive) and keep the stored one when a later login carries no
        // email, so a provider that stops returning it can't null out identity.
        email: normalizeEmail(authUser.email) ?? existingById.email,
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
          language: "en",
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

export async function getAccessibleWorkspacesForUserId(userId: string) {
  const workspaces = await prisma.workspace.findMany({
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
      language: true,
      ownerUserId: true,
      members: {
        where: {
          userId,
        },
        select: {
          lastSelectedAt: true,
        },
        take: 1,
      },
    },
  });

  return workspaces.map((workspace) =>
    toWorkspaceRecord({
      ...workspace,
      lastSelectedAt: workspace.members?.[0]?.lastSelectedAt ?? null,
    }),
  );
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

  const lastSelectedWorkspace = accessibleWorkspaces
    .filter((workspace) => workspace.lastSelectedAt)
    .sort(
      (left, right) =>
        right.lastSelectedAt!.getTime() - left.lastSelectedAt!.getTime(),
    )[0];

  if (lastSelectedWorkspace) {
    return lastSelectedWorkspace;
  }

  const sharedWorkspace = accessibleWorkspaces.find(
    (workspace) => workspace.kind === "shared",
  );

  if (sharedWorkspace) {
    return sharedWorkspace;
  }

  const ownedWorkspace = accessibleWorkspaces.find(
    (workspace) => workspace.ownerUserId === userId,
  );

  if (ownedWorkspace) {
    return ownedWorkspace;
  }

  const privateWorkspace = accessibleWorkspaces.find(
    (workspace) => workspace.id === getPrivateWorkspaceId(userId),
  );

  if (privateWorkspace) {
    return privateWorkspace;
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

  return resolveDefaultWorkspaceForUser(
    userId,
    email,
    accessibleWorkspaces,
    ignoredSelectedWorkspace ? "cookie:ignored-not-member" : "accessible:fallback",
  );
}
