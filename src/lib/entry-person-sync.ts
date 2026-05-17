import type { Person } from "@/src/lib/generated/prisma/enums";
import { getEntryExpenseKind } from "@/src/lib/entry-ownership";
import {
  getWorkspaceMemberSlots,
  isSecondaryMemberUserId,
  type WorkspaceMemberSlots,
} from "@/src/lib/member-slots";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

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

/** Keeps Entry.person / Entry.paidBy aligned with ownership fields for legacy filters. */
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
