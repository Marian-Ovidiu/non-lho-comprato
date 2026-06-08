import { cn } from "@/lib/utils";
import type {
  DailySpendingCell,
  DailySpendingComparison,
  DailySpendingMonthRow,
} from "@/src/lib/daily-spending-comparison";
import { formatMoney } from "@/src/lib/formatters";

type DailySpendingHeatmapProps = {
  data: DailySpendingComparison;
};

const DAY_AXIS = Array.from({ length: 31 }, (_, index) => index + 1);
const DAY_LABELS = [1, 5, 10, 15, 20, 25, 30];

function formatSignedMoney(value: number): string {
  const normalized = formatMoney(Math.abs(value));

  if (value > 0) {
    return `+${normalized}`;
  }

  if (value < 0) {
    return `-${normalized}`;
  }

  return normalized;
}

function getMonthAbbrev(label: string): string {
  return label.split(" ")[0]?.slice(0, 3) ?? "";
}

function hasHeatmapData(data: DailySpendingComparison): boolean {
  return (
    data.currentMonth.totalRealSpent > 0 ||
    (data.previousMonth?.totalRealSpent ?? 0) > 0
  );
}

function getSubtitle(data: DailySpendingComparison): string {
  const { currentMonth, previousMonth, monthToDateDelta } = data;
  const todayDay = currentMonth.days.find((cell) => cell.isToday)?.day;

  if (monthToDateDelta === null || !previousMonth || !todayDay) {
    return currentMonth.label;
  }

  const previousAbbrev = getMonthAbbrev(previousMonth.label).toLowerCase();

  return `${currentMonth.label} · ${formatSignedMoney(monthToDateDelta)} fino al ${todayDay} vs ${previousAbbrev}`;
}

function getIntensityLevel(spent: number, maxDailySpent: number): number {
  if (spent <= 0) {
    return 0;
  }

  const ratio = spent / maxDailySpent;

  if (ratio <= 0.2) {
    return 1;
  }

  if (ratio <= 0.4) {
    return 2;
  }

  if (ratio <= 0.6) {
    return 3;
  }

  if (ratio <= 0.8) {
    return 4;
  }

  return 5;
}

function getCellBackground(level: number): string {
  switch (level) {
    case 1:
      return "bg-muted-foreground/25";
    case 2:
      return "bg-muted-foreground/40";
    case 3:
      return "bg-muted-foreground/55";
    case 4:
      return "bg-muted-foreground/70";
    case 5:
      return "bg-muted-foreground/85";
    default:
      return "bg-surface-muted";
  }
}

function getDayDelta(
  currentCell: DailySpendingCell | null | undefined,
  previousCell: DailySpendingCell | null | undefined,
): number | null {
  if (!currentCell?.dateKey || !previousCell?.dateKey) {
    return null;
  }

  const delta = currentCell.totalRealSpent - previousCell.totalRealSpent;

  if (delta === 0) {
    return null;
  }

  return delta;
}

function getDeltaTone(delta: number | null): "warning" | "success" | null {
  if (delta === null) {
    return null;
  }

  if (delta > 0) {
    return "warning";
  }

  return "success";
}

function getMonthToDateSummary(data: DailySpendingComparison): {
  todayDay: number;
  monthAbbrev: string;
  previousAbbrev: string;
  currentTotal: number;
  previousTotal: number;
  delta: number;
} | null {
  const { currentMonth, previousMonth, monthToDateDelta } = data;

  if (!previousMonth || monthToDateDelta === null) {
    return null;
  }

  const todayDay = currentMonth.days.find((cell) => cell.isToday)?.day;
  if (!todayDay) {
    return null;
  }

  let currentTotal = 0;
  let previousTotal = 0;

  for (const cell of currentMonth.days) {
    if (cell.dateKey && cell.day <= todayDay) {
      currentTotal += cell.totalRealSpent;
    }
  }

  for (const cell of previousMonth.days) {
    if (cell.dateKey && cell.day <= todayDay) {
      previousTotal += cell.totalRealSpent;
    }
  }

  return {
    todayDay,
    monthAbbrev: getMonthAbbrev(currentMonth.label).toLowerCase(),
    previousAbbrev: getMonthAbbrev(previousMonth.label).toLowerCase(),
    currentTotal,
    previousTotal,
    delta: monthToDateDelta,
  };
}

function buildComparisonTooltip(
  currentCell: DailySpendingCell | null | undefined,
  currentAbbrev: string,
  previousCell: DailySpendingCell | null | undefined,
  previousAbbrev: string,
): string {
  if (currentCell?.dateKey && previousCell?.dateKey) {
    const delta = currentCell.totalRealSpent - previousCell.totalRealSpent;

    return `${currentCell.day} ${currentAbbrev.toLowerCase()} · ${formatMoney(currentCell.totalRealSpent)} · ${previousCell.day} ${previousAbbrev.toLowerCase()} · ${formatMoney(previousCell.totalRealSpent)} · ${formatSignedMoney(delta)}`;
  }

  if (currentCell?.dateKey) {
    return `${currentCell.day} ${currentAbbrev.toLowerCase()} · ${formatMoney(currentCell.totalRealSpent)}`;
  }

  if (previousCell?.dateKey) {
    return `${previousCell.day} ${previousAbbrev.toLowerCase()} · ${formatMoney(previousCell.totalRealSpent)}`;
  }

  return "";
}

function HeatmapCell({
  cell,
  maxDailySpent,
  tooltip,
  interactive,
  deltaTone,
}: {
  cell: DailySpendingCell;
  maxDailySpent: number;
  tooltip: string;
  interactive: boolean;
  deltaTone?: "warning" | "success" | null;
}) {
  if (!cell.dateKey) {
    return (
      <div
        className="size-3 shrink-0 rounded-[2px]"
        aria-hidden="true"
      />
    );
  }

  const level = getIntensityLevel(cell.totalRealSpent, maxDailySpent);

  return (
    <div className="relative size-3 shrink-0">
      <div
        className={cn(
          "size-3 rounded-[2px] transition-opacity",
          getCellBackground(level),
          cell.isToday && "ring-1 ring-foreground/70 ring-offset-1 ring-offset-surface",
          cell.isFuture && "opacity-30",
          !interactive && "pointer-events-none",
        )}
        title={interactive ? tooltip : undefined}
        aria-label={interactive ? tooltip : undefined}
        role={interactive ? "img" : undefined}
      />
      {deltaTone === "warning" ? (
        <span
          className="absolute -right-0.5 -top-0.5 size-1 rounded-full bg-destructive ring-1 ring-surface"
          aria-hidden="true"
        />
      ) : null}
      {deltaTone === "success" ? (
        <span
          className="absolute -right-0.5 -top-0.5 size-1 rounded-full bg-success ring-1 ring-surface"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

function MonthRow({
  row,
  compareRow,
  maxDailySpent,
  isCurrentMonth,
  showDeltaIndicators,
}: {
  row: DailySpendingMonthRow;
  compareRow: DailySpendingMonthRow | null;
  maxDailySpent: number;
  isCurrentMonth: boolean;
  showDeltaIndicators: boolean;
}) {
  const monthAbbrev = getMonthAbbrev(row.label);
  const compareAbbrev = compareRow ? getMonthAbbrev(compareRow.label) : "";
  const currentRow = isCurrentMonth ? row : compareRow;
  const previousRow = isCurrentMonth ? compareRow : row;
  const currentAbbrev = currentRow ? getMonthAbbrev(currentRow.label) : monthAbbrev;
  const previousAbbrev = previousRow ? getMonthAbbrev(previousRow.label) : compareAbbrev;

  return (
    <div className="flex items-center gap-2">
      <span className="w-7 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {monthAbbrev}
      </span>
      <div className="flex gap-0.5">
        {row.days.map((cell) => {
          const currentCell = currentRow?.days.find(
            (compareDay) => compareDay.day === cell.day,
          );
          const previousCell = previousRow?.days.find(
            (compareDay) => compareDay.day === cell.day,
          );
          const tooltip = buildComparisonTooltip(
            currentCell,
            currentAbbrev,
            previousCell,
            previousAbbrev,
          );
          const interactive =
            Boolean(cell.dateKey) && (isCurrentMonth ? !cell.isFuture : true);
          const deltaTone =
            showDeltaIndicators && isCurrentMonth && !cell.isFuture
              ? getDeltaTone(getDayDelta(currentCell, previousCell))
              : null;

          return (
            <HeatmapCell
              key={`${row.monthKey}-${cell.day}`}
              cell={cell}
              maxDailySpent={maxDailySpent}
              tooltip={tooltip}
              interactive={interactive}
              deltaTone={deltaTone}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayAxisLabels() {
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 shrink-0" aria-hidden="true" />
      <div className="flex gap-0.5">
        {DAY_AXIS.map((day) => (
          <div
            key={day}
            className="flex size-3 shrink-0 items-start justify-center"
          >
            {DAY_LABELS.includes(day) ? (
              <span className="font-num text-[9px] leading-none text-muted-foreground">
                {day}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthToDateFooter({
  summary,
}: {
  summary: NonNullable<ReturnType<typeof getMonthToDateSummary>>;
}) {
  return (
    <p className="text-xs leading-5 text-muted-foreground">
      Fino al{" "}
      <span className="font-medium text-foreground">
        {summary.todayDay} {summary.monthAbbrev}
      </span>
      :{" "}
      <span className="font-num font-semibold text-foreground">
        {formatMoney(summary.currentTotal)}
      </span>{" "}
      vs{" "}
      <span className="font-num font-semibold text-foreground">
        {formatMoney(summary.previousTotal)}
      </span>{" "}
      {summary.previousAbbrev}{" "}
      <span
        className={cn(
          "font-num font-semibold",
          summary.delta > 0
            ? "text-destructive"
            : summary.delta < 0
              ? "text-success"
              : "text-foreground",
        )}
      >
        ({formatSignedMoney(summary.delta)})
      </span>
    </p>
  );
}

function IntensityLegend({ maxDailySpent }: { maxDailySpent: number }) {
  const levels = [0, 1, 2, 3, 4, 5];

  return (
    <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
      <span>Meno</span>
      <div className="flex gap-0.5">
        {levels.map((level) => (
          <div
            key={level}
            className={cn("size-3 rounded-[2px]", getCellBackground(level))}
            title={
              level === 0
                ? "Nessuna spesa"
                : formatMoney((maxDailySpent * level) / 5)
            }
            aria-hidden="true"
          />
        ))}
      </div>
      <span>Più speso</span>
    </div>
  );
}

export function DailySpendingHeatmap({ data }: DailySpendingHeatmapProps) {
  const hasData = hasHeatmapData(data);
  const monthToDateSummary = getMonthToDateSummary(data);

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-surface p-[18px]">
      <div className="mb-3.5 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Confronto giornaliero
        </p>
        <p className="text-sm text-muted-foreground">{getSubtitle(data)}</p>
      </div>

      {!hasData ? (
        <div className="flex min-h-[132px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-surface-muted/60 px-4 text-center text-sm text-muted-foreground">
          Nessuna spesa registrata nel mese corrente o in quello precedente.
        </div>
      ) : (
        <>
          <div className="-mx-1 overflow-x-auto px-1">
            <div className="min-w-max space-y-1.5 pb-1">
              {data.previousMonth ? (
                <MonthRow
                  row={data.previousMonth}
                  compareRow={data.currentMonth}
                  maxDailySpent={data.maxDailySpent}
                  isCurrentMonth={false}
                  showDeltaIndicators={false}
                />
              ) : null}
              <MonthRow
                row={data.currentMonth}
                compareRow={data.previousMonth}
                maxDailySpent={data.maxDailySpent}
                isCurrentMonth
                showDeltaIndicators={Boolean(data.previousMonth)}
              />
              <DayAxisLabels />
            </div>
          </div>

          <div className="mt-4 space-y-3 border-t border-border pt-3">
            <IntensityLegend maxDailySpent={data.maxDailySpent} />
            {monthToDateSummary ? (
              <MonthToDateFooter summary={monthToDateSummary} />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
