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
    <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-border bg-surface-muted px-4 text-center text-sm text-muted-text sm:h-[240px]">
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
    <div className="rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-lg">
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
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="space-y-1 p-4 pb-0 sm:p-5">
        <CardTitle className="text-base">Risparmio mensile</CardTitle>
        <p className="text-sm text-muted-text">
          Come sta andando il risparmio mese per mese.
        </p>
      </CardHeader>
      <CardContent className="p-4 pt-3 sm:p-5 sm:pt-3">
        {chartData.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="h-[230px] w-full sm:h-[260px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={230}
              initialDimension={{ width: 0, height: 0 }}
            >
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={16}
                  tick={{ fontSize: 12 }}
                  tickMargin={8}
                  tickFormatter={formatMonthLabel}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatMoney(Number(value))}
                />
                <Tooltip content={<MonthlyTooltip />} />
                <Line
                  type="monotone"
                  dataKey="totalSaved"
                  stroke="var(--success)"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "var(--success)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

