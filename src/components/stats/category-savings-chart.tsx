"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";
import { spacing } from "@/src/lib/spacing";

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

function truncateCategoryLabel(value: string, maxLength = 14) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

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

function CategoryTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const saved = payload[0]?.value ?? 0;

  return (
    <div className="rounded-2xl border border-border/70 bg-popover px-3 py-3 text-popover-foreground shadow-[0_18px_40px_-28px_rgba(0,0,0,0.75)]">
      <p className="text-sm font-semibold text-popover-foreground">
        {label ?? "Categoria"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Risparmiato: <span className="font-semibold">{formatMoney(saved)}</span>
      </p>
    </div>
  );
}

export function CategorySavingsChart({ data }: CategorySavingsChartProps) {
  const chartData = [...data]
    .sort((left, right) => right.totalSaved - left.totalSaved)
    .slice(0, 8);

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

            <div className="hidden rounded-3xl border border-border/60 bg-surface-muted/55 p-3 sm:block sm:p-4">
              <div className="h-[280px] w-full sm:h-[320px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={280}
                initialDimension={{ width: 0, height: 0 }}
              >
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeOpacity={0.38}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="categoryName"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    minTickGap={8}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickMargin={10}
                    tickFormatter={truncateCategoryLabel}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(value) => formatMoney(Number(value))}
                  />
                  <Tooltip content={<CategoryTooltip />} />
                  <Bar
                    dataKey="totalSaved"
                    fill="var(--success)"
                    radius={[10, 10, 4, 4]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
