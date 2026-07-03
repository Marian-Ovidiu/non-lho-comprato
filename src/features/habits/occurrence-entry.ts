import { calculateEntryMoney } from "@/src/lib/entry-domain";
import { EntryVisibility } from "@/src/lib/generated/prisma/enums";
import {
  getHabitTargetUserIds,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";

export type OccurrenceEntryStatus = "spent" | "avoided" | "skipped";

export type OccurrenceWithHabit = {
  id: string;
  date: Date;
  habit: {
    name: string;
    categoryId: string;
    amount: unknown;
    targetScope: string;
    targetUserId: string | null;
  };
};

export type OccurrenceEntryContext = {
  workspaceId: string;
  currentUserId: string;
  members: WorkspaceMemberOption[];
};

function toDecimalString(value: number): string {
  return value.toFixed(2);
}

/**
 * Builds the Entry payload for a habit occurrence marked spent/avoided/skipped.
 * A "spent" occurrence records the habit amount; "avoided" records it as the
 * amount that would have been spent; "skipped" records a zero-cost entry. The
 * beneficiaries follow the habit's target scope, defaulting to the current
 * user. The shape is identical across statuses because the money differences
 * are already captured by calculateEntryMoney.
 */
export function buildEntryDataForOccurrence(
  occurrence: OccurrenceWithHabit,
  status: OccurrenceEntryStatus,
  context: OccurrenceEntryContext,
) {
  const amount = Number(occurrence.habit.amount);
  const money =
    status === "spent"
      ? calculateEntryMoney({
          mode: "spent",
          savingContext: "none",
          amountSpent: amount,
        })
      : status === "avoided"
        ? calculateEntryMoney({
            mode: "avoided",
            comparisonAmount: amount,
          })
        : calculateEntryMoney({
            mode: "spent",
            savingContext: "none",
            amountSpent: 0,
          });

  const resolvedBeneficiaries = getHabitTargetUserIds({
    targetScope: occurrence.habit.targetScope,
    targetUserId: occurrence.habit.targetUserId,
    members: context.members,
    currentUserId: context.currentUserId,
  });
  const beneficiaryUserIds =
    resolvedBeneficiaries.length > 0
      ? resolvedBeneficiaries
      : [context.currentUserId];

  return {
    workspaceId: context.workspaceId,
    createdByUserId: context.currentUserId,
    paidByUserId: context.currentUserId,
    beneficiaries: {
      create: beneficiaryUserIds.map((userId) => ({ userId })),
    },
    visibility: EntryVisibility.workspace,
    title: occurrence.habit.name,
    categoryId: occurrence.habit.categoryId,
    realCost: toDecimalString(money.realCost),
    alternativeCost: toDecimalString(money.alternativeCost),
    savedAmount: toDecimalString(money.savedAmount),
    mode: money.mode,
    savingContext: money.savingContext,
    date: occurrence.date,
    note: null,
    source: "habit" as const,
    habitOccurrenceId: occurrence.id,
  };
}
