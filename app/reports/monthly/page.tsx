
import {
  getAvailableReportMonths,
  getMonthlyReport,
} from "@/src/actions/reports";
import { unstable_rethrow } from "next/navigation";
import { getCategories } from "@/src/actions/entries";
import { CraftedMonthlyReportDetail } from "@/src/components/reports/crafted-monthly-report-detail";
import { CraftedMonthlyReportExtras } from "@/src/components/reports/crafted-monthly-report-extras";
import { CraftedMonthlyReportHeader } from "@/src/components/reports/crafted-monthly-report-header";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";

type MonthlyReportPageProps = {
  searchParams: Promise<{
    month?: string | string[];
  }>;
};

function getMonthParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MonthlyReportPage({
  searchParams,
}: MonthlyReportPageProps) {
  const resolvedSearchParams = await searchParams;
  const monthParam = getMonthParam(resolvedSearchParams.month);

  let loadError: string | null = null;
  let months: Awaited<ReturnType<typeof getAvailableReportMonths>> = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let report: Awaited<ReturnType<typeof getMonthlyReport>>["report"] | null = null;
  let selectedMonth = monthParam ?? "";

  try {
    [months, categories] = await Promise.all([
      getAvailableReportMonths(),
      getCategories(),
    ]);
    selectedMonth = monthParam ?? months[0]?.value ?? "";
    ({ report } = await getMonthlyReport(selectedMonth, months));
  } catch (error) {
    unstable_rethrow(error);
    loadError = formatEntryLoadError(error);
    console.error("Failed to load monthly report page:", error);
  }

  if (loadError || !report) {
    return (
      <main className="space-y-6 pb-6">
        <div className="px-5 pt-5">
          <DataLoadErrorBanner
            title="Impossibile caricare il report mensile"
            message={loadError ?? "Report non disponibile. Riprova tra poco."}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 pb-6">
      <CraftedMonthlyReportHeader
        report={report}
        months={months}
        selectedMonth={selectedMonth}
      />

      {report.hasData ? (
        <>
          <CraftedMonthlyReportDetail report={report} categories={categories} />

          <CraftedMonthlyReportExtras
            bestStreak={report.streakSummary.bestStreak}
            currentStreak={report.streakSummary.currentStreak}
            habitsCompleted={report.habitsSummary.completed}
            habitsSkipped={report.habitsSummary.skipped}
          />
        </>
      ) : null}
    </main>
  );
}
