import { getCategories } from "@/src/actions/entries";
import { EntryForm } from "@/src/components/entries/entry-form";
import { PageHeader } from "@/src/components/layout/page-header";
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { normalizeLegacyPerson } from "@/src/lib/ui-person";
import { getCurrentWorkspaceUiContext } from "@/src/lib/workspace-context";

export const dynamic = "force-dynamic";

function getSearchValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  type CategoryOption = Awaited<ReturnType<typeof getCategories>>[number];
  let categories: CategoryOption[] = await getCategories();
  const workspace = await getCurrentWorkspaceUiContext();
  const query = await searchParams;
  const title = getSearchValue(query.title)?.trim();
  const categoryId =
    getSearchValue(query.categoryId) ?? getSearchValue(query.category) ?? "";
  const realCost = getSearchValue(query.realCost)?.trim();
  const alternativeCost = getSearchValue(query.alternativeCost)?.trim();
  const date = getSearchValue(query.date)?.trim();
  const person = normalizeLegacyPerson(getSearchValue(query.person));

  if (categories.length === 0) {
    categories = DEFAULT_CATEGORIES.map((category) => ({
      id: category.slug,
      name: category.name,
      slug: category.slug,
      color: category.color,
      icon: category.icon,
    })) as CategoryOption[];
  }

  return (
    <main className="space-y-5 sm:space-y-6">
      <PageHeader
        backHref="/entries"
        title="Nuovo movimento"
        context={`Salva in ${workspace.name}.`}
        chips={[
          {
            label: workspace.isShared ? "Condiviso" : "Privato",
            tone: workspace.isShared ? "premium" : "default",
          },
        ]}
      />

      <EntryForm
        categories={categories}
        initialValues={{
          title,
          categoryId,
          realCost,
          alternativeCost,
          person: person ?? undefined,
          date,
        }}
      />
    </main>
  );
}
