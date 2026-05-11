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

function EmptyChart() {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-border bg-surface-muted text-sm text-muted-text">
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
    <div className="rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-lg">
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
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <CardTitle>Risparmio per categoria</CardTitle>
        <p className="text-sm text-muted-text">
          Le categorie che ti fanno tenere più soldi in tasca.
        </p>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {chartData.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={320}
              initialDimension={{ width: 0, height: 0 }}
            >
              <BarChart
                data={chartData}
                margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="categoryName"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  minTickGap={8}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatMoney(Number(value))}
                />
                <Tooltip content={<CategoryTooltip />} />
                <Bar dataKey="totalSaved" fill="var(--success)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

