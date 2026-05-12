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
    <main className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Movimenti"
        context="Cronologia di ciò che hai speso e di ciò che hai evitato."
        action={
          <Button asChild className="h-10 rounded-2xl px-4">
            <Link href="/entries/new">Aggiungi movimento</Link>
          </Button>
        }
        chips={[
          { label: `${entries.length} totali`, tone: "default" },
          { label: "Ultimi movimenti", tone: "premium" },
        ]}
      />

      <EntryList entries={entries} />
    </main>
  );
}
