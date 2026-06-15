import { config } from "dotenv";

config({ path: ".env.production" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  const workspaceId = "legacy-marian-martina";
  const where = { workspaceId };

  const rawCount = await prisma.entry.count({ where });
  console.log("rawCount", rawCount);

  try {
    const withBeneficiaries = await prisma.entry.findMany({
      where,
      orderBy: { date: "desc" },
      take: 3,
      include: {
        category: true,
        beneficiaries: { select: { userId: true } },
      },
    });
    console.log("withBeneficiaries", withBeneficiaries.length);
  } catch (error) {
    console.error("withBeneficiaries failed", error);
  }

  try {
    const selective = await prisma.entry.findMany({
      where,
      orderBy: { date: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        categoryId: true,
        realCost: true,
        alternativeCost: true,
        savedAmount: true,
        date: true,
        note: true,
        source: true,
        paidByUserId: true,
        habitOccurrenceId: true,
        createdAt: true,
        updatedAt: true,
        category: true,
      },
    });
    console.log("selectiveWithoutFirstOfDay", selective.length);

    const withBeneficiariesSelective = await prisma.entry.findMany({
      where,
      orderBy: { date: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        categoryId: true,
        realCost: true,
        alternativeCost: true,
        savedAmount: true,
        date: true,
        note: true,
        source: true,
        paidByUserId: true,
        habitOccurrenceId: true,
        createdAt: true,
        updatedAt: true,
        category: true,
        beneficiaries: { select: { userId: true } },
      },
    });
    console.log("withBeneficiariesSelective", withBeneficiariesSelective.length);
  } catch (error) {
    console.error("selectiveWithoutFirstOfDay failed", error);
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
