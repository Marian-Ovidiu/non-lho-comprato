import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import {
  adoptProductionWorkspaceForUser,
  getLegacyWorkspaceId,
  getProductionWorkspaceDisplayName,
} from "../src/lib/auth/provisioning";

async function main() {
  const productionWorkspaceId = getLegacyWorkspaceId();
  const displayName = getProductionWorkspaceDisplayName();

  const before = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      kind: true,
      ownerUserId: true,
      _count: {
        select: {
          entries: true,
          members: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const membersBefore = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: productionWorkspaceId,
    },
    select: {
      userId: true,
      role: true,
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log("Workspaces before adoption:");
  console.log(JSON.stringify(before, null, 2));
  console.log("Production workspace members before:");
  console.log(JSON.stringify(membersBefore, null, 2));

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let membershipsAdded = 0;

  for (const user of users) {
    const existingMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: productionWorkspaceId,
          userId: user.id,
        },
      },
    });

    if (!existingMembership) {
      membershipsAdded += 1;
    }

    await adoptProductionWorkspaceForUser(user.id);
  }

  const after = await prisma.workspace.findUnique({
    where: {
      id: productionWorkspaceId,
    },
    select: {
      id: true,
      name: true,
      kind: true,
      ownerUserId: true,
      _count: {
        select: {
          entries: true,
          members: true,
        },
      },
    },
  });

  const membersAfter = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: productionWorkspaceId,
    },
    select: {
      userId: true,
      role: true,
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const totalEntries = await prisma.entry.count();

  console.log("Adoption applied:", {
    displayName,
    membershipsAdded,
    totalEntries,
  });
  console.log("Production workspace after:");
  console.log(JSON.stringify(after, null, 2));
  console.log("Production workspace members after:");
  console.log(JSON.stringify(membersAfter, null, 2));
}

main()
  .catch((error) => {
    console.error("Production workspace adoption failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
