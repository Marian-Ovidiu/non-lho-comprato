export type MemberSpendingEntry = {
  realCost: number;
  paidByUserId: string | null;
  beneficiaryUserIds: string[];
  paymentMode?: "single_payer" | "joint_account" | string | null;
};

export type MemberSpendingTotals = {
  userId: string;
  totalPaidByUser: number;
  personalSpending: number;
  sharedSpending: number;
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeBeneficiaryUserIds(
  beneficiaryUserIds: readonly string[],
): string[] {
  return Array.from(
    new Set(
      beneficiaryUserIds
        .filter((userId): userId is string => typeof userId === "string")
        .map((userId) => userId.trim())
        .filter(Boolean),
    ),
  );
}

export function createEmptyMemberSpendingTotals(
  userId: string,
): MemberSpendingTotals {
  return {
    userId,
    totalPaidByUser: 0,
    personalSpending: 0,
    sharedSpending: 0,
  };
}

/** Applies workspace-member spending rules for a single entry. */
export function applyMemberSpendingEntry(
  totalsByUserId: Map<string, MemberSpendingTotals>,
  entry: MemberSpendingEntry,
): void {
  const realCost = entry.realCost;
  const beneficiaryUserIds = normalizeBeneficiaryUserIds(entry.beneficiaryUserIds);
  const payerUserId = entry.paidByUserId?.trim() ?? "";

  if (entry.paymentMode === "joint_account" && beneficiaryUserIds.length > 1) {
    const share = round2(realCost / beneficiaryUserIds.length);

    for (const beneficiaryUserId of beneficiaryUserIds) {
      const totals = totalsByUserId.get(beneficiaryUserId);

      if (totals) {
        totals.totalPaidByUser = round2(totals.totalPaidByUser + share);
        totals.sharedSpending = round2(totals.sharedSpending + share);
      }
    }

    return;
  }

  if (payerUserId) {
    const payerTotals = totalsByUserId.get(payerUserId);

    if (payerTotals) {
      payerTotals.totalPaidByUser = round2(
        payerTotals.totalPaidByUser + realCost,
      );

      if (beneficiaryUserIds.length > 1) {
        payerTotals.sharedSpending = round2(
          payerTotals.sharedSpending + realCost,
        );
      }
    }
  }

  if (beneficiaryUserIds.length === 1) {
    const personalUserId = beneficiaryUserIds[0];
    const personalTotals = totalsByUserId.get(personalUserId);

    if (personalTotals) {
      personalTotals.personalSpending = round2(
        personalTotals.personalSpending + realCost,
      );
    }
  }
}

export function aggregateMemberSpendingStats(
  memberUserIds: readonly string[],
  entries: readonly MemberSpendingEntry[],
): Map<string, MemberSpendingTotals> {
  const totalsByUserId = new Map(
    memberUserIds.map((userId) => [
      userId,
      createEmptyMemberSpendingTotals(userId),
    ]),
  );

  for (const entry of entries) {
    applyMemberSpendingEntry(totalsByUserId, entry);
  }

  return totalsByUserId;
}
