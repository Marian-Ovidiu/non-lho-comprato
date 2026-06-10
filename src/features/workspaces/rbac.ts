import "server-only";

import { prisma } from "@/src/lib/prisma";
import {
  canRemoveWorkspaceMember,
  type WorkspaceRole,
} from "@/src/features/workspaces/rbac-policy";

type WorkspaceRbacDb = Pick<typeof prisma, "workspace" | "workspaceMember">;
type WorkspaceRbacErrorCode =
  | "workspace_not_found"
  | "not_member"
  | "target_not_found"
  | "forbidden";

export class WorkspaceRbacError extends Error {
  readonly code: WorkspaceRbacErrorCode;

  constructor(code: WorkspaceRbacErrorCode, message: string) {
    super(message);
    this.name = "WorkspaceRbacError";
    this.code = code;
  }
}

export async function requireWorkspaceRole(
  db: WorkspaceRbacDb,
  {
    workspaceId,
    userId,
    roles,
  }: {
    workspaceId: string;
    userId: string;
    roles: WorkspaceRole[];
  },
) {
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { id: true, role: true },
  });

  if (!membership) {
    throw new WorkspaceRbacError(
      "not_member",
      "Non sei membro di questo workspace.",
    );
  }

  if (!roles.includes(membership.role)) {
    throw new WorkspaceRbacError(
      "forbidden",
      "Non hai i permessi per questa operazione.",
    );
  }

  return membership;
}

export async function authorizeWorkspaceMemberRemoval(
  db: WorkspaceRbacDb,
  {
    workspaceId,
    actorUserId,
    targetUserId,
  }: {
    workspaceId: string;
    actorUserId: string;
    targetUserId: string;
  },
) {
  const [workspace, actorMembership, targetMembership, ownerCount] =
    await Promise.all([
      db.workspace.findUnique({
        where: { id: workspaceId },
        select: { ownerUserId: true },
      }),
      db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: actorUserId },
        },
        select: { id: true, role: true },
      }),
      db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: targetUserId },
        },
        select: { id: true, role: true },
      }),
      db.workspaceMember.count({
        where: { workspaceId, role: "owner" },
      }),
    ]);

  if (!workspace) {
    throw new WorkspaceRbacError(
      "workspace_not_found",
      "Workspace non disponibile.",
    );
  }

  if (!actorMembership) {
    throw new WorkspaceRbacError(
      "not_member",
      "Non sei membro di questo workspace.",
    );
  }

  if (!targetMembership) {
    throw new WorkspaceRbacError("target_not_found", "Membro non trovato.");
  }

  const decision = canRemoveWorkspaceMember({
    actorUserId,
    targetUserId,
    actorRole: actorMembership.role,
    targetRole: targetMembership.role,
    workspaceOwnerUserId: workspace.ownerUserId,
    ownerCount,
  });

  if (!decision.allowed) {
    throw new WorkspaceRbacError("forbidden", decision.message);
  }

  return targetMembership;
}
