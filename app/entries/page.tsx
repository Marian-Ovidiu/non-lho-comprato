import { unstable_rethrow } from "next/navigation";

import { getDashboardSummary, getEntriesPage } from "@/src/actions/entries";
import { getMonthlyStats } from "@/src/actions/stats";
import { CraftedEntryList } from "@/src/components/entries/crafted-entry-list";
import { CraftedEntriesHeader } from "@/src/components/entries/crafted-entries-header";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { getCurrentWorkspaceLanguage, getCurrentWorkspaceMembers } from "@/src/lib/workspace-context";
import { getTranslations, languageToLocale } from "@/src/lib/i18n";


const newEntryHref = "/entries/new?returnTo=%2Fentries";

function getMonthLabel(date: Date, language: string) {
  const label = new Intl.DateTimeFormat(languageToLocale(language), {
    month: "long",
    timeZone: "Europe/Rome",
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getYearLabel(date: Date, language: string) {
  return new Intl.DateTimeFormat(languageToLocale(language), {
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(date);
}

function getMonthCode(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    month: "2-digit",
    year: "2-digit",
    timeZone: "Europe/Rome",
  }).format(date);
}

export default async function EntriesPage() {
  const language = await getCurrentWorkspaceLanguage();
  const t = getTranslations(language);
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
    unstable_rethrow(error);
    loadError = formatEntryLoadError(error);
    console.error("Failed to load entries:", error);
  }

  const now = new Date();
  const monthLabel = getMonthLabel(now, language);
  const yearLabel = getYearLabel(now, language);
  const previousMonth = monthlyStats.at(-2);

  return (
    <>
      <CraftedEntriesHeader
        monthLabel={monthLabel}
        yearLabel={yearLabel}
        monthCode={getMonthCode(now)}
        entriesCount={monthSummary?.entriesCount ?? 0}
        totalRealSpent={monthSummary?.ordinarySpent ?? monthSummary?.totalRealSpent ?? 0}
        totalAvoided={monthSummary?.avoidedAmount ?? 0}
        totalSaved={monthSummary?.comparisonSaved ?? 0}
        newEntryHref={newEntryHref}
      />

      {loadError ? (
        <div className="px-5 pb-4">
          <DataLoadErrorBanner
            title={t.entries.pageLoadError}
            message={loadError}
          />
        </div>
      ) : null}

      <CraftedEntryList
        initialEntries={entriesPage?.entries ?? []}
        initialNextCursor={entriesPage?.nextCursor ?? null}
        initialHasMore={entriesPage?.hasMore ?? false}
        newEntryHref={newEntryHref}
        monthLabel={monthLabel}
        previousMonthSummary={
          previousMonth
            ? {
                label: previousMonth.label,
                totalRealSpent: previousMonth.totalRealSpent,
                totalSaved: previousMonth.totalSaved,
                entriesCount: previousMonth.entriesCount,
              }
            : null
        }
      />
    </>
  );
}
