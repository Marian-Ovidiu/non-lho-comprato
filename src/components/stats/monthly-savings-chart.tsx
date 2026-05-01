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
    <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
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
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg">
      <p className="text-sm font-semibold text-zinc-950">
        {label ? `Mese: ${label}` : "Mese"}
      </p>
      <p className="mt-1 text-sm text-zinc-600">
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
    <Card className="overflow-hidden border-zinc-200/80 shadow-sm">
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <CardTitle>Risparmio mensile</CardTitle>
        <p className="text-sm text-zinc-500">
          Come sta andando il risparmio mese per mese.
        </p>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {chartData.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={280}
              initialDimension={{ width: 0, height: 0 }}
            >
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={16}
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatMonthLabel}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatMoney(Number(value))}
                />
                <Tooltip content={<MonthlyTooltip />} />
                <Line
                  type="monotone"
                  dataKey="totalSaved"
                  stroke="#059669"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#059669" }}
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
