import { prisma } from "@/src/lib/prisma";

const DEFAULT_LEGACY_WORKSPACE_ID = "legacy-marian-martina";
const DEFAULT_LEGACY_MARIAN_USER_ID = "legacy-marian";
const DEFAULT_LEGACY_MARTINA_USER_ID = "legacy-martina";

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
  const legacyMapping = getLegacyAuthMapping(authUser.email);

  if (legacyMapping) {
    // TODO: replace this legacy-email bridge with proper invited-member onboarding.
    return prisma.user.upsert({
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
  }

  const existingById = await prisma.user.findUnique({
    where: {
      id: authUser.id,
    },
  });

  if (existingById) {
    return prisma.user.update({
      where: {
        id: authUser.id,
      },
      data: {
        email: authUser.email,
        name: authUser.name ?? existingById.name,
        image: authUser.image ?? existingById.image,
      },
    });
  }

  const email = normalizeEmail(authUser.email);

  if (email) {
    const existingByEmail = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingByEmail) {
      return prisma.user.update({
        where: {
          id: existingByEmail.id,
        },
        data: {
          name: authUser.name ?? existingByEmail.name,
          image: authUser.image ?? existingByEmail.image,
        },
      });
    }
  }

  return prisma.user.create({
    data: {
      id: authUser.id,
      email,
      name: authUser.name,
      image: authUser.image,
    },
  });
}

export async function ensureDefaultWorkspaceForUser(user: AppUserLike) {
  return prisma.$transaction(async (tx) => {
    const ownedWorkspace = await tx.workspace.findFirst({
      where: {
        ownerUserId: user.id,
      },
    });

    if (ownedWorkspace) {
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

      return existingWorkspace;
    }
  });
}

export async function ensureLegacyWorkspaceForUser(userId: string) {
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

  return workspace;
}
