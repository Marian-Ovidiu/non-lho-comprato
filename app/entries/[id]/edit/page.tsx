export const dynamic = "force-dynamic";

import { getCategories, getEntryById } from "@/src/actions/entries";
import { CraftedEntryNotFound } from "@/src/components/entries/crafted-entry-not-found";
import { EntryEditForm } from "@/src/components/entries/entry-edit-form";
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { getCurrentWorkspaceMembers } from "@/src/lib/workspace-context";

type EditEntryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEntryPage({ params }: EditEntryPageProps) {
  const { id } = await params;

  const [entry, categories, members] = await Promise.all([
    getEntryById(id),
    getCategories(),
    getCurrentWorkspaceMembers(),
  ]);

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
