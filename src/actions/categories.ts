"use server";

import { getActionTranslations } from "@/src/lib/i18n/server";
import { it } from "@/src/lib/i18n/it";
import type { Translations } from "@/src/lib/i18n";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { Prisma } from "@/src/lib/generated/prisma/client";
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { refreshSupabaseSessionForAction } from "@/src/lib/auth/action-session";
import { logAndRethrowDataLoadError } from "@/src/lib/data-load-error";
import { prisma } from "@/src/lib/prisma";
import {
  requireWorkspaceRole,
  WorkspaceRbacError,
} from "@/src/features/workspaces/rbac";
import { upsertDefaultCategoryForWorkspace } from "@/src/features/categories/repository";
import { generateSlugFromName } from "@/src/features/categories/slug";
import {
  getCurrentUser,
  getCurrentWorkspaceId,
  getCurrentWorkspaceScopedWhere,
} from "@/src/lib/workspace-context";

// ── types ────────────────────────────────────────────────────────────────────

export type CategoryActionResult = {
  success: boolean;
  message: string;
};

export type CategoryManagementItem = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  archivedAt: Date | null;
  entriesCount: number;
  habitsCount: number;
};

// ── private helpers ──────────────────────────────────────────────────────────

async function requireOwner(): Promise<{ userId: string; workspaceId: string }> {
  const [user, workspaceId] = await Promise.all([
    getCurrentUser(),
    getCurrentWorkspaceId(),
  ]);
  await requireWorkspaceRole(prisma, { workspaceId, userId: user.id, roles: ["owner"] });
  return { userId: user.id, workspaceId };
}

function validateCategoryName(
  name: string,
  m: Translations["categoryActions"] = it.categoryActions,
): string | null {
  if (!name) return m.nameRequired;
  if (name.length > 80) return m.nameTooLong;
  return null;
}

async function generateUniqueSlug(workspaceId: string, baseSlug: string): Promise<string> {
  const existing = await prisma.category.findUnique({
    where: { workspaceId_slug: { workspaceId, slug: baseSlug } },
    select: { id: true },
  });
  if (!existing) return baseSlug;

  for (let i = 2; i <= 99; i++) {
    const candidate = `${baseSlug}-${i}`;
    const conflict = await prisma.category.findUnique({
      where: { workspaceId_slug: { workspaceId, slug: candidate } },
      select: { id: true },
    });
    if (!conflict) return candidate;
  }

  return `${baseSlug}-${Date.now()}`;
}

function revalidateCategoryPaths() {
  revalidatePath("/", "layout");
}

// ── getWorkspaceCategories ───────────────────────────────────────────────────

export async function getWorkspaceCategories(): Promise<CategoryManagementItem[]> {
  try {
    const workspaceId = await getCurrentWorkspaceId();

    const rows = await prisma.category.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        isDefault: true,
        archivedAt: true,
        _count: {
          select: {
            entries: true,
            habits: true,
          },
        },
      },
      orderBy: [
        { archivedAt: { sort: "asc", nulls: "first" } },
        { isDefault: "desc" },
        { name: "asc" },
      ],
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      icon: row.icon,
      color: row.color,
      isDefault: row.isDefault,
      archivedAt: row.archivedAt,
      entriesCount: row._count.entries,
      habitsCount: row._count.habits,
    }));
  } catch (error) {
    logAndRethrowDataLoadError("getWorkspaceCategories failed", error);
  }
}

// ── createCategory ───────────────────────────────────────────────────────────

export async function createCategory(
  formData: FormData,
): Promise<CategoryActionResult> {
  await refreshSupabaseSessionForAction();
  const t = await getActionTranslations();
  try {
    const { workspaceId } = await requireOwner();

    const name = String(formData.get("name") ?? "").trim();
    const icon = String(formData.get("icon") ?? "").trim() || null;
    const color = String(formData.get("color") ?? "").trim() || null;

    const nameError = validateCategoryName(name, t.categoryActions);
    if (nameError) return { success: false, message: nameError };

    const baseSlug = generateSlugFromName(name);
    const slug = await generateUniqueSlug(workspaceId, baseSlug);

    await prisma.category.create({
      data: { workspaceId, name, slug, icon, color, isDefault: false },
    });

    revalidateCategoryPaths();
    return { success: true, message: t.categoryActions.created };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: t.categoryActions.ownerOnly };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, message: t.categoryActions.duplicateName };
    }
    console.error("createCategory failed:", error);
    return { success: false, message: t.categoryActions.createFailed };
  }
}

// ── updateCategory ───────────────────────────────────────────────────────────

export async function updateCategory(
  categoryId: string,
  formData: FormData,
): Promise<CategoryActionResult> {
  await refreshSupabaseSessionForAction();
  const t = await getActionTranslations();
  try {
    const { workspaceId } = await requireOwner();

    const name = String(formData.get("name") ?? "").trim();
    const icon = String(formData.get("icon") ?? "").trim() || null;
    const color = String(formData.get("color") ?? "").trim() || null;

    const nameError = validateCategoryName(name, t.categoryActions);
    if (nameError) return { success: false, message: nameError };

    const category = await prisma.category.findFirst({
      where: await getCurrentWorkspaceScopedWhere({ id: categoryId }),
      select: { id: true },
    });
    if (!category) return { success: false, message: t.categoryActions.notFound };

    await prisma.category.update({
      where: { id: categoryId, workspaceId },
      data: { name, icon, color },
    });

    revalidateCategoryPaths();
    return { success: true, message: t.categoryActions.updated };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: t.categoryActions.ownerOnly };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, message: t.categoryActions.duplicateName };
    }
    console.error("updateCategory failed:", error);
    return {
      success: false,
      message: t.categoryActions.updateFailed,
    };
  }
}

// ── archiveCategory ──────────────────────────────────────────────────────────

export async function archiveCategory(
  categoryId: string,
): Promise<CategoryActionResult> {
  await refreshSupabaseSessionForAction();
  const t = await getActionTranslations();
  try {
    const { workspaceId } = await requireOwner();

    const category = await prisma.category.findFirst({
      where: await getCurrentWorkspaceScopedWhere({ id: categoryId }),
      select: { id: true, archivedAt: true },
    });
    if (!category) return { success: false, message: t.categoryActions.notFound };

    if (category.archivedAt !== null) {
      return { success: true, message: t.categoryActions.alreadyArchived };
    }

    await prisma.category.update({
      where: { id: categoryId, workspaceId },
      data: { archivedAt: new Date() },
    });

    revalidateCategoryPaths();
    return { success: true, message: t.categoryActions.archived };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: t.categoryActions.ownerOnly };
    }
    console.error("archiveCategory failed:", error);
    return {
      success: false,
      message: t.categoryActions.archiveFailed,
    };
  }
}

// ── restoreCategory ──────────────────────────────────────────────────────────

export async function restoreCategory(
  categoryId: string,
): Promise<CategoryActionResult> {
  await refreshSupabaseSessionForAction();
  const t = await getActionTranslations();
  try {
    const { workspaceId } = await requireOwner();

    const category = await prisma.category.findFirst({
      where: await getCurrentWorkspaceScopedWhere({ id: categoryId }),
      select: { id: true, name: true, archivedAt: true },
    });
    if (!category) return { success: false, message: t.categoryActions.notFound };

    // Check for a name conflict with another active category
    const nameConflict = await prisma.category.findFirst({
      where: {
        workspaceId,
        name: category.name,
        archivedAt: null,
        id: { not: categoryId },
      },
      select: { id: true },
    });
    if (nameConflict) {
      return {
        success: false,
        message: t.categoryActions.activeDuplicate(category.name),
      };
    }

    await prisma.category.update({
      where: { id: categoryId, workspaceId },
      data: { archivedAt: null },
    });

    revalidateCategoryPaths();
    return { success: true, message: t.categoryActions.restored };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: t.categoryActions.ownerOnly };
    }
    console.error("restoreCategory failed:", error);
    return {
      success: false,
      message: t.categoryActions.restoreFailed,
    };
  }
}

// ── deleteCategory ───────────────────────────────────────────────────────────

export async function deleteCategory(
  categoryId: string,
): Promise<CategoryActionResult> {
  await refreshSupabaseSessionForAction();
  const t = await getActionTranslations();
  try {
    const { workspaceId } = await requireOwner();

    const category = await prisma.category.findFirst({
      where: await getCurrentWorkspaceScopedWhere({ id: categoryId }),
      select: {
        id: true,
        name: true,
        _count: { select: { entries: true, habits: true } },
      },
    });
    if (!category) return { success: false, message: t.categoryActions.notFound };

    const entriesCount = category._count.entries;
    const habitsCount = category._count.habits;
    const totalRefs = entriesCount + habitsCount;

    if (totalRefs > 0) {
      const parts: string[] = [];
      if (entriesCount > 0)
        parts.push(`${entriesCount} ${entriesCount === 1 ? "movimento" : "movimenti"}`);
      if (habitsCount > 0)
        parts.push(`${habitsCount} ${habitsCount === 1 ? "abitudine" : "abitudini"}`);
      return {
        success: false,
        message: t.categoryActions.inUseBy(parts.join(", ")),
      };
    }

    await prisma.category.delete({ where: { id: categoryId, workspaceId } });

    revalidateCategoryPaths();
    return { success: true, message: t.categoryActions.deleted };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: t.categoryActions.ownerOnly };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        success: false,
        message:
          t.categoryActions.inUseGeneric,
      };
    }
    console.error("deleteCategory failed:", error);
    return {
      success: false,
      message: t.categoryActions.deleteFailed,
    };
  }
}

// ── resetDefaultCategories ───────────────────────────────────────────────────

export async function resetDefaultCategories(): Promise<CategoryActionResult> {
  await refreshSupabaseSessionForAction();
  const t = await getActionTranslations();
  try {
    const { workspaceId } = await requireOwner();

    const existingDefaults = await prisma.category.findMany({
      where: { workspaceId, isDefault: true },
      select: { id: true, slug: true, name: true, archivedAt: true },
    });

    const archivedBySlug = new Map(
      existingDefaults
        .filter((c) => c.archivedAt !== null)
        .map((c) => [c.slug, c]),
    );

    const activeSlugs = new Set(
      existingDefaults.filter((c) => c.archivedAt === null).map((c) => c.slug),
    );

    for (const def of DEFAULT_CATEGORIES) {
      if (activeSlugs.has(def.slug)) {
        // Already active — preserve any customizations, do nothing
        continue;
      }

      const archived = archivedBySlug.get(def.slug);
      if (archived) {
        // Restore archived default if no active category shares the same name
        const nameConflict = await prisma.category.findFirst({
          where: {
            workspaceId,
            name: archived.name,
            archivedAt: null,
            id: { not: archived.id },
          },
          select: { id: true },
        });
        if (!nameConflict) {
          await prisma.category.update({
            where: { id: archived.id, workspaceId },
            data: { archivedAt: null },
          });
        }
      } else {
        // Not in DB yet — provision from defaults
        await upsertDefaultCategoryForWorkspace(prisma, workspaceId, def);
      }
    }

    revalidateCategoryPaths();
    return { success: true, message: t.categoryActions.defaultsRestored };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: t.categoryActions.ownerOnly };
    }
    console.error("resetDefaultCategories failed:", error);
    return {
      success: false,
      message: t.categoryActions.restoreAllFailed,
    };
  }
}
