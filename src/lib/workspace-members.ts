import type { Person } from "@/src/lib/generated/prisma/enums";
import {
  getBeneficiariesFromLegacyPerson,
  type EntryParticipantValue,
  type LegacyPersonValue,
} from "@/src/lib/ui-person";

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

function getSortedMemberUserIds(members: WorkspaceMemberOption[]): string[] {
  return sortWorkspaceMembers(members).map((member) => member.userId);
}

export function getDefaultPaidByUserId(
  members: WorkspaceMemberOption[],
  currentUserId?: string | null,
): string {
  if (currentUserId && members.some((member) => member.userId === currentUserId)) {
    return currentUserId;
  }

  return getSortedMemberUserIds(members)[0] ?? currentUserId ?? "";
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

export function mapUserIdToEntryParticipant(
  userId: string,
  members: WorkspaceMemberOption[],
): EntryParticipantValue {
  if (userId === LEGACY_MARTINA_USER_ID) {
    return "MARTINA";
  }

  const sortedIds = getSortedMemberUserIds(members);
  const index = sortedIds.indexOf(userId);

  if (index === 1) {
    return "MARTINA";
  }

  return "MARIAN";
}

export function mapEntryParticipantToUserId(
  participant: EntryParticipantValue,
  members: WorkspaceMemberOption[],
): string | null {
  const sortedMembers = sortWorkspaceMembers(members);

  if (participant === "MARTINA") {
    return (
      sortedMembers.find((member) => member.userId === LEGACY_MARTINA_USER_ID)
        ?.userId ??
      sortedMembers[1]?.userId ??
      null
    );
  }

  return (
    sortedMembers.find((member) => member.userId === LEGACY_MARIAN_USER_ID)
      ?.userId ??
    sortedMembers.find((member) => member.userId !== LEGACY_MARTINA_USER_ID)
      ?.userId ??
    sortedMembers[0]?.userId ??
    null
  );
}

export function mapUserIdsToLegacyPersonFields(
  paidByUserId: string,
  beneficiaryUserIds: string[],
  members: WorkspaceMemberOption[],
): {
  person: LegacyPersonValue;
  paidBy: EntryParticipantValue;
  beneficiaries: EntryParticipantValue[];
} {
  const paidBy = mapUserIdToEntryParticipant(paidByUserId, members);
  const beneficiaries = Array.from(
    new Set(
      beneficiaryUserIds.map((userId) =>
        mapUserIdToEntryParticipant(userId, members),
      ),
    ),
  );

  const sortedMembers = sortWorkspaceMembers(members);
  const allParticipants = sortedMembers.map((member) =>
    mapUserIdToEntryParticipant(member.userId, members),
  );
  const includesAllMembers =
    allParticipants.length > 0 &&
    allParticipants.every((participant) => beneficiaries.includes(participant));

  let person: LegacyPersonValue;

  if (beneficiaries.length >= 2 || includesAllMembers) {
    person = "TUTTI";
  } else if (beneficiaries[0] === "MARTINA") {
    person = "MARTINA";
  } else {
    person = "MARIAN";
  }

  return {
    person,
    paidBy,
    beneficiaries:
      beneficiaries.length > 0
        ? beneficiaries
        : [mapUserIdToEntryParticipant(paidByUserId, members)],
  };
}

export function resolveEntryPeopleFromRecord(
  entry: {
    paidByUserId: string | null;
    paidBy: Person;
    beneficiaries: { userId: string }[];
    person: Person;
  },
  members: WorkspaceMemberOption[],
): {
  paidByUserId: string;
  beneficiaryUserIds: string[];
} {
  const paidByUserId =
    entry.paidByUserId ??
    mapEntryParticipantToUserId(
      entry.paidBy as EntryParticipantValue,
      members,
    ) ??
    getDefaultPaidByUserId(members);

  let beneficiaryUserIds = Array.from(
    new Set(
      (entry.beneficiaries ?? []).map((beneficiary) => beneficiary.userId),
    ),
  );

  if (beneficiaryUserIds.length === 0) {
    beneficiaryUserIds = getBeneficiariesFromLegacyPerson(entry.person)
      .map((participant) => mapEntryParticipantToUserId(participant, members))
      .filter((userId): userId is string => Boolean(userId));
  }

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
