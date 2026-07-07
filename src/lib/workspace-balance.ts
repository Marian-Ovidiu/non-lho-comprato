import { round2 } from "@/src/lib/money-number";
import {
  sortWorkspaceMembers,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";

export type WorkspaceBalanceEntry = {
  realCost: number;
  paidByUserId: string | null;
  beneficiaryUserIds: string[];
  paymentMode?: "single_payer" | "joint_account" | string | null;
};

export type WorkspaceBalanceSettlement = {
  amount: number;
  fromUserId: string;
  toUserId: string;
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
  settlements: readonly WorkspaceBalanceSettlement[] = [],
): WorkspaceBalanceCardState {
  const normalizedMembers = sortWorkspaceMembers(members);

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

    if (entry.paymentMode !== "joint_account" && !memberIds.has(payerUserId)) {
      continue;
    }

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

    paidTotals.set(payerUserId, (paidTotals.get(payerUserId) ?? 0) + entry.realCost);
  }

  let settlementNet = 0;
  for (const settlement of settlements) {
    const fromUserId = settlement.fromUserId.trim();
    const toUserId = settlement.toUserId.trim();

    if (!memberIds.has(fromUserId) || !memberIds.has(toUserId) || fromUserId === toUserId) {
      continue;
    }

    if (fromUserId === currentUserId) {
      settlementNet += settlement.amount;
    } else if (toUserId === currentUserId) {
      settlementNet -= settlement.amount;
    }
  }

  const roundedCurrentNet = round2(
    (paidTotals.get(currentUserId) ?? 0) -
      (owedTotals.get(currentUserId) ?? 0) +
      settlementNet,
  );
  if (Math.abs(roundedCurrentNet) < 0.005) {
    return {
      supported: true,
      status: "balanced",
      amount: 0,
      counterpartUserId: counterpartMember.userId,
      counterpartLabel: counterpartMember.label,
    };
  }

  if (roundedCurrentNet > 0) {
    return {
      supported: true,
      status: "they-owe",
      amount: round2(roundedCurrentNet),
      counterpartUserId: counterpartMember.userId,
      counterpartLabel: counterpartMember.label,
    };
  }

  return {
    supported: true,
    status: "you-owe",
    amount: round2(Math.abs(roundedCurrentNet)),
    counterpartUserId: counterpartMember.userId,
    counterpartLabel: counterpartMember.label,
  };
}
