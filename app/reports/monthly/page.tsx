export const dynamic = "force-dynamic";

import {
  getAvailableReportMonths,
  getMonthlyReport,
} from "@/src/actions/reports";
import { getCategories } from "@/src/actions/entries";
import { Label } from "@/components/crafted";
import { MonthlyAnalyticsPanel } from "@/src/components/reports/monthly-analytics-panel";
import { CraftedMonthlyReportExtras } from "@/src/components/reports/crafted-monthly-report-extras";
import { CraftedMonthlyReportHeader } from "@/src/components/reports/crafted-monthly-report-header";

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
  const [months, categories] = await Promise.all([
    getAvailableReportMonths(),
    getCategories(),
  ]);
  const selectedMonth = monthParam ?? months[0]?.value ?? "";
  const { report } = await getMonthlyReport(selectedMonth, months);

  return (
    <main className="space-y-6 pb-6">
      <CraftedMonthlyReportHeader
        report={report}
        months={months}
        selectedMonth={selectedMonth}
      />

      {report.hasData ? (
        <>
          <section className="-mx-4 px-5 sm:-mx-6 lg:-mx-8">
            <Label className="mb-4 block">Dettaglio</Label>
            <MonthlyAnalyticsPanel report={report} categories={categories} />
          </section>

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
