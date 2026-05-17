export type WorkspaceMemberOption = {
  userId: string;
  label: string;
  name: string | null;
  email: string | null;
};

const LEGACY_MARIAN_USER_ID = "legacy-marian";
const LEGACY_MARTINA_USER_ID = "legacy-martina";

export function dedupeWorkspaceMemberOptions(
  members: WorkspaceMemberOption[],
): WorkspaceMemberOption[] {
  const hasCanonicalMarian = members.some(
    (member) =>
      member.userId !== LEGACY_MARIAN_USER_ID &&
      member.userId !== LEGACY_MARTINA_USER_ID,
  );

  if (!hasCanonicalMarian) {
    return members;
  }

  return members.filter((member) => member.userId !== LEGACY_MARIAN_USER_ID);
}

export function getWorkspaceMemberLabel(
  member: Pick<WorkspaceMemberOption, "name" | "email" | "userId">,
): string {
  const name = member.name?.trim();
  if (name) {
    return name;
  }

  const email = member.email?.trim();
  if (email) {
    return email;
  }

  return "Membro";
}

export function sortWorkspaceMembers(
  members: WorkspaceMemberOption[],
): WorkspaceMemberOption[] {
  return [...members].sort((left, right) => {
    const leftLabel = left.label.localeCompare(right.label, "it");
    if (leftLabel !== 0) {
      return leftLabel;
    }

    return left.userId.localeCompare(right.userId);
  });
}

export function getDefaultPaidByUserId(
  members: WorkspaceMemberOption[],
  currentUserId?: string | null,
): string {
  if (currentUserId && members.some((member) => member.userId === currentUserId)) {
    return currentUserId;
  }

  return sortWorkspaceMembers(members)[0]?.userId ?? currentUserId ?? "";
}

export function getDefaultBeneficiaryUserIds(
  members: WorkspaceMemberOption[],
  paidByUserId?: string | null,
): string[] {
  const fallback = getDefaultPaidByUserId(members, paidByUserId);

  if (!fallback) {
    return [];
  }

  return [fallback];
}

export function resolveEntryPeopleFromRecord(
  entry: {
    paidByUserId: string | null;
    beneficiaries: { userId: string }[];
  },
  members: WorkspaceMemberOption[],
): {
  paidByUserId: string;
  beneficiaryUserIds: string[];
} {
  const paidByUserId =
    entry.paidByUserId ?? getDefaultPaidByUserId(members);
  const beneficiaryUserIds = Array.from(
    new Set(entry.beneficiaries.map((beneficiary) => beneficiary.userId)),
  );

  return {
    paidByUserId,
    beneficiaryUserIds:
      beneficiaryUserIds.length > 0
        ? beneficiaryUserIds
        : getDefaultBeneficiaryUserIds(members, paidByUserId),
  };
}

export function getMemberLabel(
  members: WorkspaceMemberOption[],
  userId: string | null | undefined,
): string | null {
  if (!userId) {
    return null;
  }

  const member = members.find((item) => item.userId === userId);
  return member ? member.label : null;
}
