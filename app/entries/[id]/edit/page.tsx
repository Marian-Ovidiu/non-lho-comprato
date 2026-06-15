export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";
import { getCategories, getEntryById } from "@/src/actions/entries";
import { CraftedEntryNotFound } from "@/src/components/entries/crafted-entry-not-found";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";

const EntryEditForm = nextDynamic(
  () =>
    import("@/src/components/entries/entry-edit-form").then((m) => ({
      default: m.EntryEditForm,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse space-y-4 px-5 pt-5">
        <div className="h-12 rounded-xl bg-muted" />
        <div className="h-12 rounded-xl bg-muted" />
        <div className="h-12 rounded-xl bg-muted" />
        <div className="h-28 rounded-xl bg-muted" />
      </div>
    ),
  },
);
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { getCurrentWorkspaceMembers } from "@/src/lib/workspace-context";

type EditEntryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEntryPage({ params }: EditEntryPageProps) {
  const { id } = await params;

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
      <EntryEditForm entry={entry} categories={resolvedCategories} members={members} />
    </main>
  );
}
