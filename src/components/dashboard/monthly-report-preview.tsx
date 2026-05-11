import Link from "next/link";
import { BarChart3, ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";

type MonthlyReportPreviewProps = {
  report: {
    hasData: boolean;
    label: string;
    overview: {
      totalSaved: number;
    };
    bestCategory: {
      name: string;
    } | null;
    biggestSaving: {
      title: string;
      savedAmount: number;
    } | null;
  } | null;
};

export function MonthlyReportPreview({ report }: MonthlyReportPreviewProps) {
  if (!report || !report.hasData) {
    return (
      <Card className="overflow-hidden border-zinc-200/80 shadow-sm dark:border-zinc-800">
        <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
              <BarChart3 className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base text-zinc-950 dark:text-zinc-50">
                Questo mese
              </CardTitle>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Nessun report disponibile.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-4 sm:p-6 sm:pt-4">
          <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Appena arrivano movimenti nel mese in corso, qui comparirà un
            riassunto rapido.
          </p>
          <Button asChild className="mt-4 w-full sm:w-auto">
            <Link href="/reports/monthly">Apri report mensile</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-zinc-200/80 shadow-sm dark:border-zinc-800">
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                Questo mese
              </p>
              <CardTitle className="text-base text-zinc-950 dark:text-zinc-50">
                {report.label}
              </CardTitle>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/reports/monthly">
              Apri
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5 pt-4 sm:p-6 sm:pt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
              Risparmiato
            </p>
            <p className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {formatMoney(report.overview.totalSaved)}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
              Categoria top
            </p>
            <p className="mt-1 truncate text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {report?.bestCategory?.name ?? "Nessuna"}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
              Schivata top
            </p>
            <p className="mt-1 truncate text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {report?.biggestSaving?.title ?? "Nessuna"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/30">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            Insight veloce
          </p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            {report.biggestSaving
              ? `${formatMoney(report.biggestSaving.savedAmount)} risparmiati con ${report.biggestSaving.title}.`
              : "Nessuna schivata di rilievo ancora registrata."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
