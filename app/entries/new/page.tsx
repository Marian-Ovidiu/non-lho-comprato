import { getCategories } from "@/src/actions/entries";
import { EntryForm } from "@/src/components/entries/entry-form";
import { PageHeader } from "@/src/components/layout/page-header";
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";

export default async function NewEntryPage() {
  type CategoryOption = Awaited<ReturnType<typeof getCategories>>[number];
  let categories: CategoryOption[] = await getCategories();

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
        eyebrow="Aggiungi"
        title="Nuovo movimento"
        context="Registra quello che hai speso davvero e quello che avresti speso nell'alternativa."
      />

      <EntryForm categories={categories} />
    </main>
  );
}
