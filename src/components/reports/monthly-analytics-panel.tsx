"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/src/lib/formatters";
import { MonthlyOverviewCards } from "@/src/components/reports/monthly-overview-cards";
import { MonthlyHighlightCard } from "@/src/components/reports/monthly-highlight-card";
import { MonthlyRecapCard } from "@/src/components/reports/monthly-recap-card";
import { MonthlySpendingChart } from "@/src/components/reports/monthly-spending-chart";
import type { CategoryOption } from "@/src/lib/categories";
import {
  buildMonthlyReportAnalyticsSnapshot,
  type MonthlyReportAnalyticsCategory,
  type MonthlyReportAnalyticsEntry,
  type MonthlyReportAnalyticsSnapshot,
} from "@/src/lib/monthly-report-analytics";
import type { MonthlyReportData } from "@/src/actions/reports";

type MonthlyAnalyticsPanelProps = {
  report: MonthlyReportData;
  categories: CategoryOption[];
};

type CategoryFilterOption = {
  value: string;
  label: string;
};

const ALL_CATEGORY_VALUE = "__all__";

function getCategoryKey(category: MonthlyReportAnalyticsCategory): string {
  return category.slug ?? category.id ?? category.name;
}

function formatSignedMoney(value: number): string {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${formatMoney(Math.abs(value))}`;
}

function formatSharePercent(value: number): string {
  return `${new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 0,
  }).format(value * 100)}%`;
}

function formatBalanceRatio(value: number): string {
  return `${new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}×`;
}

function getSummaryText({
  categoryLabel,
  snapshot,
}: {
  categoryLabel: string;
  snapshot: MonthlyReportAnalyticsSnapshot;
}): string {
  if (!snapshot.hasData) {
    return categoryLabel === "Tutte le categorie"
      ? "Nessuna spesa registrata nel mese selezionato."
      : `Nessuna spesa in ${categoryLabel.toLowerCase()} in questo mese.`;
  }

  const topUser = snapshot.users[0];
  const previousWorkspaceTotal = snapshot.users.some(
    (user) => user.previousMonthTotal !== null,
  )
    ? snapshot.users.reduce(
        (total, user) => total + (user.previousMonthTotal ?? 0),
        0,
      )
    : null;
  const workspaceDelta =
    previousWorkspaceTotal === null
      ? null
      : snapshot.totalPaidByWorkspace - previousWorkspaceTotal;
  const categoryPrefix =
    categoryLabel === "Tutte le categorie" ? "" : `${categoryLabel}: `;

  const balancedText = topUser
    ? `${topUser.label} è ${topUser.balanceLabel.toLowerCase()}.`
    : "La spesa del workspace è in equilibrio.";
  const deltaText =
    workspaceDelta === null
      ? "Il confronto col mese scorso non è disponibile."
      : workspaceDelta > 0
        ? `Rispetto al mese scorso siete sopra di ${formatSignedMoney(workspaceDelta)}.`
        : workspaceDelta < 0
          ? `Rispetto al mese scorso siete sotto di ${formatSignedMoney(workspaceDelta)}.`
          : "Rispetto al mese scorso siete allineati.";

  return `${categoryPrefix}${formatMoney(snapshot.overview.totalSaved)} tenuti in tasca. ${balancedText} ${deltaText}`;
}

function buildCategoryOptions(
  categories: CategoryOption[],
  reportEntries: MonthlyReportAnalyticsEntry[],
  previousEntries: MonthlyReportAnalyticsEntry[],
): CategoryFilterOption[] {
  const options = new Map<string, CategoryFilterOption>();

  options.set(ALL_CATEGORY_VALUE, {
    value: ALL_CATEGORY_VALUE,
    label: "Tutte le categorie",
  });

  for (const category of categories) {
    const value = category.slug ?? category.id;
    options.set(value, {
      value,
      label: category.name,
    });
  }

  for (const entry of [...reportEntries, ...previousEntries]) {
    const value = getCategoryKey(entry.category);

    if (!options.has(value)) {
      options.set(value, {
        value,
        label: entry.category.name || "Categoria eliminata",
      });
    }
  }

  return [
    options.get(ALL_CATEGORY_VALUE)!,
    ...[...options.values()]
      .filter((option) => option.value !== ALL_CATEGORY_VALUE)
      .sort((left, right) => left.label.localeCompare(right.label, "it")),
  ];
}

function MonthlyUserCard({
  user,
  hasPreviousData,
}: {
  user: MonthlyReportAnalyticsSnapshot["users"][number];
  hasPreviousData: boolean;
}) {
  return (
    <Card className="overflow-hidden border-border shadow-sm dark:border-border">
      <CardHeader className="space-y-2 p-4 pb-3 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base text-foreground dark:text-foreground">
              {user.label}
            </CardTitle>
            {hasPreviousData && user.differenceVsPreviousMonth !== null ? (
              <p
                className={cn(
                  "text-sm font-medium",
                  user.differenceVsPreviousMonth > 0
                    ? "text-foreground"
                    : user.differenceVsPreviousMonth < 0
                      ? "text-success"
                      : "text-muted-text",
                )}
              >
                {user.differenceVsPreviousMonth > 0 ? "↑" : user.differenceVsPreviousMonth < 0 ? "↓" : "→"}{" "}
                {formatSignedMoney(user.differenceVsPreviousMonth)} vs mese scorso
              </p>
            ) : (
              <p className="text-sm text-muted-text dark:text-muted-text">
                Confronto mese precedente non disponibile.
              </p>
            )}
          </div>

          <Badge variant="outline" className="shrink-0">
            {formatBalanceRatio(user.balanceRatio)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-4 pt-0 sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-text dark:text-muted-text">
              Totale pagato
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground dark:text-foreground">
              {formatMoney(user.totalPaid)}
            </p>
          </div>

          <Badge variant="secondary" className="shrink-0">
            {user.balanceLabel}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-border bg-surface-muted p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-text dark:text-muted-text">
              Personale
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground dark:text-foreground">
              {formatMoney(user.personalSpend)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-muted p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-text dark:text-muted-text">
              Condivisa
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground dark:text-foreground">
              {formatMoney(user.sharedSpend)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm text-muted-text dark:text-muted-text">
          <span>Quota condivisa</span>
          <span className="font-medium text-foreground dark:text-foreground">
            {formatSharePercent(user.sharedPercentage)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function MonthlyAnalyticsPanel({
  report,
  categories,
}: MonthlyAnalyticsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY_VALUE);

  const categoryOptions = useMemo(
    () => buildCategoryOptions(categories, report.entries, report.previousMonthEntries),
    [categories, report.entries, report.previousMonthEntries],
  );

  const selectedCategoryLabel = useMemo(() => {
    return (
      categoryOptions.find((option) => option.value === selectedCategory)?.label ??
      "Tutte le categorie"
    );
  }, [categoryOptions, selectedCategory]);

  const filteredEntries = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY_VALUE) {
      return report.entries;
    }

    return report.entries.filter(
      (entry) => getCategoryKey(entry.category) === selectedCategory,
    );
  }, [report.entries, selectedCategory]);

  const filteredPreviousEntries = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY_VALUE) {
      return report.previousMonthEntries;
    }

    return report.previousMonthEntries.filter(
      (entry) => getCategoryKey(entry.category) === selectedCategory,
    );
  }, [report.previousMonthEntries, selectedCategory]);

  const snapshot = useMemo(
    () =>
      buildMonthlyReportAnalyticsSnapshot(
        filteredEntries,
        filteredPreviousEntries,
        report.members,
      ),
    [filteredEntries, filteredPreviousEntries, report.members],
  );

  const summaryText = useMemo(
    () =>
      getSummaryText({
        categoryLabel: selectedCategoryLabel,
        snapshot,
      }),
    [selectedCategoryLabel, snapshot],
  );

  const hasFilteredData = snapshot.hasData;
  const hasPreviousData = filteredPreviousEntries.length > 0;

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm dark:border-border dark:bg-surface-muted sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="monthly-category">Categoria</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="monthly-category" className="h-10 w-full rounded-xl">
                <SelectValue placeholder="Tutte le categorie" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value || "all"} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm leading-6 text-muted-text dark:border-border dark:bg-background/40">
            {summaryText}
          </div>
        </div>
      </div>

      {hasFilteredData ? (
        <div className="space-y-4">
          <MonthlyOverviewCards overview={snapshot.overview} />

          <MonthlySpendingChart
            users={snapshot.users}
            selectedCategoryLabel={selectedCategoryLabel}
            hasData={hasFilteredData}
          />

          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
                Per persona
              </h2>
              <p className="text-sm text-muted-text dark:text-muted-text">
                Spesa personale e condivisa nella selezione corrente.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {snapshot.users.map((user) => (
                <MonthlyUserCard
                  key={user.userId}
                  user={user}
                  hasPreviousData={hasPreviousData}
                />
              ))}
            </div>
          </section>

          <MonthlyHighlightCard
            bestCategory={snapshot.bestCategory}
            worstCategory={snapshot.worstCategory}
            biggestSaving={snapshot.biggestSaving}
          />

          <MonthlyRecapCard recapText={summaryText} />
        </div>
      ) : (
        <Card className="border-border shadow-sm dark:border-border">
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
                {selectedCategory === ALL_CATEGORY_VALUE
                  ? "Nessuna spesa disponibile ancora."
                  : `Nessuna spesa in ${selectedCategoryLabel.toLowerCase()} questo mese.`}
              </h2>
              <p className="text-sm leading-6 text-muted-text dark:text-muted-text">
                {selectedCategory === ALL_CATEGORY_VALUE
                  ? "Appena ci saranno movimenti, qui compariranno i segnali principali del mese."
                  : "Cambia categoria per leggere un altro segmento del mese."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
