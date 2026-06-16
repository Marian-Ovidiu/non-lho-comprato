"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";
import { spacing } from "@/src/lib/spacing";
import { useCurrencyCode } from "@/src/components/currency/currency-context";
import { useTranslations } from "@/src/components/language/language-context";

type MonthlyReportPreviewProps = {
  report: {
    hasData: boolean;
    label: string;
    overview: {
      totalRealSpent?: number;
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
  const t = useTranslations();
  const currencyCode = useCurrencyCode();
  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className={spacing.cardHeader}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-accent text-background">
              {report?.hasData ? (
                <Sparkles className="size-4" aria-hidden="true" />
              ) : (
                <BarChart3 className="size-4" aria-hidden="true" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-text">
                {t.monthlyReportPreview.thisMonth}
              </p>
              <CardTitle className="text-base text-foreground">
                {report?.label ?? t.monthlyReportPreview.noReport}
              </CardTitle>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/reports/monthly">
              {t.monthlyReportPreview.openReport}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className={`space-y-3 ${spacing.cardBodyCompact}`}>
        {!report || !report.hasData ? (
          <p className="text-sm leading-5 text-muted-text">
            {t.monthlyReportPreview.noData}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-text">
                {t.monthlyReportPreview.spentLabel}
              </p>
              <p className="mt-1 text-base font-semibold text-foreground sm:text-lg">
                {formatMoney(report.overview.totalRealSpent ?? 0, currencyCode)}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-text">
                {t.monthlyReportPreview.topCategory}
              </p>
              <p className="mt-1 truncate text-base font-semibold text-foreground sm:text-lg">
                {report.bestCategory?.name ?? t.monthlyReportPreview.noCategory}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-text">
                {t.monthlyReportPreview.netImpact}
              </p>
              <p className="mt-1 truncate text-base font-semibold text-foreground sm:text-lg">
                {formatMoney(report.overview.totalSaved, currencyCode)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
