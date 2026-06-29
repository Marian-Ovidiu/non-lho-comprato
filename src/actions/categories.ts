"use server";

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
  presetsCount: number;
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

function validateCategoryName(name: string): string | null {
  if (!name) return "Il nome è obbligatorio.";
  if (name.length > 80) return "Il nome è troppo lungo (max 80 caratteri).";
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
            quickPresets: true,
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
      presetsCount: row._count.quickPresets,
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
  try {
    const { workspaceId } = await requireOwner();

    const name = String(formData.get("name") ?? "").trim();
    const icon = String(formData.get("icon") ?? "").trim() || null;
    const color = String(formData.get("color") ?? "").trim() || null;

    const nameError = validateCategoryName(name);
    if (nameError) return { success: false, message: nameError };

    const baseSlug = generateSlugFromName(name);
    const slug = await generateUniqueSlug(workspaceId, baseSlug);

    await prisma.category.create({
      data: { workspaceId, name, slug, icon, color, isDefault: false },
    });

    revalidateCategoryPaths();
    return { success: true, message: "Categoria creata." };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: "Solo un owner può gestire le categorie." };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, message: "Esiste già una categoria con questo nome." };
    }
    console.error("createCategory failed:", error);
    return { success: false, message: "Non riesco a creare la categoria adesso. Riprova." };
  }
}

// ── updateCategory ───────────────────────────────────────────────────────────

export async function updateCategory(
  categoryId: string,
  formData: FormData,
): Promise<CategoryActionResult> {
  await refreshSupabaseSessionForAction();
  try {
    const { workspaceId } = await requireOwner();

    const name = String(formData.get("name") ?? "").trim();
    const icon = String(formData.get("icon") ?? "").trim() || null;
    const color = String(formData.get("color") ?? "").trim() || null;

    const nameError = validateCategoryName(name);
    if (nameError) return { success: false, message: nameError };

    const category = await prisma.category.findFirst({
      where: await getCurrentWorkspaceScopedWhere({ id: categoryId }),
      select: { id: true },
    });
    if (!category) return { success: false, message: "Categoria non trovata." };

    await prisma.category.update({
      where: { id: categoryId, workspaceId },
      data: { name, icon, color },
    });

    revalidateCategoryPaths();
    return { success: true, message: "Categoria aggiornata." };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: "Solo un owner può gestire le categorie." };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, message: "Esiste già una categoria con questo nome." };
    }
    console.error("updateCategory failed:", error);
    return {
      success: false,
      message: "Non riesco ad aggiornare la categoria adesso. Riprova.",
    };
  }
}

// ── archiveCategory ──────────────────────────────────────────────────────────

export async function archiveCategory(
  categoryId: string,
): Promise<CategoryActionResult> {
  await refreshSupabaseSessionForAction();
  try {
    const { workspaceId } = await requireOwner();

    const category = await prisma.category.findFirst({
      where: await getCurrentWorkspaceScopedWhere({ id: categoryId }),
      select: { id: true, archivedAt: true },
    });
    if (!category) return { success: false, message: "Categoria non trovata." };

    if (category.archivedAt !== null) {
      return { success: true, message: "Categoria già archiviata." };
    }

    await prisma.category.update({
      where: { id: categoryId, workspaceId },
      data: { archivedAt: new Date() },
    });

    revalidateCategoryPaths();
    return { success: true, message: "Categoria archiviata." };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: "Solo un owner può gestire le categorie." };
    }
    console.error("archiveCategory failed:", error);
    return {
      success: false,
      message: "Non riesco ad archiviare la categoria adesso. Riprova.",
    };
  }
}

// ── restoreCategory ──────────────────────────────────────────────────────────

export async function restoreCategory(
  categoryId: string,
): Promise<CategoryActionResult> {
  await refreshSupabaseSessionForAction();
  try {
    const { workspaceId } = await requireOwner();

    const category = await prisma.category.findFirst({
      where: await getCurrentWorkspaceScopedWhere({ id: categoryId }),
      select: { id: true, name: true, archivedAt: true },
    });
    if (!category) return { success: false, message: "Categoria non trovata." };

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
        message: `Esiste già una categoria attiva chiamata "${category.name}". Rinominala prima di ripristinarla.`,
      };
    }

    await prisma.category.update({
      where: { id: categoryId, workspaceId },
      data: { archivedAt: null },
    });

    revalidateCategoryPaths();
    return { success: true, message: "Categoria ripristinata." };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: "Solo un owner può gestire le categorie." };
    }
    console.error("restoreCategory failed:", error);
    return {
      success: false,
      message: "Non riesco a ripristinare la categoria adesso. Riprova.",
    };
  }
}

// ── deleteCategory ───────────────────────────────────────────────────────────

export async function deleteCategory(
  categoryId: string,
): Promise<CategoryActionResult> {
  await refreshSupabaseSessionForAction();
  try {
    const { workspaceId } = await requireOwner();

    const category = await prisma.category.findFirst({
      where: await getCurrentWorkspaceScopedWhere({ id: categoryId }),
      select: {
        id: true,
        name: true,
        _count: { select: { entries: true, habits: true, quickPresets: true } },
      },
    });
    if (!category) return { success: false, message: "Categoria non trovata." };

    const entriesCount = category._count.entries;
    const habitsCount = category._count.habits;
    const presetsCount = category._count.quickPresets;
    const totalRefs = entriesCount + habitsCount + presetsCount;

    if (totalRefs > 0) {
      const parts: string[] = [];
      if (entriesCount > 0)
        parts.push(`${entriesCount} ${entriesCount === 1 ? "movimento" : "movimenti"}`);
      if (habitsCount > 0)
        parts.push(`${habitsCount} ${habitsCount === 1 ? "abitudine" : "abitudini"}`);
      if (presetsCount > 0) parts.push(`${presetsCount} preset`);
      return {
        success: false,
        message: `Questa categoria è usata da ${parts.join(", ")}. Archiviala per nasconderla dai selettori.`,
      };
    }

    await prisma.category.delete({ where: { id: categoryId, workspaceId } });

    revalidateCategoryPaths();
    return { success: true, message: "Categoria eliminata." };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: "Solo un owner può gestire le categorie." };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        success: false,
        message:
          "Questa categoria è usata da movimenti, abitudini o preset. Archiviala per nasconderla dai selettori.",
      };
    }
    console.error("deleteCategory failed:", error);
    return {
      success: false,
      message: "Non riesco ad eliminare la categoria adesso. Riprova.",
    };
  }
}

// ── resetDefaultCategories ───────────────────────────────────────────────────

export async function resetDefaultCategories(): Promise<CategoryActionResult> {
  await refreshSupabaseSessionForAction();
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
    return { success: true, message: "Categorie predefinite ripristinate." };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WorkspaceRbacError) {
      return { success: false, message: "Solo un owner può gestire le categorie." };
    }
    console.error("resetDefaultCategories failed:", error);
    return {
      success: false,
      message: "Non riesco a ripristinare le categorie adesso. Riprova.",
    };
  }
}
