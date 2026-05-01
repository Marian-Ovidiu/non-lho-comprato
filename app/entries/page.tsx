import Link from "next/link";

import { getEntries } from "@/src/actions/entries";
import { EntryList } from "@/src/components/entries/entry-list";
import { PageHeader } from "@/src/components/layout/page-header";
import { Button } from "@/components/ui/button";

export default async function EntriesPage() {
  type EntryItem = Awaited<ReturnType<typeof getEntries>>[number];
  let entries: EntryItem[] = [];

  try {
    entries = await getEntries();
  } catch (error) {
    console.error("Failed to load entries:", error);
  }

  return (
    <main className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Movimenti"
        title="Cronologia completa"
        description="Qui trovi tutto quello che hai speso davvero e quello che hai evitato."
        action={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/entries/new">Aggiungi movimento</Link>
          </Button>
        }
      />

      <EntryList entries={entries} />
    </main>
  );
}
