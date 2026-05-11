export const dynamic = "force-dynamic";

import Link from "next/link";

import { getAvailableReportMonths, getMonthlyReport } from "@/src/actions/reports";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/src/components/layout/page-header";
import { MonthSelector } from "@/src/components/reports/month-selector";
import { MonthlyHighlightCard } from "@/src/components/reports/monthly-highlight-card";
import { MonthlyOverviewCards } from "@/src/components/reports/monthly-overview-cards";
import { MonthlyRecapCard } from "@/src/components/reports/monthly-recap-card";
import { PersonSplitCards } from "@/src/components/reports/person-split-cards";

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
  const months = await getAvailableReportMonths();
  const selectedMonth = monthParam ?? months[0]?.value ?? "";
  const [{ report }] = await Promise.all([getMonthlyReport(selectedMonth)]);

  return (
    <main className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Report"
        title="Report mensile"
        description="Uno sguardo a come avete trattato il portafoglio."
        action={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/entries/new">Aggiungi movimento</Link>
          </Button>
        }
      />

      <MonthSelector months={months} selectedMonth={selectedMonth} />

      {report.hasData ? (
        <div className="space-y-6">
          <MonthlyOverviewCards overview={report.overview} />

          <PersonSplitCards
            marian={report.personSplit.marian}
            martina={report.personSplit.martina}
            condivise={report.personSplit.condivise}
          />

          <MonthlyHighlightCard
            bestCategory={report.bestCategory}
            worstCategory={report.worstCategory}
            biggestSaving={report.biggestSaving}
          />

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

          <MonthlyRecapCard recapText={report.recapText} />
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

