"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import type {
  DailySpendingCell,
  DailySpendingComparison,
} from "@/src/lib/daily-spending-comparison";
import { formatMoney } from "@/src/lib/formatters";

type DailySpendingHeatmapProps = {
  data: DailySpendingComparison;
};

const WEEKDAY_LABELS = ["L", "M", "M", "G", "V", "S", "D"];
const VIEWPORT_MARGIN = 12;
const TOOLTIP_GAP = 8;

type TooltipPosition = {
  top: number;
  left: number;
  ready: boolean;
};

function formatSignedMoney(value: number): string {
  const normalized = formatMoney(Math.abs(value));
  if (value > 0) return `+${normalized}`;
  if (value < 0) return `-${normalized}`;
  return normalized;
}

function getMonthAbbrev(label: string): string {
  return label.split(" ")[0]?.slice(0, 3).toLowerCase() ?? "";
}

function getSubtitle(data: DailySpendingComparison): string {
  const { currentMonth, previousMonth, monthToDateDelta } = data;
  const todayDay = currentMonth.days.find((cell) => cell.isToday)?.day;

  if (monthToDateDelta === null || !previousMonth || !todayDay) {
    return currentMonth.label;
  }

  return `${currentMonth.label} · ${formatSignedMoney(monthToDateDelta)} fino al ${todayDay} vs ${getMonthAbbrev(previousMonth.label)}`;
}

function getCurrentMonthMaxSpent(days: DailySpendingCell[]): number {
  const max = Math.max(...days.map((cell) => cell.totalRealSpent), 0);
  return max > 0 ? max : 1;
}

function getSpendLevel(spent: number, maxSpent: number): 0 | 1 | 2 | 3 {
  if (spent <= 0) return 0;
  const ratio = spent / maxSpent;
  if (ratio <= 0.33) return 1;
  if (ratio <= 0.66) return 2;
  return 3;
}

function getCellStyles(level: 0 | 1 | 2 | 3, options: { isToday: boolean; isFuture: boolean }) {
  return cn(
    "relative flex aspect-square min-h-11 w-full flex-col items-center justify-center rounded-xl border text-center transition-[box-shadow,transform,border-color,background-color]",
    level === 0 && "border-border/80 bg-surface-muted/45",
    level === 1 && "border-muted-foreground/25 bg-muted-foreground/20",
    level === 2 && "border-muted-foreground/35 bg-muted-foreground/35",
    level === 3 && "border-muted-foreground/50 bg-muted-foreground/55",
    options.isToday && "border-foreground/70 ring-2 ring-foreground/15",
    options.isFuture && "opacity-35",
  );
}

function getWeekdayIndex(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (weekday + 6) % 7;
}

function buildCalendarGrid(days: DailySpendingCell[]): Array<DailySpendingCell | null> {
  const validDays = days.filter((cell) => cell.dateKey);
  const firstDay = validDays[0];
  if (!firstDay?.dateKey) return [];

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

function clampTooltipPosition(
  anchor: HTMLElement,
  tooltip: HTMLElement,
): TooltipPosition {
  const anchorRect = anchor.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const maxLeft = window.innerWidth - tooltipRect.width - VIEWPORT_MARGIN;
  const maxTop = window.innerHeight - tooltipRect.height - VIEWPORT_MARGIN;

  let top = anchorRect.bottom + TOOLTIP_GAP;
  let left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;

  if (top > maxTop) {
    top = anchorRect.top - tooltipRect.height - TOOLTIP_GAP;
  }

  if (top < VIEWPORT_MARGIN) {
    top = VIEWPORT_MARGIN;
  }

  left = Math.max(VIEWPORT_MARGIN, Math.min(left, maxLeft));

  return { top, left, ready: true };
}

function DayTooltip({
  anchorRef,
  cell,
  previousCell,
  previousAbbrev,
}: {
  anchorRef: RefObject<HTMLButtonElement | null>;
  cell: DailySpendingCell;
  previousCell: DailySpendingCell | null | undefined;
  previousAbbrev: string;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    ready: false,
  });

  const delta =
    previousCell?.dateKey != null
      ? cell.totalRealSpent - previousCell.totalRealSpent
      : null;

  const updatePosition = () => {
    const anchor = anchorRef.current;
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) return;

    setPosition(clampTooltipPosition(anchor, tooltip));
  };

  useLayoutEffect(() => {
    updatePosition();
  }, [anchorRef, cell.dateKey, previousCell?.dateKey, previousAbbrev]);

  useEffect(() => {
    const handleLayoutChange = () => {
      updatePosition();
    };

    window.addEventListener("resize", handleLayoutChange);
    window.addEventListener("scroll", handleLayoutChange, true);

    return () => {
      window.removeEventListener("resize", handleLayoutChange);
      window.removeEventListener("scroll", handleLayoutChange, true);
    };
  }, [anchorRef, cell.dateKey, previousCell?.dateKey, previousAbbrev]);

  const tooltip = (
    <div
      ref={tooltipRef}
      data-day-tooltip
      role="tooltip"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        visibility: position.ready ? "visible" : "hidden",
        zIndex: 60,
      }}
      className="w-max max-w-[min(12rem,calc(100vw-1.5rem))] rounded-xl border border-border/80 bg-popover px-3 py-2.5 text-left shadow-[0_12px_30px_-18px_rgba(0,0,0,0.55)]"
    >
      <p className="font-num text-sm font-semibold text-popover-foreground">
        {formatMoney(cell.totalRealSpent)}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {cell.entriesCount === 0
          ? "Nessun movimento"
          : cell.entriesCount === 1
            ? "1 movimento"
            : `${cell.entriesCount} movimenti`}
      </p>
      {previousCell?.dateKey ? (
        <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
          vs {previousCell.day} {previousAbbrev}:{" "}
          <span className="font-num font-medium text-foreground">
            {formatMoney(previousCell.totalRealSpent)}
          </span>
          {delta !== null && delta !== 0 ? (
            <span
              className={cn(
                "font-num font-semibold",
                delta > 0 ? "text-destructive" : "text-success",
              )}
            >
              {" "}
              ({formatSignedMoney(delta)})
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );

  return createPortal(tooltip, document.body);
}

function DayCell({
  cell,
  maxSpent,
  previousCell,
  previousAbbrev,
  isSelected,
  onToggle,
}: {
  cell: DailySpendingCell;
  maxSpent: number;
  previousCell: DailySpendingCell | null | undefined;
  previousAbbrev: string;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!cell.dateKey) {
    return <div aria-hidden="true" className="aspect-square min-h-11" />;
  }

  const level = getSpendLevel(cell.totalRealSpent, maxSpent);
  const interactive = !cell.isFuture;

  return (
    <div className="relative" data-day-cell>
      <button
        ref={buttonRef}
        type="button"
        disabled={!interactive}
        aria-expanded={isSelected}
        aria-label={`Giorno ${cell.day}: ${formatMoney(cell.totalRealSpent)} spesi`}
        onClick={(event) => {
          event.stopPropagation();
          if (interactive) onToggle();
        }}
        className={cn(
          getCellStyles(level, { isToday: cell.isToday, isFuture: cell.isFuture }),
          interactive && "cursor-pointer hover:border-foreground/40 active:scale-[0.97]",
          isSelected && "border-foreground ring-2 ring-foreground/20",
          !interactive && "cursor-default",
        )}
      >
        <span
          className={cn(
            "font-num text-[11px] font-semibold leading-none",
            level > 0 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {cell.day}
        </span>
        {level > 0 ? (
          <span className="mt-1 font-num text-[9px] font-medium leading-none text-foreground/75">
            {Math.round(cell.totalRealSpent)}€
          </span>
        ) : null}
      </button>
      {isSelected && interactive ? (
        <DayTooltip
          anchorRef={buttonRef}
          cell={cell}
          previousCell={previousCell}
          previousAbbrev={previousAbbrev}
        />
      ) : null}
    </div>
  );
}

export function DailySpendingHeatmap({ data }: DailySpendingHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const { currentMonth, previousMonth } = data;
  const maxSpent = getCurrentMonthMaxSpent(currentMonth.days);
  const gridCells = buildCalendarGrid(currentMonth.days);
  const previousAbbrev = previousMonth ? getMonthAbbrev(previousMonth.label) : "";
  const hasCurrentMonthActivity = currentMonth.days.some(
    (cell) => cell.entriesCount > 0 || cell.totalRealSpent > 0,
  );

  useEffect(() => {
    if (!selectedDateKey) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-day-cell]")) return;
      if (target.closest("[data-day-tooltip]")) return;
      setSelectedDateKey(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedDateKey(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedDateKey]);

  return (
    <div
      ref={containerRef}
      className="rounded-[14px] border border-border bg-surface p-[18px]"
    >
      <div className="mb-3 space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Spesa del mese
        </p>
        <p className="text-sm text-muted-foreground">{getSubtitle(data)}</p>
      </div>

      {!hasCurrentMonthActivity ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-surface-muted/60 px-4 text-center text-sm text-muted-foreground">
          Nessuna spesa registrata in {currentMonth.label.toLowerCase()}.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAY_LABELS.map((label, index) => (
              <span
                key={`${label}-${index}`}
                className="pb-0.5 text-center text-[10px] font-medium text-muted-foreground"
              >
                {label}
              </span>
            ))}
            {gridCells.map((cell, index) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${index}`}
                    aria-hidden="true"
                    className="aspect-square min-h-11"
                  />
                );
              }

              const previousCell = previousMonth?.days.find(
                (day) => day.day === cell.day,
              );

              return (
                <DayCell
                  key={cell.dateKey}
                  cell={cell}
                  maxSpent={maxSpent}
                  previousCell={previousCell}
                  previousAbbrev={previousAbbrev}
                  isSelected={selectedDateKey === cell.dateKey}
                  onToggle={() =>
                    setSelectedDateKey((current) =>
                      current === cell.dateKey ? null : cell.dateKey,
                    )
                  }
                />
              );
            })}
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Tocca un giorno per il dettaglio.{" "}
            <span className="font-num">{formatMoney(currentMonth.totalRealSpent)}</span>{" "}
            spesi nel mese.
          </p>
        </>
      )}
    </div>
  );
}
