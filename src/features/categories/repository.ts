import "server-only";

import type { DefaultCategory } from "@/src/lib/categories";
import { prisma } from "@/src/lib/prisma";
import { getWorkspaceCategorySlugWhere } from "@/src/features/categories/category-scope";

type CategoryRepositoryDb = Pick<typeof prisma, "category">;

export async function upsertDefaultCategoryForWorkspace(
  db: CategoryRepositoryDb,
  workspaceId: string,
  category: DefaultCategory,
) {
  return db.category.upsert({
    where: getWorkspaceCategorySlugWhere(workspaceId, category.slug),
    update: {},
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
