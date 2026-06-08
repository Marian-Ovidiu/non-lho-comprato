import Link from "next/link";

import { getDashboardSummary, getEntriesPage } from "@/src/actions/entries";
import { getMonthlyStats } from "@/src/actions/stats";
import { CraftedEntryList } from "@/src/components/entries/crafted-entry-list";
import { CraftedEntriesHeader } from "@/src/components/entries/crafted-entries-header";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { Button } from "@/components/ui/button";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { getCurrentWorkspaceMembers } from "@/src/lib/workspace-context";

export const dynamic = "force-dynamic";

const newEntryHref = "/entries/new?returnTo=%2Fentries";

function getMonthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    timeZone: "Europe/Rome",
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function EntriesPage() {
  const membersPromise = getCurrentWorkspaceMembers();
  let entriesPage: Awaited<ReturnType<typeof getEntriesPage>> | null = null;
  let monthSummary: Awaited<ReturnType<typeof getDashboardSummary>> | null = null;
  let monthlyStats: Awaited<ReturnType<typeof getMonthlyStats>> = [];
  let loadError: string | null = null;

  try {
    [entriesPage, monthSummary, monthlyStats] = await Promise.all([
      getEntriesPage({ limit: 20, members: membersPromise }),
      getDashboardSummary(),
      getMonthlyStats(),
    ]);
  } catch (error) {
    loadError = formatEntryLoadError(error);
    console.error("Failed to load entries:", error);
  }

  const monthLabel = getMonthLabel(new Date());
  const previousMonth = monthlyStats.at(-2);

  return (
    <>
      <CraftedEntriesHeader
        monthLabel={monthLabel}
        entriesCount={monthSummary?.entriesCount ?? 0}
        totalSaved={monthSummary?.totalSaved ?? 0}
      />

      {loadError ? (
        <div className="px-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile caricare i movimenti"
            message={loadError}
          />
        </div>
      ) : null}

      <CraftedEntryList
        initialEntries={entriesPage?.entries ?? []}
        initialNextCursor={entriesPage?.nextCursor ?? null}
        initialHasMore={entriesPage?.hasMore ?? false}
        newEntryHref={newEntryHref}
        previousMonthSummary={
          previousMonth
            ? {
                label: previousMonth.label,
                totalSaved: previousMonth.totalSaved,
                entriesCount: previousMonth.entriesCount,
              }
            : null
        }
      />

      <div className="-mx-4 border-t border-line px-5 py-5 sm:-mx-6 lg:-mx-8">
        <Button asChild className="h-11 w-full rounded-2xl">
          <Link href={newEntryHref}>Nuovo movimento</Link>
        </Button>
      </div>
    </>
  );
}
