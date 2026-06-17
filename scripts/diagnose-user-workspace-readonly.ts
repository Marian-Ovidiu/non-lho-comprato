import { config } from "dotenv";

config({ path: ".env.production" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const {
    adoptProductionWorkspaceForUser,
    resolveActiveWorkspaceForUser,
  } = await import("../src/lib/auth/provisioning");

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  for (const user of users) {
    await adoptProductionWorkspaceForUser(user.id);

    const accessibleWorkspaces = (await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerUserId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      select: {
        id: true,
        name: true,
        kind: true,
        ownerUserId: true,
        timezone: true,
        currency: true,
        language: true,
      },
    })).map((workspace) => ({
      ...workspace,
      lastSelectedAt: null,
    }));

    const scenarios = [
      { label: "no-cookie", selectedWorkspaceId: null as string | null },
      {
        label: "cookie-private",
        selectedWorkspaceId: `private-${user.id}`,
      },
      {
        label: "cookie-legacy",
        selectedWorkspaceId: "legacy-marian-martina",
      },
    ];

    const results = [];

    for (const scenario of scenarios) {
      const { workspace, resolutionPath } = await resolveActiveWorkspaceForUser({
        userId: user.id,
        email: user.email,
        selectedWorkspaceId: scenario.selectedWorkspaceId,
        accessibleWorkspaces,
      });

      const entryCount = await prisma.entry.count({
        where: { workspaceId: workspace.id },
      });

      results.push({
        scenario: scenario.label,
        resolutionPath,
        resolvedWorkspaceId: workspace.id,
        entryCount,
      });
    }

    console.log(
      JSON.stringify(
        {
          userId: user.id,
          email: user.email,
          accessibleWorkspaceIds: accessibleWorkspaces.map((w) => w.id),
          results,
        },
        null,
        2,
      ),
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
