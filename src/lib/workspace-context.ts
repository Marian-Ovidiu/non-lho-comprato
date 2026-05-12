import { prisma } from "@/src/lib/prisma";
import {
  DEFAULT_LEGACY_PERSON,
  normalizeLegacyPerson,
  type LegacyPersonValue,
} from "@/src/lib/ui-person";
import {
  getCurrentUser as getAuthCurrentUser,
  getCurrentWorkspace as getAuthCurrentWorkspace,
  getCurrentWorkspaceId as getAuthCurrentWorkspaceId,
} from "@/src/lib/auth/session";

const LEGACY_CURRENT_USER_ID = "legacy-marian";
const LEGACY_CURRENT_WORKSPACE_ID = "legacy-marian-martina";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
type CurrentWorkspace = NonNullable<Awaited<ReturnType<typeof prisma.workspace.findUnique>>>;
type CurrentWorkspaceUiContext = {
  id: string;
  name: string;
  kind: "private" | "shared";
  isShared: boolean;
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
  };
}

export function getWorkspaceScopedWhere<T extends Record<string, unknown>>(
  extraWhere: T = {} as T,
): T & { workspaceId: string } {
  return {
    ...extraWhere,
    workspaceId: LEGACY_CURRENT_WORKSPACE_ID,
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

export function mapLegacyPersonToUserId(
  person?: LegacyPersonValue | string | null,
): string | null {
  const normalizedPerson = normalizeLegacyPerson(
    person == null ? undefined : String(person),
  );

  if (normalizedPerson === DEFAULT_LEGACY_PERSON) {
    return LEGACY_CURRENT_USER_ID;
  }

  if (normalizedPerson === "MARTINA") {
    return "legacy-martina";
  }

  return null;
}

export { getAuthenticatedUser, requireAuth, requireWorkspace } from "@/src/lib/auth/session";
