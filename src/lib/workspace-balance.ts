import {
  getWorkspaceMemberSlots,
  isSecondaryMemberUserId,
} from "@/src/lib/member-slots";
import {
  dedupeWorkspaceMemberOptions,
  sortWorkspaceMembers,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";

export type WorkspaceBalance = {
  marianPaid: number;
  martinaPaid: number;
  /** marianPaid - martinaPaid; positive means the primary member paid more. */
  difference: number;
};

export type BalanceEntry = {
  realCost: number;
  paidByUserId: string | null;
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeWorkspaceBalance(
  members: WorkspaceMemberOption[],
  entries: readonly BalanceEntry[],
): WorkspaceBalance {
  const slots = getWorkspaceMemberSlots(members);
  let marianPaid = 0;
  let martinaPaid = 0;

  for (const entry of entries) {
    const payerUserId = entry.paidByUserId?.trim();

    if (!payerUserId) {
      continue;
    }

    if (isSecondaryMemberUserId(payerUserId, slots)) {
      martinaPaid = round2(martinaPaid + entry.realCost);
      continue;
    }

    marianPaid = round2(marianPaid + entry.realCost);
  }

  return {
    marianPaid,
    martinaPaid,
    difference: round2(marianPaid - martinaPaid),
  };
}

export function computeWorkspaceBalanceFromPaidByUser(
  members: WorkspaceMemberOption[],
  paidByUserId: ReadonlyMap<string, number> | Map<string, number>,
): WorkspaceBalance {
  const slots = getWorkspaceMemberSlots(members);
  let marianPaid = 0;
  let martinaPaid = 0;

  for (const [userId, amount] of paidByUserId) {
    if (amount <= 0) {
      continue;
    }

    if (isSecondaryMemberUserId(userId, slots)) {
      martinaPaid = round2(martinaPaid + amount);
      continue;
    }

    marianPaid = round2(marianPaid + amount);
  }

  return {
    marianPaid,
    martinaPaid,
    difference: round2(marianPaid - martinaPaid),
  };
}

export type WorkspaceBalanceEntry = {
  realCost: number;
  paidByUserId: string | null;
  beneficiaryUserIds: string[];
};

export type WorkspaceBalanceStatus =
  | "unsupported"
  | "balanced"
  | "you-owe"
  | "they-owe";

export type WorkspaceBalanceCardState = {
  supported: boolean;
  status: WorkspaceBalanceStatus;
  amount: number;
  counterpartUserId: string | null;
  counterpartLabel: string | null;
};

function normalizeUserIds(userIds: readonly string[]): string[] {
  return Array.from(
    new Set(
      userIds
        .filter((userId): userId is string => typeof userId === "string")
        .map((userId) => userId.trim())
        .filter(Boolean),
    ),
  );
}

export function computeCoupleWorkspaceBalance(
  members: WorkspaceMemberOption[],
  currentUserId: string,
  entries: readonly WorkspaceBalanceEntry[],
): WorkspaceBalanceCardState {
  const normalizedMembers = sortWorkspaceMembers(dedupeWorkspaceMemberOptions(members));

  if (normalizedMembers.length !== 2) {
    return {
      supported: false,
      status: "unsupported",
      amount: 0,
      counterpartUserId: null,
      counterpartLabel: null,
    };
  }

  const memberIds = new Set(normalizedMembers.map((member) => member.userId));
  if (!memberIds.has(currentUserId)) {
    return {
      supported: false,
      status: "unsupported",
      amount: 0,
      counterpartUserId: null,
      counterpartLabel: null,
    };
  }

  const currentMember = normalizedMembers.find(
    (member) => member.userId === currentUserId,
  );
  const counterpartMember = normalizedMembers.find(
    (member) => member.userId !== currentUserId,
  );

  if (!currentMember || !counterpartMember) {
    return {
      supported: false,
      status: "unsupported",
      amount: 0,
      counterpartUserId: null,
      counterpartLabel: null,
    };
  }

  const paidTotals = new Map<string, number>(
    normalizedMembers.map((member) => [member.userId, 0]),
  );
  const owedTotals = new Map<string, number>(
    normalizedMembers.map((member) => [member.userId, 0]),
  );

  for (const entry of entries) {
    const beneficiaryUserIds = normalizeUserIds(entry.beneficiaryUserIds).filter(
      (userId) => memberIds.has(userId),
    );

    if (beneficiaryUserIds.length <= 1) {
      continue;
    }

    const payerUserId = entry.paidByUserId?.trim() ?? "";
    const share = entry.realCost / beneficiaryUserIds.length;

    for (const beneficiaryUserId of beneficiaryUserIds) {
      owedTotals.set(
        beneficiaryUserId,
        (owedTotals.get(beneficiaryUserId) ?? 0) + share,
      );
    }

    if (memberIds.has(payerUserId)) {
      paidTotals.set(payerUserId, (paidTotals.get(payerUserId) ?? 0) + entry.realCost);
    }
  }

  const currentNet = round2(
    (paidTotals.get(currentUserId) ?? 0) - (owedTotals.get(currentUserId) ?? 0),
  );
  if (Math.abs(currentNet) < 0.005) {
    return {
      supported: true,
      status: "balanced",
      amount: 0,
      counterpartUserId: counterpartMember.userId,
      counterpartLabel: counterpartMember.label,
    };
  }

  if (currentNet > 0) {
    return {
      supported: true,
      status: "they-owe",
      amount: round2(currentNet),
      counterpartUserId: counterpartMember.userId,
      counterpartLabel: counterpartMember.label,
    };
  }

  return {
    supported: true,
    status: "you-owe",
    amount: round2(Math.abs(currentNet)),
    counterpartUserId: counterpartMember.userId,
    counterpartLabel: counterpartMember.label,
  };
}
