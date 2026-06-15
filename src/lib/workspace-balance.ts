import {
  dedupeWorkspaceMemberOptions,
  sortWorkspaceMembers,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type WorkspaceBalanceEntry = {
  realCost: number;
  paidByUserId: string | null;
  beneficiaryUserIds: string[];
  paymentMode?: "single_payer" | "joint_account" | string | null;
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

    if (entry.paymentMode === "joint_account") {
      for (const beneficiaryUserId of beneficiaryUserIds) {
        paidTotals.set(
          beneficiaryUserId,
          (paidTotals.get(beneficiaryUserId) ?? 0) + share,
        );
      }
      continue;
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
