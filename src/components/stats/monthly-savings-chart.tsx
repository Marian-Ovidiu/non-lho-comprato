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

function getMonthInitial(label: string): string {
  return label.charAt(0).toUpperCase();
}

export function MonthlySavingsChart({ data }: MonthlySavingsChartProps) {
  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
  const last12 = sorted.slice(-12);
  const maxSaved = Math.max(...last12.map((m) => m.totalSaved), 1);
  const activeMonth = last12.at(-1)?.month;

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-surface p-[18px]">
      <div className="mb-3.5 flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Ultimi 12 mesi
        </p>
        <span className="font-num text-[11px]" style={{ color: "var(--text-3)" }}>
          max {formatMoney(maxSaved)}
        </span>
      </div>

      {last12.length === 0 ? (
        <div className="flex h-[132px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-surface-muted/60 text-sm text-muted-foreground">
          Nessun dato mensile ancora disponibile.
        </div>
      ) : (
        <>
          {/* Bar chart */}
          <div className="flex h-[132px] items-end gap-1.5">
            {last12.map((m) => {
              const isActive = m.month === activeMonth;
              const heightPct = maxSaved > 0 ? (m.totalSaved / maxSaved) * 100 : 0;
              return (
                <div
                  key={m.month}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <div
                    className="w-full rounded-[4px]"
                    style={{
                      height: `${Math.max(heightPct, 3)}%`,
                      background: isActive ? "var(--accent)" : "var(--surface-muted)",
                      minHeight: 4,
                    }}
                    title={`${m.label}: ${formatMoney(m.totalSaved)}`}
                  />
                  <span
                    className="text-[10px] leading-none"
                    style={{
                      color: isActive ? "var(--foreground)" : "var(--text-3)",
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {getMonthInitial(m.label)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Summary row for current month */}
          {last12.at(-1) ? (
            <div className="mt-4 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="font-num font-semibold text-accent">
                {formatMoney(last12.at(-1)!.totalSaved)}
              </span>
              <span>{last12.at(-1)!.label}</span>
              <span>·</span>
              <span>{last12.at(-1)!.entriesCount} movimenti</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
