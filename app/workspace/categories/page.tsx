import { Rule } from "@/components/crafted";
import { CraftedSubpageHeader } from "@/src/components/layout/crafted-subpage-header";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { CraftedCategoryManagement } from "@/src/components/workspace/crafted-category-management";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { getWorkspaceCategories } from "@/src/actions/categories";

export const dynamic = "force-dynamic";

export default async function WorkspaceCategoriesPage() {
  let loadError: string | null = null;
  let categories: Awaited<ReturnType<typeof getWorkspaceCategories>> = [];

  try {
    categories = await getWorkspaceCategories();
  } catch (error) {
    loadError = formatEntryLoadError(error);
    console.error("Failed to load workspace categories page:", error);
  }

  if (loadError) {
    return (
      <main className="pb-6">
        <div className="px-5 pt-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile caricare le categorie"
            message={loadError}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="pb-6">
      <CraftedSubpageHeader
        backHref="/more"
        eyebrow="Workspace"
        title="Gestisci categorie"
        context="Le categorie valgono solo per questo spazio. Nel workspace condiviso le modifiche sono visibili a tutti i membri."
      />
      <Rule />
      <CraftedCategoryManagement initialCategories={categories} />
    </main>
  );
}
