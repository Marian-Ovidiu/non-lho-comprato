import type { Prisma } from "@/src/lib/generated/prisma/client";
import type { Person } from "@/src/lib/generated/prisma/enums";
import {
  getWorkspaceMemberSlots,
  isSecondaryMemberUserId,
} from "@/src/lib/member-slots";
import { PERSON_FILTER_LABELS, normalizeLegacyPerson } from "@/src/lib/ui-person";
import {
  dedupeWorkspaceMemberOptions,
  sortWorkspaceMembers,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";

export type WorkspaceMemberFilterOption = {
  value: string;
  label: string;
};

export function getWorkspaceMemberFilterOptions(
  members: WorkspaceMemberOption[],
): WorkspaceMemberFilterOption[] {
  const sorted = sortWorkspaceMembers(dedupeWorkspaceMemberOptions(members));

  return [
    { value: "", label: PERSON_FILTER_LABELS.ALL },
    ...sorted.map((member) => ({
      value: member.userId,
      label: member.label,
    })),
  ];
}

/** Resolves `?person=` to a workspace member user id (legacy enum values map to slots). */
export function resolveWorkspaceMemberFilter(
  value: string | undefined,
  members: WorkspaceMemberOption[],
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const memberIds = new Set(members.map((member) => member.userId));
  if (memberIds.has(trimmed)) {
    return trimmed;
  }

  const legacy = normalizeLegacyPerson(trimmed);
  if (!legacy) {
    return undefined;
  }

  const slots = getWorkspaceMemberSlots(members);
  if (legacy === "MARIAN" && slots.primaryUserId) {
    return slots.primaryUserId;
  }

  if (legacy === "MARTINA" && slots.secondaryUserId) {
    return slots.secondaryUserId;
  }

  return undefined;
}

export function getWorkspaceMemberFilter(
  value?: string | string[],
  members: WorkspaceMemberOption[] = [],
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return resolveWorkspaceMemberFilter(raw, members);
}

function userIdToLegacyBeneficiaryPerson(
  userId: string,
  members: WorkspaceMemberOption[],
): Person {
  const slots = getWorkspaceMemberSlots(members);
  return isSecondaryMemberUserId(userId, slots) ? "MARTINA" : "MARIAN";
}

/**
 * Entry filter aligned with member spending stats (paidByUserId + beneficiaries).
 * Legacy `Entry.person` is used only when there are no beneficiary rows.
 */
export function buildWorkspaceMemberEntryWhere(
  memberUserId: string | undefined,
  members: WorkspaceMemberOption[],
): Prisma.EntryWhereInput {
  if (!memberUserId) {
    return {};
  }

  const legacyPerson = userIdToLegacyBeneficiaryPerson(memberUserId, members);

  return {
    OR: [
      {
        paidByUserId: memberUserId,
        beneficiaries: {
          some: {
            userId: { not: memberUserId },
          },
        },
      },
      {
        AND: [
          {
            beneficiaries: {
              some: { userId: memberUserId },
            },
          },
          {
            beneficiaries: {
              none: { userId: { not: memberUserId } },
            },
          },
        ],
      },
      {
        beneficiaries: { none: {} },
        person: legacyPerson,
      },
    ],
  };
}
