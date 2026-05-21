import Link from "next/link";

import { getEntriesPage } from "@/src/actions/entries";
import { EntryList } from "@/src/components/entries/entry-list";
import { PageHeader } from "@/src/components/layout/page-header";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { Button } from "@/components/ui/button";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { getCurrentWorkspaceMembers } from "@/src/lib/workspace-context";
import { spacing } from "@/src/lib/spacing";

export const dynamic = "force-dynamic";

export default async function EntriesPage() {
  let entriesPage: Awaited<ReturnType<typeof getEntriesPage>> | null = null;
  let members: Awaited<ReturnType<typeof getCurrentWorkspaceMembers>> = [];
  let loadError: string | null = null;

  try {
    [entriesPage, members] = await Promise.all([
      getEntriesPage({ limit: 20 }),
      getCurrentWorkspaceMembers(),
    ]);
  } catch (error) {
    loadError = formatEntryLoadError(error);
    console.error("Failed to load entries:", error);
  }

  return (
    <main className={spacing.pageStack}>
      <PageHeader
        title="Movimenti"
        context="Cronologia di ciò che hai speso e di ciò che hai evitato."
        action={
          <Button asChild className="h-10 rounded-2xl px-4">
            <Link href="/entries/new">Aggiungi movimento</Link>
          </Button>
        }
        chips={[
          { label: "Ultimi 20", tone: "default" },
          { label: "Ultimi movimenti", tone: "premium" },
        ]}
      />

      {loadError ? (
        <DataLoadErrorBanner
          title="Impossibile caricare i movimenti"
          message={loadError}
        />
      ) : null}

      <EntryList
        initialEntries={entriesPage?.entries ?? []}
        initialNextCursor={entriesPage?.nextCursor ?? null}
        initialHasMore={entriesPage?.hasMore ?? false}
        members={members}
      />
    </main>
  );
}
