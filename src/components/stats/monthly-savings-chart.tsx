"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";
import { spacing } from "@/src/lib/spacing";

type MonthlySavingsChartProps = {
  data: Array<{
    month: string;
    label: string;
    totalRealSpent: number;
    totalAlternativeCost: number;
    totalSaved: number;
    entriesCount: number;
  }>;
};

function EmptyChart() {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-3xl border border-dashed border-border/70 bg-surface-muted/60 px-4 text-center text-sm leading-6 text-muted-text sm:h-[300px]">
      Nessun dato mensile ancora disponibile.
    </div>
  );
}

function formatMonthLabel(value: string): string {
  return value;
}

function MonthlyTooltip({
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
        {label ? `Mese: ${label}` : "Mese"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Risparmiato: <span className="font-semibold">{formatMoney(saved)}</span>
      </p>
    </div>
  );
}

export function MonthlySavingsChart({ data }: MonthlySavingsChartProps) {
  const chartData = [...data].sort((left, right) =>
    left.month.localeCompare(right.month),
  );

  return (
    <Card className="overflow-hidden border-border/60 bg-surface/85 shadow-none ring-1 ring-white/5">
      <CardHeader className={spacing.cardHeader}>
        <CardTitle className="text-base font-semibold tracking-tight text-foreground">
          Direzione nel tempo
        </CardTitle>
        <p className="text-sm leading-6 text-muted-text">
          Come si sta muovendo il risparmio mese per mese.
        </p>
      </CardHeader>
      <CardContent className={`pt-3 ${spacing.cardBody}`}>
        {chartData.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="rounded-3xl border border-border/60 bg-surface-muted/55 p-3 sm:p-4">
            <div className="h-[260px] w-full sm:h-[300px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={260}
                initialDimension={{ width: 0, height: 0 }}
              >
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeOpacity={0.38}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={16}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickMargin={10}
                    tickFormatter={formatMonthLabel}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(value) => formatMoney(Number(value))}
                  />
                  <Tooltip content={<MonthlyTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="totalSaved"
                    stroke="var(--success)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    dot={{ r: 2.5, fill: "var(--success)" }}
                    activeDot={{ r: 4.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
