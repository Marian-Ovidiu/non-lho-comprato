import Link from "next/link";

import { getEntries } from "@/src/actions/entries";
import { EntryList } from "@/src/components/entries/entry-list";
import { PageHeader } from "@/src/components/layout/page-header";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { Button } from "@/components/ui/button";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { getCurrentWorkspaceMembers } from "@/src/lib/workspace-context";

export const dynamic = "force-dynamic";

export default async function EntriesPage() {
  type EntryItem = Awaited<ReturnType<typeof getEntries>>[number];
  let entries: EntryItem[] = [];
  let members: Awaited<ReturnType<typeof getCurrentWorkspaceMembers>> = [];
  let loadError: string | null = null;

  try {
    [entries, members] = await Promise.all([getEntries(), getCurrentWorkspaceMembers()]);
  } catch (error) {
    loadError = formatEntryLoadError(error);
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

      {loadError ? (
        <DataLoadErrorBanner
          title="Impossibile caricare i movimenti"
          message={loadError}
        />
      ) : null}

      <EntryList entries={entries} members={members} />
    </main>
  );
}
