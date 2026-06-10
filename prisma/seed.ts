import { DEFAULT_CATEGORIES } from "../src/lib/categories";
import { getWorkspaceCategorySlugWhere } from "../src/features/categories/category-scope";
import { prisma } from "../src/lib/prisma";

async function main() {
  const workspaces = await prisma.workspace.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  for (const workspace of workspaces) {
    for (const category of DEFAULT_CATEGORIES) {
      await prisma.category.upsert({
        where: getWorkspaceCategorySlugWhere(workspace.id, category.slug),
        update: {
          name: category.name,
          icon: category.icon,
          color: category.color,
        },
        create: {
          workspaceId: workspace.id,
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          color: category.color,
        },
      });
    }
  }

  console.log(
    `Seeded ${DEFAULT_CATEGORIES.length} categories for ${workspaces.length} workspaces.`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
