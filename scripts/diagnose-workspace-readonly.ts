import "dotenv/config";
import { config } from "dotenv";

config({ path: ".env.production" });

import { prisma } from "../src/lib/prisma";

const LEGACY_ID =
  process.env.LEGACY_WORKSPACE_ID?.trim() || "legacy-marian-martina";

async function main() {
  const [workspaces, entryByWorkspace, nullWorkspaceEntries, totalEntries] =
    await Promise.all([
      prisma.workspace.findMany({
        select: {
          id: true,
          name: true,
          kind: true,
          _count: { select: { entries: true, members: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.entry.groupBy({
        by: ["workspaceId"],
        _count: { _all: true },
      }),
      Promise.resolve(0), // workspaceId is non-nullable; orphans are impossible
      prisma.entry.count(),
    ]);

  console.log(
    JSON.stringify(
      {
        legacyWorkspaceIdEnv: process.env.LEGACY_WORKSPACE_ID?.trim() || "(default)",
        legacyWorkspaceIdUsed: LEGACY_ID,
        databaseHost: process.env.DATABASE_URL
          ? new URL(process.env.DATABASE_URL).host
          : "missing",
        totalEntries,
        nullWorkspaceEntries,
        workspaces,
        entryCountsByWorkspaceId: entryByWorkspace,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
