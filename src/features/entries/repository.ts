import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { upsertDefaultCategoryForWorkspace } from "@/src/features/categories/repository";
import { prisma } from "@/src/lib/prisma";
import { getCurrentWorkspaceScopedWhere } from "@/src/lib/workspace-context";

export async function resolveEntryCategory(
  categoryId: string,
  workspaceId: string,
) {
  let category = await prisma.category.findFirst({
    where: await getCurrentWorkspaceScopedWhere({
      id: categoryId,
    }),
  });

  if (!category) {
    category = await prisma.category.findFirst({
      where: await getCurrentWorkspaceScopedWhere({
        slug: categoryId,
      }),
    });
  }

  if (!category) {
    const fallbackCategory = DEFAULT_CATEGORIES.find(
      (item) => item.slug === categoryId,
    );

    if (fallbackCategory) {
      category = await upsertDefaultCategoryForWorkspace(
        prisma,
        workspaceId,
        fallbackCategory,
      );
    }
  }

  return category;
}
