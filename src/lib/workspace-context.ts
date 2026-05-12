import { Person } from "@/src/lib/generated/prisma/enums";
import { prisma } from "@/src/lib/prisma";

const LEGACY_CURRENT_USER_ID = "legacy-marian";
const LEGACY_CURRENT_WORKSPACE_ID = "legacy-marian-martina";

export type LegacyPersonValue = "MARIAN" | "MARTINA" | "TUTTI";
type CurrentUser = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
type CurrentWorkspace = NonNullable<Awaited<ReturnType<typeof prisma.workspace.findUnique>>>;

type WorkspaceScopedRecord = {
  workspaceId?: string | null;
  habit?: {
    workspaceId?: string | null;
  } | null;
};

export async function getCurrentUser(): Promise<CurrentUser> {
  const user = await prisma.user.findUnique({
    where: { id: LEGACY_CURRENT_USER_ID },
  });

  if (!user) {
    throw new Error("Current user not found");
  }

  return user;
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
  const workspace = await prisma.workspace.findUnique({
    where: { id: LEGACY_CURRENT_WORKSPACE_ID },
  });

  if (!workspace) {
    throw new Error("Current workspace not found");
  }

  const user = await getCurrentUser();
  await assertWorkspaceMember(user.id, workspace.id);

  return workspace;
}

export async function getCurrentWorkspaceId(): Promise<string> {
  const workspace = await getCurrentWorkspace();
  return workspace.id;
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
  const workspaceId = LEGACY_CURRENT_WORKSPACE_ID;

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
  person?: LegacyPersonValue | Person | null,
): string | null {
  const normalizedPerson = person == null ? undefined : String(person);

  if (normalizedPerson === "MARIAN") {
    return LEGACY_CURRENT_USER_ID;
  }

  if (normalizedPerson === "MARTINA") {
    return "legacy-martina";
  }

  return null;
}
