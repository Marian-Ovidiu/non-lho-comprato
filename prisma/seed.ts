import { DEFAULT_CATEGORIES } from "../src/lib/categories";
import { prisma } from "../src/lib/prisma";

async function main() {
  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        icon: category.icon,
        color: category.color,
      },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        color: category.color,
      },
    });
  }

  console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
