"use client";

import { useEffect, useId, useState } from "react";

import { cn } from "@/lib/utils";
import type {
  DailySpendingCell,
  DailySpendingComparison,
  DailySpendingMonthRow,
} from "@/src/lib/daily-spending-comparison";
import { formatMoney } from "@/src/lib/formatters";
import { formatRomeDateLabel } from "@/src/lib/rome-dates";

type DailySpendingHeatmapProps = {
  data: DailySpendingComparison;
};

type SelectedDay = {
  cell: DailySpendingCell;
  monthLabel: string;
  isCurrentMonth: boolean;
  currentCell: DailySpendingCell | null;
  previousCell: DailySpendingCell | null;
  currentAbbrev: string;
  previousAbbrev: string;
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

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

function getWeekdayIndex(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return (weekday + 6) % 7;
}

function buildCalendarGrid(days: DailySpendingCell[]): Array<DailySpendingCell | null> {
  const validDays = days.filter((cell) => cell.dateKey);
  const firstDay = validDays[0];

  if (!firstDay?.dateKey) {
    return [];
  }

  const grid: Array<DailySpendingCell | null> = Array.from(
    { length: getWeekdayIndex(firstDay.dateKey) },
    () => null,
  );

  for (const cell of validDays) {
    grid.push(cell);
  }

  while (grid.length % 7 !== 0) {
    grid.push(null);
  }

  return grid;
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

function HeatmapCell({
  cell,
  maxDailySpent,
  interactive,
  deltaTone,
  isSelected,
  onSelect,
}: {
  cell: DailySpendingCell;
  maxDailySpent: number;
  interactive: boolean;
  deltaTone?: "warning" | "success" | null;
  isSelected: boolean;
  onSelect: () => void;
}) {
  if (!cell.dateKey) {
    return <div aria-hidden="true" className="aspect-square min-h-10" />;
  }

  const level = getIntensityLevel(cell.totalRealSpent, maxDailySpent);
  const sharedClassName = cn(
    "relative flex aspect-square min-h-10 w-full items-center justify-center rounded-lg transition-[box-shadow,opacity,transform]",
    getCellBackground(level),
    cell.isToday && "ring-1 ring-foreground/70",
    cell.isFuture && "opacity-35",
    isSelected && "ring-2 ring-foreground shadow-sm",
    interactive && "cursor-pointer hover:ring-1 hover:ring-foreground/50 active:scale-[0.98]",
    !interactive && "pointer-events-none",
  );

  const content = (
    <>
      <span
        className={cn(
          "font-num text-[11px] font-medium leading-none",
          level > 0 ? "text-foreground/90" : "text-muted-foreground",
        )}
      >
        {cell.day}
      </span>
      {deltaTone === "warning" ? (
        <span
          className="absolute right-1 top-1 size-1.5 rounded-full bg-destructive ring-1 ring-surface"
          aria-hidden="true"
        />
      ) : null}
      {deltaTone === "success" ? (
        <span
          className="absolute right-1 top-1 size-1.5 rounded-full bg-success ring-1 ring-surface"
          aria-hidden="true"
        />
      ) : null}
    </>
  );

  if (!interactive) {
    return <div className={sharedClassName}>{content}</div>;
  }

  return (
    <button
      type="button"
      className={sharedClassName}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      {content}
    </button>
  );
}

function DayDetailPanel({
  selection,
  detailPanelId,
  onClose,
}: {
  selection: SelectedDay;
  detailPanelId: string;
  onClose: () => void;
}) {
  const { cell, monthLabel, currentCell, previousCell, currentAbbrev, previousAbbrev } =
    selection;
  const delta = getDayDelta(currentCell, previousCell);
  const deltaTone = getDeltaTone(delta);
  const entriesLabel =
    cell.entriesCount === 1 ? "1 movimento" : `${cell.entriesCount} movimenti`;

  return (
    <div
      id={detailPanelId}
      className="rounded-2xl border border-border/80 bg-surface-muted/70 p-4"
      role="region"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {cell.dateKey ? formatRomeDateLabel(cell.dateKey) : monthLabel}
          </p>
          <p className="text-xs text-muted-foreground">{monthLabel}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          Chiudi
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-surface px-3 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Spesa del giorno
          </p>
          <p className="mt-1 font-num text-xl font-semibold text-foreground">
            {formatMoney(cell.totalRealSpent)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {cell.entriesCount === 0 ? "Nessun movimento" : entriesLabel}
          </p>
        </div>

        {currentCell?.dateKey && previousCell?.dateKey ? (
          <div className="rounded-xl border border-border/70 bg-surface px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Vs stesso giorno
            </p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>
                {currentCell.day} {currentAbbrev.toLowerCase()}:{" "}
                <span className="font-num font-semibold text-foreground">
                  {formatMoney(currentCell.totalRealSpent)}
                </span>
              </p>
              <p>
                {previousCell.day} {previousAbbrev.toLowerCase()}:{" "}
                <span className="font-num font-semibold text-foreground">
                  {formatMoney(previousCell.totalRealSpent)}
                </span>
              </p>
            </div>
            {delta !== null ? (
              <p
                className={cn(
                  "mt-2 font-num text-sm font-semibold",
                  deltaTone === "warning"
                    ? "text-destructive"
                    : deltaTone === "success"
                      ? "text-success"
                      : "text-foreground",
                )}
              >
                {formatSignedMoney(delta)} rispetto al mese scorso
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Stessa spesa del mese scorso
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-surface/60 px-3 py-3 text-sm text-muted-foreground">
            Nessun confronto disponibile per questo giorno.
          </div>
        )}
      </div>
    </div>
  );
}

function MonthGrid({
  row,
  compareRow,
  maxDailySpent,
  isCurrentMonth,
  showDeltaIndicators,
  selectedDateKey,
  onSelectDay,
}: {
  row: DailySpendingMonthRow;
  compareRow: DailySpendingMonthRow | null;
  maxDailySpent: number;
  isCurrentMonth: boolean;
  showDeltaIndicators: boolean;
  selectedDateKey: string | null;
  onSelectDay: (selection: SelectedDay) => void;
}) {
  const monthAbbrev = getMonthAbbrev(row.label);
  const currentRow = isCurrentMonth ? row : compareRow;
  const previousRow = isCurrentMonth ? compareRow : row;
  const currentAbbrev = currentRow ? getMonthAbbrev(currentRow.label) : monthAbbrev;
  const previousAbbrev = previousRow ? getMonthAbbrev(previousRow.label) : "";
  const gridCells = buildCalendarGrid(row.days);

  return (
    <div className="space-y-2.5">
      <p className="text-sm font-medium text-foreground">{row.label}</p>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={`${row.monthKey}-${label}`}
            className="pb-0.5 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
          >
            {label}
          </span>
        ))}
        {gridCells.map((cell, index) => {
          if (!cell) {
            return (
              <div
                key={`${row.monthKey}-empty-${index}`}
                aria-hidden="true"
                className="aspect-square min-h-10"
              />
            );
          }

          const currentCell = currentRow?.days.find(
            (compareDay) => compareDay.day === cell.day,
          );
          const previousCell = previousRow?.days.find(
            (compareDay) => compareDay.day === cell.day,
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
              interactive={interactive}
              deltaTone={deltaTone}
              isSelected={selectedDateKey === cell.dateKey}
              onSelect={() =>
                onSelectDay({
                  cell,
                  monthLabel: row.label,
                  isCurrentMonth,
                  currentCell: currentCell ?? null,
                  previousCell: previousCell ?? null,
                  currentAbbrev,
                  previousAbbrev,
                })
              }
            />
          );
        })}
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
    <div className="flex flex-wrap items-center justify-end gap-2 text-[10px] text-muted-foreground">
      <span>Meno</span>
      <div className="flex gap-1">
        {levels.map((level) => (
          <div
            key={level}
            className={cn("size-5 rounded-md", getCellBackground(level))}
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
  const detailPanelId = useId();
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);
  const hasData = hasHeatmapData(data);
  const monthToDateSummary = getMonthToDateSummary(data);

  useEffect(() => {
    if (!selectedDay) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedDay(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedDay]);

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-surface p-[18px]">
      <div className="mb-3.5 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Confronto giornaliero
        </p>
        <p className="text-sm text-muted-foreground">{getSubtitle(data)}</p>
        {hasData ? (
          <p className="text-xs text-muted-foreground">
            Tocca un giorno per vedere spesa e confronto.
          </p>
        ) : null}
      </div>

      {!hasData ? (
        <div className="flex min-h-[132px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-surface-muted/60 px-4 text-center text-sm text-muted-foreground">
          Nessuna spesa registrata nel mese corrente o in quello precedente.
        </div>
      ) : (
        <>
          <div className="space-y-5">
            {data.previousMonth ? (
              <MonthGrid
                row={data.previousMonth}
                compareRow={data.currentMonth}
                maxDailySpent={data.maxDailySpent}
                isCurrentMonth={false}
                showDeltaIndicators={false}
                selectedDateKey={selectedDay?.cell.dateKey ?? null}
                onSelectDay={setSelectedDay}
              />
            ) : null}
            <MonthGrid
              row={data.currentMonth}
              compareRow={data.previousMonth}
              maxDailySpent={data.maxDailySpent}
              isCurrentMonth
              showDeltaIndicators={Boolean(data.previousMonth)}
              selectedDateKey={selectedDay?.cell.dateKey ?? null}
              onSelectDay={setSelectedDay}
            />
          </div>

          {selectedDay ? (
            <div className="mt-4">
              <DayDetailPanel
                selection={selectedDay}
                detailPanelId={detailPanelId}
                onClose={() => setSelectedDay(null)}
              />
            </div>
          ) : null}

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
