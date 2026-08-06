
import { unstable_rethrow } from "next/navigation";

import { getCategories, getEntryById } from "@/src/actions/entries";
import { CraftedEntryNotFound } from "@/src/components/entries/crafted-entry-not-found";
import { EntryEditForm } from "@/src/components/entries/entry-edit-form";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { getCurrentWorkspaceMembers } from "@/src/lib/workspace-context";

type EditEntryPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const DEFAULT_RETURN_TO = "/entries";

/// Solo percorsi interni: un returnTo assoluto sarebbe un redirect aperto.
function getSafeReturnTo(value?: string | string[]): string {
  const raw = Array.isArray(value) ? value[0] : value;

  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }

  return DEFAULT_RETURN_TO;
}

export default async function EditEntryPage({
  params,
  searchParams,
}: EditEntryPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const returnTo = getSafeReturnTo(query.returnTo);

  let loadError: string | null = null;
  let entry: Awaited<ReturnType<typeof getEntryById>> = null;
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let members: Awaited<ReturnType<typeof getCurrentWorkspaceMembers>> = [];

  try {
    [entry, categories, members] = await Promise.all([
      getEntryById(id),
      getCategories(),
      getCurrentWorkspaceMembers(),
    ]);
  } catch (error) {
    unstable_rethrow(error);
    loadError = formatEntryLoadError(error);
    console.error("Failed to load entry edit page:", error);
  }

  if (loadError) {
    return (
      <main className="pb-6">
        <div className="px-5 pt-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile caricare il movimento"
            message={loadError}
          />
        </div>
      </main>
    );
  }

  if (!entry) {
    return (
      <main className="pb-6">
        <CraftedEntryNotFound />
      </main>
    );
  }

  type CategoryOption = Awaited<ReturnType<typeof getCategories>>[number];
  const resolvedCategories =
    categories.length > 0
      ? categories
      : (DEFAULT_CATEGORIES.map((category) => ({
          id: category.slug,
          name: category.name,
          slug: category.slug,
          color: category.color,
          icon: category.icon,
        })) as CategoryOption[]);

  return (
    <main className="pb-6">
      <EntryEditForm
        entry={entry}
        categories={resolvedCategories}
        members={members}
        returnTo={returnTo}
      />
    </main>
  );
}
