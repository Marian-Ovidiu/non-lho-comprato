"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";
import { spacing } from "@/src/lib/spacing";

const CategorySavingsChartDesktop = dynamic(
  () =>
    import("@/src/components/stats/category-savings-chart-desktop").then(
      (module) => module.CategorySavingsChartDesktop,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

type CategorySavingsChartProps = {
  data: Array<{
    categoryId: string;
    categoryName: string;
    categorySlug: string;
    totalRealSpent: number;
    totalAlternativeCost: number;
    totalSaved: number;
    entriesCount: number;
    averageSaved: number;
  }>;
};

function MobileCategoryList({
  data,
}: {
  data: CategorySavingsChartProps["data"];
}) {
  const chartData = [...data]
    .sort((left, right) => right.totalSaved - left.totalSaved)
    .slice(0, 8);
  const maxSaved = Math.max(...chartData.map((item) => item.totalSaved), 0);

  return (
    <div className="space-y-2 sm:hidden">
      {chartData.map((item) => {
        const width = maxSaved > 0 ? (item.totalSaved / maxSaved) * 100 : 0;

        return (
          <div
            key={item.categoryId}
            className="rounded-2xl border border-border/70 bg-background/70 p-3"
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.categoryName}
                </p>
                <p className="text-xs text-muted-text">
                  {item.entriesCount} movimenti
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-success">
                {formatMoney(item.totalSaved)}
              </p>
            </div>

            <div className="mt-2 h-2 rounded-full bg-surface-muted">
              <div
                className="h-2 rounded-full bg-success"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-3xl border border-dashed border-border/70 bg-surface-muted/60 px-4 text-center text-sm leading-6 text-muted-text sm:h-[320px]">
      Nessun dato per categoria ancora disponibile.
    </div>
  );
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");

    const update = () => setIsDesktop(media.matches);
    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return isDesktop;
}

export function CategorySavingsChart({ data }: CategorySavingsChartProps) {
  const chartData = [...data]
    .sort((left, right) => right.totalSaved - left.totalSaved)
    .slice(0, 8);
  const isDesktop = useIsDesktop();

  return (
    <Card className="overflow-hidden border-border/60 bg-surface/85 shadow-none ring-1 ring-white/5">
      <CardHeader className={spacing.cardHeader}>
        <CardTitle className="text-base font-semibold tracking-tight text-foreground">
          Categorie che contano
        </CardTitle>
        <p className="text-sm leading-6 text-muted-text">
          Le categorie che ti stanno lasciando più soldi in tasca.
        </p>
      </CardHeader>
      <CardContent className={`pt-3 ${spacing.cardBody}`}>
        {chartData.length === 0 ? (
          <EmptyChart />
        ) : (
          <>
            <MobileCategoryList data={chartData} />

            <div className="hidden min-h-[280px] sm:block sm:min-h-[320px]">
              {isDesktop ? (
                <CategorySavingsChartDesktop data={chartData} />
              ) : (
                <div className="rounded-3xl border border-border/60 bg-surface-muted/55 p-3 sm:p-4">
                  <div className="h-[280px] w-full animate-pulse rounded-2xl bg-background/60 sm:h-[320px]" />
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
