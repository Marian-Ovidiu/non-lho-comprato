import type { Person } from "@/src/lib/generated/prisma/enums";
import { getEntryExpenseKind } from "@/src/lib/entry-ownership";
import {
  getWorkspaceMemberSlots,
  isSecondaryMemberUserId,
  type WorkspaceMemberSlots,
} from "@/src/lib/member-slots";
import {
  getHabitTargetUserIds,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";

function userIdToPaidByPerson(
  userId: string,
  slots: WorkspaceMemberSlots,
): Person {
  return isSecondaryMemberUserId(userId, slots) ? "MARTINA" : "MARIAN";
}

function beneficiaryUserIdsToPerson(
  beneficiaryUserIds: readonly string[],
  slots: WorkspaceMemberSlots,
): Person {
  if (getEntryExpenseKind(beneficiaryUserIds) === "shared") {
    return "TUTTI";
  }

  const soleBeneficiary = beneficiaryUserIds[0];

  if (soleBeneficiary && isSecondaryMemberUserId(soleBeneficiary, slots)) {
    return "MARTINA";
  }

  return "MARIAN";
}

/**
 * Projects user/member ownership into legacy Person columns.
 * Runtime ownership must keep using paidByUserId and EntryBeneficiary rows.
 */
export function syncEntryPersonColumns(
  paidByUserId: string,
  beneficiaryUserIds: readonly string[],
  members: WorkspaceMemberOption[],
): {
  person: Person;
  paidBy: Person;
} {
  const slots = getWorkspaceMemberSlots(members);

  return {
    person: beneficiaryUserIdsToPerson(beneficiaryUserIds, slots),
    paidBy: userIdToPaidByPerson(paidByUserId, slots),
  };
}

export function syncHabitEntryPersonColumns(input: {
  targetScope?: string | null;
  targetUserId?: string | null;
  currentUserId: string;
  members: WorkspaceMemberOption[];
}): {
  paidByUserId: string;
  beneficiaryUserIds: string[];
  person: Person;
  paidBy: Person;
} {
  const beneficiaryUserIds = getHabitTargetUserIds({
    targetScope: input.targetScope,
    targetUserId: input.targetUserId,
    members: input.members,
    currentUserId: input.currentUserId,
  });
  const resolvedBeneficiaryUserIds =
    beneficiaryUserIds.length > 0 ? beneficiaryUserIds : [input.currentUserId];
  const personColumns = syncEntryPersonColumns(
    input.currentUserId,
    resolvedBeneficiaryUserIds,
    input.members,
  );

  return {
    paidByUserId: input.currentUserId,
    beneficiaryUserIds: resolvedBeneficiaryUserIds,
    ...personColumns,
  };
}
