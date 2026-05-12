export const dynamic = "force-dynamic";

import Link from "next/link";

import { getCategories, getEntryById } from "@/src/actions/entries";
import { PageHeader } from "@/src/components/layout/page-header";
import { EntryEditForm } from "@/src/components/entries/entry-edit-form";
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EditEntryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEntryPage({ params }: EditEntryPageProps) {
  const { id } = await params;

  const [entry, categories] = await Promise.all([getEntryById(id), getCategories()]);

  if (!entry) {
    return (
      <main className="space-y-5 sm:space-y-6">
        <PageHeader
          backHref="/entries"
          title="Movimento non trovato"
          context="Non riesco a trovare il movimento richiesto."
        />

        <Card className="border-border shadow-sm">
          <CardHeader className="space-y-1 p-5 pb-3">
            <CardTitle className="text-base">Movimento non trovato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0">
            <p className="text-sm leading-6 text-muted-text">
              Il movimento potrebbe essere stato eliminato oppure l&apos;indirizzo
              non e piu valido.
            </p>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/entries">Torna ai movimenti</Link>
            </Button>
          </CardContent>
        </Card>
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
    <main className="space-y-5 sm:space-y-6">
      <PageHeader
        backHref="/entries"
        title="Modifica movimento"
      />

      <EntryEditForm entry={entry} categories={resolvedCategories} />
    </main>
  );
}
