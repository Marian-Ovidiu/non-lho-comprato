import {
  getWorkspaceMemberSlots,
  isSecondaryMemberUserId,
} from "@/src/lib/member-slots";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

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
