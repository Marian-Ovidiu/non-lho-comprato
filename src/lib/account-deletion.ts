import { Prisma } from "@/src/lib/generated/prisma/client";

type WorkspaceForDeletion = {
  id: string;
  kind: "private" | "shared";
  ownerUserId: string;
  members: Array<{
    userId: string;
    role: "owner" | "member";
    createdAt: Date;
  }>;
};

export type AccountDeletionPlan = {
  workspaceIdsToDelete: string[];
  retainedWorkspaceIds: string[];
  ownershipTransfers: Array<{
    workspaceId: string;
    newOwnerUserId: string;
  }>;
};

export function buildAccountDeletionPlan(
  userId: string,
  workspaces: WorkspaceForDeletion[],
): AccountDeletionPlan {
  const workspaceIdsToDelete: string[] = [];
  const retainedWorkspaceIds: string[] = [];
  const ownershipTransfers: AccountDeletionPlan["ownershipTransfers"] = [];

  for (const workspace of workspaces) {
    const otherMembers = workspace.members
      .filter((member) => member.userId !== userId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

    if (otherMembers.length === 0) {
      workspaceIdsToDelete.push(workspace.id);
      continue;
    }

    retainedWorkspaceIds.push(workspace.id);

    if (workspace.ownerUserId === userId) {
      const replacement =
        otherMembers.find((member) => member.role === "owner") ?? otherMembers[0];

      if (replacement) {
        ownershipTransfers.push({
          workspaceId: workspace.id,
          newOwnerUserId: replacement.userId,
        });
      }
    }
  }

  return {
    workspaceIdsToDelete,
    retainedWorkspaceIds,
    ownershipTransfers,
  };
}

type AccountDeletionTx = Prisma.TransactionClient;

export async function deleteAppAccountData(
  tx: AccountDeletionTx,
  userId: string,
): Promise<AccountDeletionPlan> {
  const memberships = await tx.workspaceMember.findMany({
    where: { userId },
    select: {
      workspace: {
        select: {
          id: true,
          kind: true,
          ownerUserId: true,
          members: {
            select: {
              userId: true,
              role: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  const plan = buildAccountDeletionPlan(
    userId,
    memberships.map((membership) => membership.workspace),
  );

  for (const transfer of plan.ownershipTransfers) {
    await tx.workspace.update({
      where: { id: transfer.workspaceId },
      data: { ownerUserId: transfer.newOwnerUserId },
    });

    await tx.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId: transfer.workspaceId,
          userId: transfer.newOwnerUserId,
        },
      },
      data: { role: "owner" },
    });
  }

  if (plan.workspaceIdsToDelete.length > 0) {
    const workspaceWhere = { workspaceId: { in: plan.workspaceIdsToDelete } };

    await tx.entryBeneficiary.deleteMany({
      where: { entry: workspaceWhere },
    });
    await tx.entry.deleteMany({ where: workspaceWhere });
    await tx.quickPreset.deleteMany({ where: workspaceWhere });
    await tx.goal.deleteMany({ where: workspaceWhere });
    await tx.habit.deleteMany({ where: workspaceWhere });
    await tx.category.deleteMany({ where: workspaceWhere });
    await tx.workspaceInvite.deleteMany({ where: workspaceWhere });
    await tx.workspaceMember.deleteMany({ where: workspaceWhere });
    await tx.workspace.deleteMany({
      where: { id: { in: plan.workspaceIdsToDelete } },
    });
  }

  await tx.entryBeneficiary.deleteMany({ where: { userId } });

  // Shared workspace records are retained for remaining members, but direct user
  // references are removed so the deleted account is no longer identifiable.
  await tx.entry.updateMany({
    where: { createdByUserId: userId },
    data: { createdByUserId: null },
  });
  await tx.entry.updateMany({
    where: { paidByUserId: userId },
    data: { paidByUserId: null },
  });
  await tx.habit.updateMany({
    where: { targetUserId: userId },
    data: { targetUserId: null },
  });
  await tx.feedback.updateMany({
    where: { userId },
    data: { userId: null },
  });
  await tx.workspaceInvite.updateMany({
    where: { createdByUserId: userId },
    data: { createdByUserId: null },
  });
  await tx.workspaceInvite.updateMany({
    where: { acceptedByUserId: userId },
    data: { acceptedByUserId: null },
  });

  await tx.workspaceMember.deleteMany({ where: { userId } });
  await tx.user.delete({ where: { id: userId } });

  return plan;
}
