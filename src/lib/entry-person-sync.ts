import {
  getHabitTargetUserIds,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";

export function syncHabitEntryPersonColumns(input: {
  targetScope?: string | null;
  targetUserId?: string | null;
  currentUserId: string;
  members: WorkspaceMemberOption[];
}): {
  paidByUserId: string;
  beneficiaryUserIds: string[];
} {
  const beneficiaryUserIds = getHabitTargetUserIds({
    targetScope: input.targetScope,
    targetUserId: input.targetUserId,
    members: input.members,
    currentUserId: input.currentUserId,
  });

  return {
    paidByUserId: input.currentUserId,
    beneficiaryUserIds:
      beneficiaryUserIds.length > 0 ? beneficiaryUserIds : [input.currentUserId],
  };
}
