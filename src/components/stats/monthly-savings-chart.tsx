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

export function MonthlySavingsChart({ data }: MonthlySavingsChartProps) {
  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
  const last12 = sorted.slice(-12);
  const maxMetric = Math.max(
    ...last12.flatMap((month) => [month.totalRealSpent, month.totalSaved]),
    1,
  );
  const activeMonth = last12.at(-1)?.month;
  const currentMonth = last12.at(-1);

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-surface p-[18px]">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Ultimi 12 mesi
        </p>
        <span className="text-right text-[11px] text-muted-foreground">
          <span className="font-num" style={{ color: "var(--text-3)" }}>
            spese e risparmi
          </span>
        </span>
      </div>

      {last12.length === 0 ? (
        <div className="flex min-h-[132px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-surface-muted/60 text-sm text-muted-foreground">
          Nessun dato mensile ancora disponibile.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {last12.map((month) => {
              const isActive = month.month === activeMonth;
              const spentWidth =
                maxMetric > 0 ? (month.totalRealSpent / maxMetric) * 100 : 0;
              const savedWidth =
                maxMetric > 0 ? (month.totalSaved / maxMetric) * 100 : 0;

              return (
                <div key={month.month} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p
                      className="min-w-[3.5rem] text-sm font-medium"
                      style={{
                        color: isActive ? "var(--foreground)" : "var(--text-3)",
                      }}
                    >
                      {month.label}
                    </p>
                    <p className="text-right text-[11px] leading-5 text-muted-foreground">
                      <span className="font-num font-semibold text-foreground">
                        {formatMoney(month.totalRealSpent)}
                      </span>{" "}
                      spesi
                      <span className="mx-1.5 text-border">·</span>
                      <span className="font-num font-semibold text-accent">
                        {formatMoney(month.totalSaved)}
                      </span>{" "}
                      risp.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="h-1.5 rounded-full bg-surface-muted">
                      <div
                        className="h-1.5 rounded-full bg-muted-foreground/70"
                        style={{ width: `${Math.max(spentWidth, month.totalRealSpent > 0 ? 4 : 0)}%` }}
                        title={`${month.label}: ${formatMoney(month.totalRealSpent)} spesi`}
                      />
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-muted">
                      <div
                        className="h-1.5 rounded-full bg-accent"
                        style={{ width: `${Math.max(savedWidth, month.totalSaved > 0 ? 4 : 0)}%` }}
                        title={`${month.label}: ${formatMoney(month.totalSaved)} risparmiati`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {currentMonth ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="font-num font-semibold text-foreground">
                {formatMoney(currentMonth.totalRealSpent)}
              </span>
              <span>spesi in {currentMonth.label}</span>
              <span>·</span>
              <span className="font-num font-semibold text-accent">
                {formatMoney(currentMonth.totalSaved)}
              </span>
              <span>risparmiati</span>
              <span>·</span>
              <span>{currentMonth.entriesCount} movimenti</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
