export type WorkspaceMemberOption = {
  userId: string;
  label: string;
  name: string | null;
  email: string | null;
};

export type HabitTargetScope = "self" | "shared";

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

export function isHabitTargetScope(
  value?: string | null,
): value is HabitTargetScope {
  return value === "self" || value === "shared";
}

export function normalizeHabitTargetScope(
  value?: string | null,
): HabitTargetScope {
  return isHabitTargetScope(value) ? value : "self";
}

export function getDefaultHabitTargetUserId(
  members: WorkspaceMemberOption[],
  currentUserId?: string | null,
): string {
  if (currentUserId && members.some((member) => member.userId === currentUserId)) {
    return currentUserId;
  }

  return sortWorkspaceMembers(members)[0]?.userId ?? currentUserId ?? "";
}

export function getHabitTargetUserIds(input: {
  targetScope?: string | null;
  targetUserId?: string | null;
  members: WorkspaceMemberOption[];
  currentUserId?: string | null;
}): string[] {
  const targetScope = normalizeHabitTargetScope(input.targetScope);
  const memberIds = new Set(input.members.map((member) => member.userId));

  if (targetScope === "shared") {
    return input.members.map((member) => member.userId);
  }

  const targetUserId = input.targetUserId?.trim() ?? "";

  if (targetUserId && memberIds.has(targetUserId)) {
    return [targetUserId];
  }

  const fallbackUserId = getDefaultHabitTargetUserId(
    input.members,
    input.currentUserId,
  );

  return fallbackUserId ? [fallbackUserId] : [];
}

export function getHabitTargetLabel(
  input: {
    targetScope?: string | null;
    targetUserId?: string | null;
  },
  members: WorkspaceMemberOption[],
): string {
  const targetScope = normalizeHabitTargetScope(input.targetScope);

  if (targetScope === "shared") {
    return "Condivisa";
  }

  const targetUserId = input.targetUserId?.trim() ?? "";
  if (!targetUserId) {
    return "Solo io";
  }

  const member = members.find((item) => item.userId === targetUserId);
  return member?.label ?? "Solo io";
}

export function getHabitTargetDisplayLabel(input: {
  targetScope?: string | null;
  targetUserId?: string | null;
  currentUserId?: string | null;
  members: WorkspaceMemberOption[];
}): string {
  const targetScope = normalizeHabitTargetScope(input.targetScope);

  if (targetScope === "shared") {
    return "Condivisa";
  }

  const targetUserId = input.targetUserId?.trim() ?? "";
  if (!targetUserId || targetUserId === input.currentUserId) {
    return "Solo io";
  }

  const member = input.members.find((item) => item.userId === targetUserId);
  return member?.label ?? "Solo io";
}

export function getHabitTargetOptionLabel(
  member: WorkspaceMemberOption,
  currentUserId?: string | null,
): string {
  if (currentUserId && member.userId === currentUserId) {
    return "Solo io";
  }

  return member.label;
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
