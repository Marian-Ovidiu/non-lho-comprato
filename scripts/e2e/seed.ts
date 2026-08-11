import { loadE2EEnv, assertE2EEnvGuard } from "./env";

loadE2EEnv();
assertE2EEnvGuard();

const E2E_IDS = {
  marian: "e2e-user-marian",
  martina: "e2e-user-martina",
  luca: "e2e-user-luca",
  privateWorkspace: "e2e-workspace-private-marian",
  sharedWorkspace: "e2e-workspace-shared-casa",
  entryCoffee: "e2e-entry-coffee",
  entryShared: "e2e-entry-shared-delivery",
  goal: "e2e-goal-vacanza",
  habit: "e2e-habit-caffe",
};

async function main() {
  const [{ DEFAULT_CATEGORIES }, { getWorkspaceCategorySlugWhere }, { prisma }] =
    await Promise.all([
      import("../../src/lib/categories"),
      import("../../src/features/categories/category-scope"),
      import("../../src/lib/prisma"),
    ]);

  await prisma.user.upsert({
    where: { id: E2E_IDS.marian },
    update: {
      email: "marian.e2e@example.com",
      name: "Marian E2E",
    },
    create: {
      id: E2E_IDS.marian,
      email: "marian.e2e@example.com",
      name: "Marian E2E",
    },
  });

  await prisma.user.upsert({
    where: { id: E2E_IDS.martina },
    update: {
      email: "martina.e2e@example.com",
      name: "Martina E2E",
    },
    create: {
      id: E2E_IDS.martina,
      email: "martina.e2e@example.com",
      name: "Martina E2E",
    },
  });

  await prisma.user.upsert({
    where: { id: E2E_IDS.luca },
    update: {
      email: "luca.e2e@example.com",
      name: "Luca E2E",
    },
    create: {
      id: E2E_IDS.luca,
      email: "luca.e2e@example.com",
      name: "Luca E2E",
    },
  });

  await prisma.workspace.upsert({
    where: { id: E2E_IDS.privateWorkspace },
    update: {
      name: "Privato E2E",
      kind: "private",
      ownerUserId: E2E_IDS.marian,
      setupCompleted: true,
      timezone: "Europe/Rome",
      currency: "EUR",
      language: "it",
    },
    create: {
      id: E2E_IDS.privateWorkspace,
      name: "Privato E2E",
      kind: "private",
      ownerUserId: E2E_IDS.marian,
      setupCompleted: true,
      timezone: "Europe/Rome",
      currency: "EUR",
      language: "it",
    },
  });

  await prisma.workspace.upsert({
    where: { id: E2E_IDS.sharedWorkspace },
    update: {
      name: "Casa E2E",
      kind: "shared",
      ownerUserId: E2E_IDS.marian,
      setupCompleted: true,
      timezone: "Europe/Rome",
      currency: "EUR",
      language: "it",
    },
    create: {
      id: E2E_IDS.sharedWorkspace,
      name: "Casa E2E",
      kind: "shared",
      ownerUserId: E2E_IDS.marian,
      setupCompleted: true,
      timezone: "Europe/Rome",
      currency: "EUR",
      language: "it",
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: E2E_IDS.privateWorkspace,
        userId: E2E_IDS.marian,
      },
    },
    update: { role: "owner" },
    create: {
      workspaceId: E2E_IDS.privateWorkspace,
      userId: E2E_IDS.marian,
      role: "owner",
    },
  });

  for (const userId of [E2E_IDS.marian, E2E_IDS.martina]) {
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: E2E_IDS.sharedWorkspace,
          userId,
        },
      },
      update: { role: userId === E2E_IDS.marian ? "owner" : "member" },
      create: {
        workspaceId: E2E_IDS.sharedWorkspace,
        userId,
        role: userId === E2E_IDS.marian ? "owner" : "member",
      },
    });
  }

  for (const workspaceId of [E2E_IDS.privateWorkspace, E2E_IDS.sharedWorkspace]) {
    for (const category of DEFAULT_CATEGORIES) {
      await prisma.category.upsert({
        where: getWorkspaceCategorySlugWhere(workspaceId, category.slug),
        update: {
          name: category.name,
          icon: category.icon,
          color: category.color,
          isDefault: true,
          archivedAt: null,
        },
        create: {
          workspaceId,
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          color: category.color,
          isDefault: true,
        },
      });
    }
  }

  const [coffeeCategory, deliveryCategory] = await Promise.all([
    prisma.category.findUniqueOrThrow({
      where: getWorkspaceCategorySlugWhere(E2E_IDS.sharedWorkspace, "caffe"),
    }),
    prisma.category.findUniqueOrThrow({
      where: getWorkspaceCategorySlugWhere(E2E_IDS.sharedWorkspace, "delivery"),
    }),
  ]);

  await prisma.entry.upsert({
    where: { id: E2E_IDS.entryCoffee },
    update: {
      title: "Caffe e2e evitato",
      workspaceId: E2E_IDS.sharedWorkspace,
      categoryId: coffeeCategory.id,
      realCost: "0.00",
      alternativeCost: "3.50",
      savedAmount: "3.50",
      mode: "avoided",
      savingContext: "none",
      paymentMode: "single_payer",
      paidByUserId: E2E_IDS.marian,
      createdByUserId: E2E_IDS.marian,
      date: new Date("2026-06-10T10:00:00.000Z"),
      source: "manual",
    },
    create: {
      id: E2E_IDS.entryCoffee,
      title: "Caffe e2e evitato",
      workspaceId: E2E_IDS.sharedWorkspace,
      categoryId: coffeeCategory.id,
      realCost: "0.00",
      alternativeCost: "3.50",
      savedAmount: "3.50",
      mode: "avoided",
      savingContext: "none",
      paymentMode: "single_payer",
      paidByUserId: E2E_IDS.marian,
      createdByUserId: E2E_IDS.marian,
      date: new Date("2026-06-10T10:00:00.000Z"),
      source: "manual",
    },
  });

  await prisma.entry.upsert({
    where: { id: E2E_IDS.entryShared },
    update: {
      title: "Delivery e2e condiviso",
      workspaceId: E2E_IDS.sharedWorkspace,
      categoryId: deliveryCategory.id,
      realCost: "20.00",
      alternativeCost: "28.00",
      savedAmount: "8.00",
      mode: "spent",
      savingContext: "comparison",
      paymentMode: "single_payer",
      paidByUserId: E2E_IDS.marian,
      createdByUserId: E2E_IDS.marian,
      date: new Date("2026-06-11T18:30:00.000Z"),
      source: "manual",
    },
    create: {
      id: E2E_IDS.entryShared,
      title: "Delivery e2e condiviso",
      workspaceId: E2E_IDS.sharedWorkspace,
      categoryId: deliveryCategory.id,
      realCost: "20.00",
      alternativeCost: "28.00",
      savedAmount: "8.00",
      mode: "spent",
      savingContext: "comparison",
      paymentMode: "single_payer",
      paidByUserId: E2E_IDS.marian,
      createdByUserId: E2E_IDS.marian,
      date: new Date("2026-06-11T18:30:00.000Z"),
      source: "manual",
    },
  });

  for (const [entryId, userId] of [
    [E2E_IDS.entryCoffee, E2E_IDS.marian],
    [E2E_IDS.entryShared, E2E_IDS.marian],
    [E2E_IDS.entryShared, E2E_IDS.martina],
  ]) {
    await prisma.entryBeneficiary.upsert({
      where: {
        entryId_userId: {
          entryId,
          userId,
        },
      },
      update: {},
      create: {
        entryId,
        userId,
      },
    });
  }

  await prisma.goal.upsert({
    where: { id: E2E_IDS.goal },
    update: {
      workspaceId: E2E_IDS.sharedWorkspace,
      title: "Vacanza E2E",
      targetAmount: "100.00",
      emoji: null,
      targetUserId: null,
      isActive: true,
    },
    create: {
      id: E2E_IDS.goal,
      workspaceId: E2E_IDS.sharedWorkspace,
      title: "Vacanza E2E",
      targetAmount: "100.00",
      emoji: null,
      targetUserId: null,
      isActive: true,
    },
  });


  await prisma.habit.upsert({
    where: { id: E2E_IDS.habit },
    update: {
      workspaceId: E2E_IDS.sharedWorkspace,
      name: "Caffe e2e",
      categoryId: coffeeCategory.id,
      amount: "2.00",
      activeDays: [1, 2, 3, 4, 5],
      isActive: true,
      defaultBehavior: "spent",
      targetScope: "self",
      targetUserId: E2E_IDS.marian,
    },
    create: {
      id: E2E_IDS.habit,
      workspaceId: E2E_IDS.sharedWorkspace,
      name: "Caffe e2e",
      categoryId: coffeeCategory.id,
      amount: "2.00",
      activeDays: [1, 2, 3, 4, 5],
      isActive: true,
      defaultBehavior: "spent",
      targetScope: "self",
      targetUserId: E2E_IDS.marian,
    },
  });

  console.log("Seeded e2e users, workspaces and sample data.");
}

main()
  .catch((error) => {
    console.error("E2E seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../../src/lib/prisma");
    await prisma.$disconnect();
  });
