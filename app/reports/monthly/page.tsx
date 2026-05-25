export const dynamic = "force-dynamic";

import Link from "next/link";

import {
  getAvailableReportMonths,
  getMonthlyReport,
} from "@/src/actions/reports";
import { getCategories } from "@/src/actions/entries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/src/components/layout/page-header";
import { MonthSelector } from "@/src/components/reports/month-selector";
import { MonthlyAnalyticsPanel } from "@/src/components/reports/monthly-analytics-panel";

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
    <main className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Report"
        context="Riepilogo del mese selezionato con filtro categoria e lettura per persona."
        action={<MonthSelector months={months} selectedMonth={selectedMonth} compact />}
      />

      {report.hasData ? (
        <div className="space-y-4">
          <MonthlyAnalyticsPanel report={report} categories={categories} />

          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
                Serie
              </h2>
              <p className="text-sm text-muted-text dark:text-muted-text">
                Quanto siete stati costanti in questo mese.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border shadow-sm dark:border-border">
                <CardHeader className="space-y-2 p-5 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium text-muted-text dark:text-muted-text">
                      Miglior streak
                    </CardTitle>
                    <Badge variant="secondary">Massimo</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-3xl font-semibold tracking-tight text-foreground dark:text-foreground">
                    {report.streakSummary.bestStreak}
                  </p>
                  <p className="text-sm text-muted-text dark:text-muted-text">
                    Giorni consecutivi con risparmio.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm dark:border-border">
                <CardHeader className="space-y-2 p-5 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium text-muted-text dark:text-muted-text">
                      Streak attuale
                    </CardTitle>
                    <Badge variant="secondary">Ora</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-3xl font-semibold tracking-tight text-foreground dark:text-foreground">
                    {report.streakSummary.currentStreak}
                  </p>
                  <p className="text-sm text-muted-text dark:text-muted-text">
                    La serie in corso nel mese selezionato.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
                Abitudini
              </h2>
              <p className="text-sm text-muted-text dark:text-muted-text">
                Quante abitudini sono state portate a termine o saltate.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-border shadow-sm dark:border-border">
                <CardHeader className="space-y-2 p-5 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium text-muted-text dark:text-muted-text">
                      Completate
                    </CardTitle>
                    <Badge variant="secondary">{report.habitsSummary.completed}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-sm text-muted-text dark:text-muted-text">
                    Occorrenze segnate come spese o evitate.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm dark:border-border">
                <CardHeader className="space-y-2 p-5 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium text-muted-text dark:text-muted-text">
                      Saltate
                    </CardTitle>
                    <Badge variant="secondary">{report.habitsSummary.skipped}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-sm text-muted-text dark:text-muted-text">
                    Occorrenze segnate come saltate.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      ) : (
        <Card className="border-border shadow-sm dark:border-border">
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
                Nessun report disponibile ancora.
              </h2>
              <p className="text-sm leading-6 text-muted-text dark:text-muted-text">
                Appena ci saranno movimenti nel mese selezionato, il riepilogo
                comparirà qui.
              </p>
            </div>

            <Button asChild className="w-full sm:w-auto">
              <Link href="/entries/new">Aggiungi movimento</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
