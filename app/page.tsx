import Link from "next/link";

import { DashboardEmptyState } from "@/src/components/dashboard/dashboard-empty-state";
import { RecentEntries } from "@/src/components/dashboard/recent-entries";
import { SummaryCards } from "@/src/components/dashboard/summary-cards";
import { PageHeader } from "@/src/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getDashboardSummary, getEntries } from "@/src/actions/entries";

export default async function Home() {
  let summary = {
    totalRealSpent: 0,
    totalAlternativeCost: 0,
    totalSaved: 0,
    entriesCount: 0,
  };
  let recentEntries: Awaited<ReturnType<typeof getEntries>> = [];

  try {
    const [loadedSummary, loadedEntries] = await Promise.all([
      getDashboardSummary(),
      getEntries(),
    ]);
    summary = loadedSummary;
    recentEntries = loadedEntries.slice(0, 5);
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
  }

  return (
    <main className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Panoramica"
        title="Dashboard"
        description="Quanto hai speso, quanto avresti speso e quanto hai schivato."
        action={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/entries/new">Aggiungi movimento</Link>
          </Button>
        }
      />

      <SummaryCards
        totalRealSpent={summary.totalRealSpent}
        totalAlternativeCost={summary.totalAlternativeCost}
        totalSaved={summary.totalSaved}
        entriesCount={summary.entriesCount}
      />

      {recentEntries.length > 0 ? (
        <RecentEntries entries={recentEntries} />
      ) : (
        <DashboardEmptyState />
      )}
    </main>
  );
}
