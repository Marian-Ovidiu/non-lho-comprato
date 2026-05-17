import {
  dedupeWorkspaceMemberOptions,
  sortWorkspaceMembers,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";

export type WorkspaceMemberSlots = {
  primaryUserId: string | null;
  secondaryUserId: string | null;
};

export function getWorkspaceMemberSlots(
  members: WorkspaceMemberOption[],
): WorkspaceMemberSlots {
  const sorted = sortWorkspaceMembers(dedupeWorkspaceMemberOptions(members));

  return {
    primaryUserId: sorted[0]?.userId ?? null,
    secondaryUserId: sorted[1]?.userId ?? null,
  };
}

export function isSecondaryMemberUserId(
  userId: string,
  slots: WorkspaceMemberSlots,
): boolean {
  return Boolean(slots.secondaryUserId && userId === slots.secondaryUserId);
}
