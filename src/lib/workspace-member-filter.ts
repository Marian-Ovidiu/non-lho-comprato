import type { Prisma } from "@/src/lib/generated/prisma/client";
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
    { value: "", label: "Tutti i movimenti" },
    ...sorted.map((member) => ({
      value: member.userId,
      label: member.label,
    })),
  ];
}

/** Resolves `?person=` URL param to a workspace member userId. */
export function resolveWorkspaceMemberFilter(
  value: string | undefined,
  members: WorkspaceMemberOption[],
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const memberIds = new Set(members.map((member) => member.userId));
  return memberIds.has(trimmed) ? trimmed : undefined;
}

export function getWorkspaceMemberFilter(
  value?: string | string[],
  members: WorkspaceMemberOption[] = [],
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return resolveWorkspaceMemberFilter(raw, members);
}

/** Entry filter aligned with member spending stats (paidByUserId + beneficiaries). */
export function buildWorkspaceMemberEntryWhere(
  memberUserId: string | undefined,
): Prisma.EntryWhereInput {
  if (!memberUserId) {
    return {};
  }

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
    ],
  };
}
