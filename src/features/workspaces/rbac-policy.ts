export type WorkspaceRole = "owner" | "member";

export type RemoveWorkspaceMemberPolicyInput = {
  actorUserId: string;
  targetUserId: string;
  actorRole: WorkspaceRole;
  targetRole: WorkspaceRole;
  workspaceOwnerUserId: string;
  ownerCount: number;
};

export type RemoveWorkspaceMemberPolicyDecision =
  | { allowed: true }
  | { allowed: false; message: string };

export function canRemoveWorkspaceMember({
  actorUserId,
  targetUserId,
  actorRole,
  targetRole,
  workspaceOwnerUserId,
  ownerCount,
}: RemoveWorkspaceMemberPolicyInput): RemoveWorkspaceMemberPolicyDecision {
  const isSelfRemoval = actorUserId === targetUserId;
  const targetIsWorkspaceOwner = targetUserId === workspaceOwnerUserId;
  const targetIsOwner = targetRole === "owner";

  if (targetIsOwner && ownerCount <= 1) {
    return {
      allowed: false,
      message: "Non puoi rimuovere l'ultimo owner dello workspace.",
    };
  }

  if (isSelfRemoval) {
    if (targetIsOwner || targetIsWorkspaceOwner) {
      return {
        allowed: false,
        message: "Prima trasferisci la proprieta dello workspace a un altro owner.",
      };
    }

    return { allowed: true };
  }

  if (actorRole !== "owner") {
    return {
      allowed: false,
      message: "Solo un owner puo rimuovere altri membri.",
    };
  }

  if (targetIsWorkspaceOwner) {
    return {
      allowed: false,
      message: "Prima trasferisci la proprieta dello workspace a un altro owner.",
    };
  }

  return { allowed: true };
}
