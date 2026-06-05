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

function truncateCategoryLabel(value: string, maxLength = 18) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function CategoryTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const spent = payload.find((item) => item.dataKey === "totalRealSpent")?.value ?? 0;
  const saved = payload.find((item) => item.dataKey === "totalSaved")?.value ?? 0;

  return (
    <div className="rounded-2xl border border-border/70 bg-popover px-3 py-3 text-popover-foreground shadow-[0_18px_40px_-28px_rgba(0,0,0,0.75)]">
      <p className="text-sm font-semibold text-popover-foreground">
        {label ?? "Categoria"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Speso: <span className="font-semibold text-foreground">{formatMoney(spent)}</span>
      </p>
      <p className="text-sm text-muted-foreground">
        Risparmiato: <span className="font-semibold text-success">{formatMoney(saved)}</span>
      </p>
    </div>
  );
}

export function CategorySavingsChartDesktop({
  data,
}: CategorySavingsChartProps) {
  const chartData = [...data]
    .sort((left, right) => right.totalSaved - left.totalSaved)
    .slice(0, 8);

  return (
    <div className="rounded-3xl border border-border/60 bg-surface-muted/55 p-3 sm:p-4">
      <div className="h-[320px] w-full sm:h-[360px]">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={320}
          initialDimension={{ width: 0, height: 0 }}
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            barCategoryGap="18%"
            barGap={4}
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
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(value) => formatMoney(Number(value))}
            />
            <YAxis
              type="category"
              dataKey="categoryName"
              tickLine={false}
              axisLine={false}
              width={92}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={truncateCategoryLabel}
            />
            <Tooltip content={<CategoryTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            />
            <Bar
              dataKey="totalRealSpent"
              name="Speso"
              fill="var(--muted-foreground)"
              radius={[0, 6, 6, 0]}
              maxBarSize={14}
            />
            <Bar
              dataKey="totalSaved"
              name="Risparmiato"
              fill="var(--success)"
              radius={[0, 6, 6, 0]}
              maxBarSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
