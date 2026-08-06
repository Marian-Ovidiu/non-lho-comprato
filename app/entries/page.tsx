import { unstable_rethrow } from "next/navigation";

import { getWorkspaceCategories } from "@/src/actions/categories";
import { getDashboardSummary, getEntriesPage } from "@/src/actions/entries";
import { getMonthlyStats } from "@/src/actions/stats";
import { CraftedEntryList } from "@/src/components/entries/crafted-entry-list";
import { CraftedEntriesHeader } from "@/src/components/entries/crafted-entries-header";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { getCurrentWorkspaceLanguage, getCurrentWorkspaceMembers, getCurrentWorkspaceTimezone } from "@/src/lib/workspace-context";
import { getTranslations, languageToLocale } from "@/src/lib/i18n";
import { formatMonthLabel, normalizeMonthKey } from "@/src/lib/workspace-dates";


type EntriesPageProps = {
  searchParams: Promise<{
    month?: string | string[];
  }>;
};

function getFirstSearchParamValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getNewEntryHref(monthKey: string) {
  return `/entries/new?returnTo=${encodeURIComponent(`/entries?month=${monthKey}`)}`;
}

function getDateFromMonthKey(monthKey: string) {
  const [yearPart, monthPart] = monthKey.split("-");
  return new Date(Date.UTC(Number(yearPart), Number(monthPart) - 1, 1));
}

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

export default async function EntriesPage({ searchParams }: EntriesPageProps) {
  const [language, timeZone, resolvedSearchParams] = await Promise.all([
    getCurrentWorkspaceLanguage(),
    getCurrentWorkspaceTimezone(),
    searchParams,
  ]);
  const t = getTranslations(language);
  const selectedMonthKey = normalizeMonthKey(
    timeZone,
    getFirstSearchParamValue(resolvedSearchParams.month),
  );
  const selectedMonthDate = getDateFromMonthKey(selectedMonthKey);
  const newEntryHref = getNewEntryHref(selectedMonthKey);
  const membersPromise = getCurrentWorkspaceMembers();
  let entriesPage: Awaited<ReturnType<typeof getEntriesPage>> | null = null;
  let monthSummary: Awaited<ReturnType<typeof getDashboardSummary>> | null = null;
  let monthlyStats: Awaited<ReturnType<typeof getMonthlyStats>> = [];
  let categories: Awaited<ReturnType<typeof getWorkspaceCategories>> = [];
  let loadError: string | null = null;

  try {
    [entriesPage, monthSummary, monthlyStats, categories] = await Promise.all([
      getEntriesPage({ limit: 20, members: membersPromise, monthKey: selectedMonthKey }),
      getDashboardSummary(selectedMonthKey),
      getMonthlyStats(),
      getWorkspaceCategories(),
    ]);
  } catch (error) {
    unstable_rethrow(error);
    loadError = formatEntryLoadError(error);
    console.error("Failed to load entries:", error);
  }

  const monthLabel = getMonthLabel(selectedMonthDate, language);
  const yearLabel = getYearLabel(selectedMonthDate, language);
  const monthOptions = [
    ...monthlyStats.map((item) => ({
      month: item.month,
      label: item.label,
      entriesCount: item.entriesCount,
    })),
    ...(monthlyStats.some((item) => item.month === selectedMonthKey)
      ? []
      : [
          {
            month: selectedMonthKey,
            label: formatMonthLabel(selectedMonthKey),
            entriesCount: monthSummary?.entriesCount ?? 0,
          },
        ]),
  ].sort((left, right) => right.month.localeCompare(left.month));
  const previousMonth = monthlyStats.at(-2);

  return (
    <>
      <CraftedEntriesHeader
        monthLabel={monthLabel}
        yearLabel={yearLabel}
        monthCode={getMonthCode(selectedMonthDate)}
        selectedMonthKey={selectedMonthKey}
        monthOptions={monthOptions}
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
        key={selectedMonthKey}
        initialEntries={entriesPage?.entries ?? []}
        initialNextCursor={entriesPage?.nextCursor ?? null}
        initialHasMore={entriesPage?.hasMore ?? false}
        newEntryHref={newEntryHref}
        monthLabel={monthLabel}
        monthKey={selectedMonthKey}
        categories={categories
          .filter((category) => category.archivedAt == null)
          .map((category) => ({
            id: category.id,
            name: category.name,
            slug: category.slug,
          }))}
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
