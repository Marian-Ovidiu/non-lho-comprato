import "dotenv/config";

import { prisma } from "../src/lib/prisma";

const LEGACY_WORKSPACE_ID = "legacy-marian-martina";

async function main() {
  const [
    totalEntries,
    nullWorkspaceEntries,
    legacyWorkspaceEntries,
    beneficiaryRows,
    entriesWithoutBeneficiaries,
    statsOverview,
  ] = await Promise.all([
    prisma.entry.count(),
    Promise.resolve(0), // workspaceId is non-nullable; orphans are impossible
    prisma.entry.count({ where: { workspaceId: LEGACY_WORKSPACE_ID } }),
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM "EntryBeneficiary"
    `.then((rows) => rows[0]?.count ?? 0),
    prisma.entry.count({
      where: {
        beneficiaries: {
          none: {},
        },
      },
    }),
    prisma.entry.aggregate({
      where: { workspaceId: LEGACY_WORKSPACE_ID },
      _sum: {
        savedAmount: true,
        realCost: true,
        alternativeCost: true,
      },
      _count: true,
    }),
  ]);

  const listSample = await prisma.entry.findMany({
    where: { workspaceId: LEGACY_WORKSPACE_ID },
    take: 3,
    orderBy: { date: "desc" },
    include: {
      beneficiaries: { select: { userId: true } },
      category: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        totalEntries,
        nullWorkspaceEntries,
        legacyWorkspaceEntries,
        entryBeneficiaryRows: beneficiaryRows,
        entriesWithoutBeneficiaryRows: entriesWithoutBeneficiaries,
        legacyWorkspaceStats: {
          entriesCount: statsOverview._count,
          totalSaved: statsOverview._sum.savedAmount?.toString() ?? "0",
          totalRealSpent: statsOverview._sum.realCost?.toString() ?? "0",
          totalAlternativeCost:
            statsOverview._sum.alternativeCost?.toString() ?? "0",
        },
        listQuerySampleCount: listSample.length,
        listQueryWorks: listSample.every(
          (entry) => Array.isArray(entry.beneficiaries),
        ),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Validation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
