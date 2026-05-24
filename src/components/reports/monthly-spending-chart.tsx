"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";
import { spacing } from "@/src/lib/spacing";
import type { MonthlyReportAnalyticsUser } from "@/src/lib/monthly-report-analytics";

type MonthlySpendingChartProps = {
  users: MonthlyReportAnalyticsUser[];
  selectedCategoryLabel: string;
  hasData: boolean;
};

function SpendingTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const personalSpend = payload.find((item) => item.dataKey === "personalSpend")?.value ?? 0;
  const sharedSpend = payload.find((item) => item.dataKey === "sharedSpend")?.value ?? 0;
  const totalPaid = personalSpend + sharedSpend;

  return (
    <div className="rounded-2xl border border-border/70 bg-popover px-3 py-3 text-popover-foreground shadow-[0_18px_40px_-28px_rgba(0,0,0,0.75)]">
      <p className="text-sm font-semibold text-popover-foreground">
        {label ?? "Persona"}
      </p>
      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        <p>
          Personale: <span className="font-semibold">{formatMoney(personalSpend)}</span>
        </p>
        <p>
          Condivisa: <span className="font-semibold">{formatMoney(sharedSpend)}</span>
        </p>
        <p>
          Totale: <span className="font-semibold">{formatMoney(totalPaid)}</span>
        </p>
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-3xl border border-dashed border-border/70 bg-surface-muted/60 px-4 text-center text-sm leading-6 text-muted-text sm:h-[320px]">
      Nessuna spesa in {label.toLowerCase()} per questo mese.
    </div>
  );
}

export function MonthlySpendingChart({
  users,
  selectedCategoryLabel,
  hasData,
}: MonthlySpendingChartProps) {
  const chartData = [...users].sort(
    (left, right) => right.totalPaid - left.totalPaid || left.label.localeCompare(right.label, "it"),
  );

  return (
    <Card className="overflow-hidden border-border shadow-sm dark:border-border">
      <CardHeader className={spacing.cardHeader}>
        <CardTitle className="text-base text-foreground dark:text-foreground">
          Spesa per persona
        </CardTitle>
        <p className="text-sm leading-6 text-muted-text dark:text-muted-text">
          Personale e condivisa, nella selezione attiva.
        </p>
      </CardHeader>
      <CardContent className={`${spacing.cardBody} pt-3`}>
        {!hasData ? (
          <EmptyChart label={selectedCategoryLabel} />
        ) : (
          <div className="rounded-3xl border border-border/60 bg-surface-muted/55 p-3 sm:p-4">
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
                  layout="vertical"
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  barCategoryGap="18%"
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeOpacity={0.38}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(value) => formatMoney(Number(value))}
                  />
                  <YAxis
                    dataKey="label"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={88}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip content={<SpendingTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="left"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: 8 }}
                  />
                  <Bar
                    dataKey="personalSpend"
                    name="Personale"
                    stackId="spend"
                    fill="var(--primary)"
                    radius={[0, 8, 8, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="sharedSpend"
                    name="Condivisa"
                    stackId="spend"
                    fill="var(--success)"
                    radius={[0, 8, 8, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
