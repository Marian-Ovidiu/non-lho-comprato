export const dynamic = "force-dynamic";

import Link from "next/link";

import { getMonthlyReport } from "@/src/actions/reports";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import { MonthlyMonthSelector } from "@/src/components/reports/monthly-month-selector";
import { MonthlyReportEmptyState } from "@/src/components/reports/monthly-report-empty-state";
import { MonthlyReportPanels } from "@/src/components/reports/monthly-report-panels";

type MonthlyReportPageProps = {
  searchParams: Promise<{
    month?: string | string[];
  }>;
};

export default async function MonthlyReportPage({
  searchParams,
}: MonthlyReportPageProps) {
  const resolvedSearchParams = await searchParams;
  const monthParam = Array.isArray(resolvedSearchParams.month)
    ? resolvedSearchParams.month[0]
    : resolvedSearchParams.month;

  const { selectedMonth, selectedMonthLabel, monthOptions, report } =
    await getMonthlyReport(monthParam);

  return (
    <main className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Report"
        title="Report mensili"
        description="Un riepilogo del mese selezionato con risparmio, abitudini e serie."
        action={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/entries/new">Aggiungi movimento</Link>
          </Button>
        }
      />

      <MonthlyMonthSelector
        selectedMonth={selectedMonth}
        monthOptions={monthOptions}
      />

      {report.hasData ? (
        <MonthlyReportPanels report={report} />
      ) : (
        <MonthlyReportEmptyState monthLabel={selectedMonthLabel} />
      )}
    </main>
  );
}
