import { prisma } from "@/src/lib/prisma";
import {
  dedupeWorkspaceMemberOptions,
  getWorkspaceMemberLabel,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";
import { cache } from "react";
import { getLegacyWorkspaceId } from "@/src/lib/auth/provisioning";
import {
  getCurrentUser as getAuthCurrentUser,
  getCurrentWorkspace as getAuthCurrentWorkspace,
  getCurrentWorkspaceId as getAuthCurrentWorkspaceId,
  getAccessibleWorkspacesForCurrentUser,
} from "@/src/lib/auth/session";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
type CurrentWorkspace = NonNullable<Awaited<ReturnType<typeof getAuthCurrentWorkspace>>>;
type CurrentWorkspaceUiContext = {
  id: string;
  name: string;
  kind: "private" | "shared";
  isShared: boolean;
  currency: string;
  language: string;
};

export type WorkspaceShellOption = {
  id: string;
  name: string;
  kind: "private" | "shared";
  isShared: boolean;
};

export type WorkspaceShellContext = {
  currentWorkspace: CurrentWorkspaceUiContext;
  availableWorkspaces: WorkspaceShellOption[];
  hasMultipleWorkspaces: boolean;
};

export type CurrentWorkspaceMemberDetail = {
  userId: string;
  name: string | null;
  email: string | null;
  role: "owner" | "member";
  joinedAt: Date;
  isCurrentUser: boolean;
};

type WorkspaceScopedRecord = {
  workspaceId?: string | null;
  habit?: {
    workspaceId?: string | null;
  } | null;
};

export async function getCurrentUser(): Promise<CurrentUser> {
  return getAuthCurrentUser();
}

export async function assertWorkspaceMember(
  userId: string,
  workspaceId: string,
): Promise<void> {
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
    select: {
      id: true,
    },
  });

  if (!membership) {
    throw new Error("Current user is not a member of the active workspace");
  }
}

export async function getCurrentWorkspace(): Promise<CurrentWorkspace> {
  return getAuthCurrentWorkspace();
}

export async function getCurrentWorkspaceId(): Promise<string> {
  return getAuthCurrentWorkspaceId();
}

export async function getCurrentWorkspaceTimezone(): Promise<string> {
  const workspace = await getCurrentWorkspace();
  return workspace.timezone ?? "Europe/Rome";
}

export async function getCurrentWorkspaceCurrency(): Promise<string> {
  const workspace = await getCurrentWorkspace();
  return workspace.currency ?? "EUR";
}

export async function getCurrentWorkspaceLanguage(): Promise<string> {
  const workspace = await getCurrentWorkspace();
  return workspace.language ?? "it";
}

export async function getCurrentWorkspaceMembers(): Promise<WorkspaceMemberOption[]> {
  const workspaceId = await getCurrentWorkspaceId();

  const memberships = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return dedupeWorkspaceMemberOptions(
    memberships.map((membership) => ({
      userId: membership.userId,
      name: membership.user.name,
      email: membership.user.email,
      label: getWorkspaceMemberLabel({
        userId: membership.userId,
        name: membership.user.name,
        email: membership.user.email,
      }),
    })),
  );
}

export async function getCurrentWorkspaceMemberDetails(): Promise<
  CurrentWorkspaceMemberDetail[]
> {
  const [workspaceId, currentUser] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUser(),
  ]);

  const memberships = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      { role: "asc" },
      { createdAt: "asc" },
    ],
  });

  return memberships.map((membership) => ({
    userId: membership.userId,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
    joinedAt: membership.createdAt,
    isCurrentUser: membership.userId === currentUser.id,
  }));
}

export async function getCurrentWorkspaceScopedWhere<
  T extends Record<string, unknown>,
>(extraWhere: T = {} as T): Promise<T & { workspaceId: string }> {
  return {
    ...extraWhere,
    workspaceId: await getCurrentWorkspaceId(),
  };
}

export async function getCurrentWorkspaceUiContext(): Promise<CurrentWorkspaceUiContext> {
  const workspace = await getCurrentWorkspace();

  return {
    id: workspace.id,
    name: workspace.name,
    kind: workspace.kind,
    isShared: workspace.kind === "shared",
    currency: workspace.currency ?? "EUR",
    language: workspace.language ?? "it",
  };
}

const getWorkspaceShellOptions = cache(async (): Promise<WorkspaceShellOption[]> => {
  const workspaces = await getAccessibleWorkspacesForCurrentUser();

  return workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    kind: workspace.kind,
    isShared: workspace.kind === "shared",
  }));
});

export async function getWorkspaceShellContext(): Promise<WorkspaceShellContext> {
  const [currentWorkspace, availableWorkspaces] = await Promise.all([
    getCurrentWorkspaceUiContext(),
    getWorkspaceShellOptions(),
  ]);

  const productionWorkspaceId = getLegacyWorkspaceId();
  const sortedWorkspaces = [...availableWorkspaces].sort((a, b) => {
    if (a.id === currentWorkspace.id) {
      return -1;
    }

    if (b.id === currentWorkspace.id) {
      return 1;
    }

    if (a.id === productionWorkspaceId) {
      return -1;
    }

    if (b.id === productionWorkspaceId) {
      return 1;
    }

    if (a.kind !== b.kind) {
      return a.kind === "shared" ? -1 : 1;
    }

    return a.name.localeCompare(b.name, "it");
  });

  return {
    currentWorkspace,
    availableWorkspaces: sortedWorkspaces,
    hasMultipleWorkspaces: sortedWorkspaces.length > 1,
  };
}

export function getWorkspaceScopedWhere<T extends Record<string, unknown>>(
  extraWhere: T = {} as T,
): T & { workspaceId: string } {
  return {
    ...extraWhere,
    workspaceId: getLegacyWorkspaceId(),
  };
}

export async function requireWorkspaceAccessForRecord<
  T extends WorkspaceScopedRecord,
>(record: T | null, resourceLabel = "record"): Promise<T> {
  const workspaceId = await getCurrentWorkspaceId();

  if (!record) {
    throw new Error(`${resourceLabel} not found`);
  }

  const recordWorkspaceId = record.workspaceId ?? record.habit?.workspaceId ?? null;

  if (recordWorkspaceId !== workspaceId) {
    throw new Error(`${resourceLabel} not found`);
  }

  return record;
}

export { getAuthenticatedUser, requireAuth, requireWorkspace } from "@/src/lib/auth/session";
