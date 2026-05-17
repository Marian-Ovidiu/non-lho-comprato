import "dotenv/config";

import { Prisma } from "@/src/lib/generated/prisma/client";
import { getLegacyWorkspaceId } from "../src/lib/auth/provisioning";
import { prisma } from "../src/lib/prisma";

const LEGACY_MARIAN_USER_ID = "legacy-marian";
const LEGACY_MARTINA_USER_ID = "legacy-martina";

type MergeStats = {
  workspaceOwnerUpdated: number;
  entryPaidByUpdated: number;
  entryCreatedByUpdated: number;
  entryBeneficiaryUpdated: number;
  entryBeneficiaryDuplicatesRemoved: number;
  workspaceInvitesCreatedByUpdated: number;
  workspaceInvitesAcceptedByUpdated: number;
  workspaceMemberUpserted: boolean;
  workspaceMemberLegacyRemoved: number;
  legacyUserDeleted: boolean;
};

function isSupabaseAuthUserId(userId: string) {
  return userId !== LEGACY_MARIAN_USER_ID && userId !== LEGACY_MARTINA_USER_ID;
}

async function countReferences(userId: string) {
  const [
    paidEntries,
    createdEntries,
    beneficiaries,
    ownedWorkspaces,
    memberships,
    invitesCreated,
    invitesAccepted,
  ] = await Promise.all([
    prisma.entry.count({ where: { paidByUserId: userId } }),
    prisma.entry.count({ where: { createdByUserId: userId } }),
    prisma.entryBeneficiary.count({ where: { userId } }),
    prisma.workspace.count({ where: { ownerUserId: userId } }),
    prisma.workspaceMember.count({ where: { userId } }),
    prisma.workspaceInvite.count({ where: { createdByUserId: userId } }),
    prisma.workspaceInvite.count({ where: { acceptedByUserId: userId } }),
  ]);

  return {
    paidEntries,
    createdEntries,
    beneficiaries,
    ownedWorkspaces,
    memberships,
    invitesCreated,
    invitesAccepted,
  };
}

async function getProductionMembers(workspaceId: string) {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function main() {
  const workspaceId = getLegacyWorkspaceId();
  const membersBefore = await getProductionMembers(workspaceId);
  const totalEntriesBefore = await prisma.entry.count();
  const beneficiaryRowsBefore = await prisma.entryBeneficiary.count();
  const statsBefore = await prisma.entry.aggregate({
    where: { workspaceId },
    _sum: {
      realCost: true,
      alternativeCost: true,
      savedAmount: true,
    },
    _count: true,
  });

  console.log("Members before merge:");
  console.log(
    JSON.stringify(
      membersBefore.map((member) => ({
        userId: member.userId,
        role: member.role,
        email: member.user.email,
        name: member.user.name,
      })),
      null,
      2,
    ),
  );

  const legacyMember = membersBefore.find(
    (member) => member.userId === LEGACY_MARIAN_USER_ID,
  );
  const martinaMember = membersBefore.find(
    (member) => member.userId === LEGACY_MARTINA_USER_ID,
  );
  const canonicalMember = membersBefore.find((member) =>
    isSupabaseAuthUserId(member.userId),
  );

  if (!martinaMember) {
    throw new Error("Martina workspace member not found; aborting.");
  }

  if (!legacyMember && membersBefore.length === 2 && canonicalMember) {
    console.log("Merge already applied: legacy Marian member is absent.");
    await printValidation({
      workspaceId,
      canonicalUserId: canonicalMember.userId,
      totalEntriesBefore,
      beneficiaryRowsBefore,
      statsBefore,
    });
    return;
  }

  if (!legacyMember || !canonicalMember) {
    throw new Error(
      "Expected legacy-marian and one Supabase Marian user in production workspace.",
    );
  }

  const legacyUserId = legacyMember.userId;
  const canonicalUserId = canonicalMember.userId;

  console.log("Duplicate users found:", {
    legacyMarian: {
      userId: legacyUserId,
      email: legacyMember.user.email,
      name: legacyMember.user.name,
      references: await countReferences(legacyUserId),
    },
    canonicalMarian: {
      userId: canonicalUserId,
      email: canonicalMember.user.email,
      name: canonicalMember.user.name,
      references: await countReferences(canonicalUserId),
    },
    martina: {
      userId: martinaMember.userId,
      email: martinaMember.user.email,
      name: martinaMember.user.name,
    },
  });

  console.log("Chosen canonical Marian user:", canonicalUserId);

  const stats: MergeStats = {
    workspaceOwnerUpdated: 0,
    entryPaidByUpdated: 0,
    entryCreatedByUpdated: 0,
    entryBeneficiaryUpdated: 0,
    entryBeneficiaryDuplicatesRemoved: 0,
    workspaceInvitesCreatedByUpdated: 0,
    workspaceInvitesAcceptedByUpdated: 0,
    workspaceMemberUpserted: false,
    workspaceMemberLegacyRemoved: 0,
    legacyUserDeleted: false,
  };

  await prisma.$transaction(async (tx) => {
    const ownerUpdate = await tx.workspace.updateMany({
      where: { ownerUserId: legacyUserId },
      data: { ownerUserId: canonicalUserId },
    });
    stats.workspaceOwnerUpdated = ownerUpdate.count;

    const paidByUpdate = await tx.entry.updateMany({
      where: { paidByUserId: legacyUserId },
      data: { paidByUserId: canonicalUserId },
    });
    stats.entryPaidByUpdated = paidByUpdate.count;

    const createdByUpdate = await tx.entry.updateMany({
      where: { createdByUserId: legacyUserId },
      data: { createdByUserId: canonicalUserId },
    });
    stats.entryCreatedByUpdated = createdByUpdate.count;

    const legacyBeneficiaries = await tx.entryBeneficiary.findMany({
      where: { userId: legacyUserId },
      select: { id: true, entryId: true },
    });

    for (const beneficiary of legacyBeneficiaries) {
      const duplicate = await tx.entryBeneficiary.findUnique({
        where: {
          entryId_userId: {
            entryId: beneficiary.entryId,
            userId: canonicalUserId,
          },
        },
        select: { id: true },
      });

      if (duplicate) {
        await tx.entryBeneficiary.delete({
          where: { id: beneficiary.id },
        });
        stats.entryBeneficiaryDuplicatesRemoved += 1;
        continue;
      }

      await tx.entryBeneficiary.update({
        where: { id: beneficiary.id },
        data: { userId: canonicalUserId },
      });
      stats.entryBeneficiaryUpdated += 1;
    }

    const invitesCreatedUpdate = await tx.workspaceInvite.updateMany({
      where: { createdByUserId: legacyUserId },
      data: { createdByUserId: canonicalUserId },
    });
    stats.workspaceInvitesCreatedByUpdated = invitesCreatedUpdate.count;

    const invitesAcceptedUpdate = await tx.workspaceInvite.updateMany({
      where: { acceptedByUserId: legacyUserId },
      data: { acceptedByUserId: canonicalUserId },
    });
    stats.workspaceInvitesAcceptedByUpdated = invitesAcceptedUpdate.count;

    await tx.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: canonicalUserId,
        },
      },
      update: {
        role: "owner",
      },
      create: {
        workspaceId,
        userId: canonicalUserId,
        role: "owner",
      },
    });
    stats.workspaceMemberUpserted = true;

    const removedMembership = await tx.workspaceMember.deleteMany({
      where: {
        userId: legacyUserId,
      },
    });
    stats.workspaceMemberLegacyRemoved = removedMembership.count;

    const canonicalName =
      canonicalMember.user.name?.trim() ||
      legacyMember.user.name?.trim() ||
      canonicalMember.user.name;
    const canonicalImage =
      canonicalMember.user.image ?? legacyMember.user.image ?? null;

    await tx.user.update({
      where: { id: canonicalUserId },
      data: {
        name: canonicalName,
        image: canonicalImage,
      },
    });

    const remainingReferences = await Promise.all([
      tx.entry.count({ where: { paidByUserId: legacyUserId } }),
      tx.entry.count({ where: { createdByUserId: legacyUserId } }),
      tx.entryBeneficiary.count({ where: { userId: legacyUserId } }),
      tx.workspace.count({ where: { ownerUserId: legacyUserId } }),
      tx.workspaceMember.count({ where: { userId: legacyUserId } }),
      tx.workspaceInvite.count({ where: { createdByUserId: legacyUserId } }),
      tx.workspaceInvite.count({ where: { acceptedByUserId: legacyUserId } }),
    ]);

    if (remainingReferences.some((count) => count > 0)) {
      throw new Error(
        `Legacy Marian still has references: ${remainingReferences.join(", ")}`,
      );
    }

    try {
      await tx.user.delete({
        where: { id: legacyUserId },
      });
      stats.legacyUserDeleted = true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        stats.legacyUserDeleted = false;
      } else {
        throw error;
      }
    }
  });

  console.log("Rows reassigned / removed:", stats);

  await printValidation({
    workspaceId,
    canonicalUserId,
    totalEntriesBefore,
    beneficiaryRowsBefore,
    statsBefore,
  });
}

async function printValidation({
  workspaceId,
  canonicalUserId,
  totalEntriesBefore,
  beneficiaryRowsBefore,
  statsBefore,
}: {
  workspaceId: string;
  canonicalUserId: string;
  totalEntriesBefore: number;
  beneficiaryRowsBefore: number;
  statsBefore: {
    _sum: {
      realCost: Prisma.Decimal | null;
      alternativeCost: Prisma.Decimal | null;
      savedAmount: Prisma.Decimal | null;
    };
    _count: number;
  };
}) {
  const membersAfter = await getProductionMembers(workspaceId);
  const totalEntriesAfter = await prisma.entry.count();
  const beneficiaryRowsAfter = await prisma.entryBeneficiary.count();
  const statsAfter = await prisma.entry.aggregate({
    where: { workspaceId },
    _sum: {
      realCost: true,
      alternativeCost: true,
      savedAmount: true,
    },
    _count: true,
  });

  const legacyUser = await prisma.user.findUnique({
    where: { id: LEGACY_MARIAN_USER_ID },
    select: { id: true },
  });

  console.log("Members after merge:");
  console.log(
    JSON.stringify(
      membersAfter.map((member) => ({
        userId: member.userId,
        role: member.role,
        email: member.user.email,
        name: member.user.name,
      })),
      null,
      2,
    ),
  );

  console.log(
    "Validation:",
    JSON.stringify(
      {
        memberCount: membersAfter.length,
        expectedMemberCount: 2,
        legacyUserStillExists: Boolean(legacyUser),
        totalEntriesBefore,
        totalEntriesAfter,
        beneficiaryRowsBefore,
        beneficiaryRowsAfter,
        statsEntriesBefore: statsBefore._count,
        statsEntriesAfter: statsAfter._count,
        statsSavedBefore: statsBefore._sum.savedAmount?.toString(),
        statsSavedAfter: statsAfter._sum.savedAmount?.toString(),
        statsRealBefore: statsBefore._sum.realCost?.toString(),
        statsRealAfter: statsAfter._sum.realCost?.toString(),
        statsAlternativeBefore: statsBefore._sum.alternativeCost?.toString(),
        statsAlternativeAfter: statsAfter._sum.alternativeCost?.toString(),
        canonicalUserId,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Merge duplicate Marian user failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
