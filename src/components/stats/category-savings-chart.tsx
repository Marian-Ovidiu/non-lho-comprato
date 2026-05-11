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
    <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-border bg-surface-muted px-4 text-center text-sm text-muted-text sm:h-[240px]">
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
      <CardHeader className="space-y-1 p-4 pb-0 sm:p-5">
        <CardTitle className="text-base">Risparmio per categoria</CardTitle>
        <p className="text-sm text-muted-text">
          Le categorie che ti fanno tenere più soldi in tasca.
        </p>
      </CardHeader>
      <CardContent className="p-4 pt-3 sm:p-5 sm:pt-3">
        {chartData.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="h-[250px] w-full sm:h-[290px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={250}
              initialDimension={{ width: 0, height: 0 }}
            >
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="categoryName"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  minTickGap={8}
                  tick={{ fontSize: 12 }}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
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

