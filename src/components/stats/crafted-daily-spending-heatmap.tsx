"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { Label, Mono, Serif } from "@/components/crafted";
import { cn } from "@/lib/utils";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import type {
  DailySpendingCell,
  DailySpendingComparison,
} from "@/src/lib/daily-spending-comparison";
import { formatMoney } from "@/src/lib/formatters";

type CraftedDailySpendingHeatmapProps = {
  data: DailySpendingComparison;
};

type MonthParts = {
  year: number;
  month: number;
};

type DayDetails = {
  cell: DailySpendingCell;
  currentLabel: string;
  previousDateExists: boolean;
  previousLabel: string | null;
  previousTotal: number | null;
  previousEntriesCount: number;
  hasPreviousData: boolean;
  delta: number | null;
  percentDelta: number | null;
  note: string;
};

type PopoverPosition = {
  day: number;
  left: number;
  top: number;
  placement: "top" | "bottom";
  width: number;
};

const INTENSITY_CLASS = [
  "border-line-soft bg-surface-muted text-ink-3",
  "border-accent/15 bg-accent/10 text-foreground",
  "border-accent/20 bg-accent/20 text-foreground",
  "border-accent/25 bg-accent/30 text-foreground",
  "border-accent/30 bg-accent/45 text-foreground",
  "border-accent/35 bg-accent/60 text-foreground",
] as const;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

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

function formatSignedPercent(value: number): string {
  const normalized = new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(Math.abs(value));

  if (value > 0) {
    return `+${normalized}%`;
  }

  if (value < 0) {
    return `-${normalized}%`;
  }

  return `${normalized}%`;
}

function parseMonthKey(monthKey: string): MonthParts | null {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }

  if (month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

function getPreviousMonthParts(parts: MonthParts): MonthParts {
  if (parts.month === 1) {
    return { year: parts.year - 1, month: 12 };
  }

  return { year: parts.year, month: parts.month - 1 };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function buildDateKey(parts: MonthParts, day: number): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatMonthLabel(parts: MonthParts): string {
  const raw = new Intl.DateTimeFormat("it-IT", {
    month: "short",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, 1, 12, 0, 0)));

  const normalized = raw.replace(/\./g, "").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatDateKeyLong(dateKey: string | null): string {
  if (!dateKey) {
    return "Data non disponibile";
  }

  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return dateKey;
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
}

function getMonthAbbrev(label: string): string {
  return label.split(" ")[0]?.slice(0, 3) ?? "";
}

function hasHeatmapData(data: DailySpendingComparison): boolean {
  return (
    data.currentMonth.days.some((cell) => cell.entriesCount > 0) ||
    Boolean(data.previousMonth?.days.some((cell) => cell.entriesCount > 0))
  );
}

function getSubtitle(data: DailySpendingComparison): string {
  const previousLabel =
    data.previousMonth?.label ??
    (() => {
      const currentParts = parseMonthKey(data.currentMonth.monthKey);
      return currentParts
        ? formatMonthLabel(getPreviousMonthParts(currentParts))
        : "mese precedente";
    })();
  const previousAbbrev = getMonthAbbrev(previousLabel).toLowerCase();

  if (data.monthToDateDelta === null) {
    return `${data.currentMonth.label} · confronto giorno per giorno con ${previousAbbrev}`;
  }

  return `${data.currentMonth.label} · ${formatSignedMoney(data.monthToDateDelta)} finora vs ${previousAbbrev}`;
}

function getIntensityLevel(spent: number, maxDailySpent: number): number {
  if (spent <= 0) {
    return 0;
  }

  const ratio = spent / Math.max(maxDailySpent, 1);

  if (ratio <= 0.2) return 1;
  if (ratio <= 0.4) return 2;
  if (ratio <= 0.6) return 3;
  if (ratio <= 0.8) return 4;
  return 5;
}

function getCurrentMonthDays(data: DailySpendingComparison): DailySpendingCell[] {
  return data.currentMonth.days.filter((cell) => Boolean(cell.dateKey));
}

function getMaxCurrentDailySpent(days: DailySpendingCell[]): number {
  return Math.max(1, ...days.map((cell) => cell.totalRealSpent));
}

function buildDayDetails(
  cell: DailySpendingCell,
  data: DailySpendingComparison,
): DayDetails {
  const currentParts = parseMonthKey(data.currentMonth.monthKey);
  const previousParts = currentParts ? getPreviousMonthParts(currentParts) : null;
  const previousMonthLength = previousParts
    ? getDaysInMonth(previousParts.year, previousParts.month)
    : 0;
  const previousDateExists = Boolean(previousParts && cell.day <= previousMonthLength);
  const previousDateKey = previousDateExists && previousParts
    ? buildDateKey(previousParts, cell.day)
    : null;
  const previousCell = data.previousMonth?.days.find((day) => day.day === cell.day);
  const hasPreviousData = Boolean(
    previousDateExists && previousCell?.dateKey && previousCell.entriesCount > 0,
  );
  const previousTotal = previousDateExists ? previousCell?.totalRealSpent ?? 0 : null;
  const previousEntriesCount = previousDateExists
    ? previousCell?.entriesCount ?? 0
    : 0;
  const canCompare = !cell.isFuture && previousDateExists && hasPreviousData;
  const delta = canCompare && previousTotal !== null
    ? round2(cell.totalRealSpent - previousTotal)
    : null;
  const percentDelta = delta !== null && previousTotal && previousTotal > 0
    ? round2((delta / previousTotal) * 100)
    : null;

  let note = "Confronto con lo stesso giorno del mese precedente.";

  if (cell.isFuture) {
    note = "Giorno futuro: il totale corrente non e ancora consolidato.";
  } else if (!previousDateExists) {
    note = `Nel mese precedente non esiste il giorno ${cell.day}.`;
  } else if (!hasPreviousData) {
    note = `Nessun dato registrato il ${formatDateKeyLong(previousDateKey)}.`;
  } else if (percentDelta === null) {
    note = "Differenza percentuale non calcolabile perche il dato precedente e 0,00 €.";
  }

  return {
    cell,
    currentLabel: formatDateKeyLong(cell.dateKey),
    previousDateExists,
    previousLabel: previousDateExists ? formatDateKeyLong(previousDateKey) : null,
    previousTotal,
    previousEntriesCount,
    hasPreviousData,
    delta,
    percentDelta,
    note,
  };
}

function getDayAriaLabel(details: DayDetails): string {
  const parts = [
    details.currentLabel,
    `${formatMoney(details.cell.totalRealSpent)} spesi davvero`,
  ];

  if (details.previousDateExists && details.previousLabel) {
    parts.push(
      details.hasPreviousData
        ? `${details.previousLabel}: ${formatMoney(details.previousTotal ?? 0)}`
        : `${details.previousLabel}: nessun dato`,
    );
  } else {
    parts.push("giorno corrispondente del mese precedente non esistente");
  }

  if (details.delta !== null) {
    parts.push(`differenza ${formatSignedMoney(details.delta)}`);
  }

  return parts.join(". ");
}

function DayDetailPopover({
  details,
  className,
  style,
}: {
  details: DayDetails;
  className?: string;
  style?: CSSProperties;
}) {
  const deltaTone =
    details.delta === null
      ? "text-ink-3"
      : details.delta > 0
        ? "text-destructive"
        : details.delta < 0
          ? "text-green"
          : "text-foreground";

  return (
    <div
      id="daily-spending-heatmap-detail"
      role="tooltip"
      aria-live="polite"
      className={cn(
        "rounded-3xl border border-line bg-background px-4 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]",
        className,
      )}
      style={style}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Mono className="block text-[11px] uppercase tracking-[0.18em] text-ink-3">
            Giorno selezionato
          </Mono>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {details.currentLabel}
          </p>
        </div>
        {details.cell.isFuture ? (
          <span className="rounded-full border border-line bg-surface-muted px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
            Futuro
          </span>
        ) : details.cell.isToday ? (
          <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-accent">
            Oggi
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-line-soft bg-surface/70 p-3">
          <span className="text-[11px] uppercase tracking-[0.16em] text-ink-3">
            Speso davvero
          </span>
          <Mono className="mt-1 block text-lg font-semibold">
            {formatMoney(details.cell.totalRealSpent)}
          </Mono>
          <span className="text-xs text-ink-3">
            {details.cell.entriesCount === 1
              ? "1 movimento"
              : `${details.cell.entriesCount} movimenti`}
          </span>
        </div>

        <div className="rounded-2xl border border-line-soft bg-surface/70 p-3">
          <span className="text-[11px] uppercase tracking-[0.16em] text-ink-3">
            Mese precedente
          </span>
          <Mono className="mt-1 block text-lg font-semibold">
            {details.previousDateExists
              ? formatMoney(details.previousTotal ?? 0)
              : "Non disponibile"}
          </Mono>
          <span className="text-xs text-ink-3">
            {details.previousDateExists && details.previousLabel
              ? details.hasPreviousData
                ? `${details.previousEntriesCount} ${details.previousEntriesCount === 1 ? "movimento" : "movimenti"} · ${details.previousLabel}`
                : `Nessun dato · ${details.previousLabel}`
              : "Giorno non esistente"}
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-line-soft bg-surface/50 p-3">
          <span className="text-[11px] uppercase tracking-[0.16em] text-ink-3">
            Differenza
          </span>
          <Mono className={cn("mt-1 block text-base font-semibold", deltaTone)}>
            {details.delta === null ? "Non calcolabile" : formatSignedMoney(details.delta)}
          </Mono>
        </div>

        <div className="rounded-2xl border border-line-soft bg-surface/50 p-3">
          <span className="text-[11px] uppercase tracking-[0.16em] text-ink-3">
            Percentuale
          </span>
          <Mono className={cn("mt-1 block text-base font-semibold", deltaTone)}>
            {details.percentDelta === null
              ? "Non calcolabile"
              : formatSignedPercent(details.percentDelta)}
          </Mono>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {details.note}
      </p>
    </div>
  );
}

function IntensityLegend({ maxDailySpent }: { maxDailySpent: number }) {
  return (
    <div className="flex items-center justify-end gap-2 text-[10px] text-ink-3">
      <span>Meno</span>
      <div className="flex gap-1">
        {INTENSITY_CLASS.map((className, level) => (
          <div
            key={level}
            className={cn("size-4 rounded-md border", className)}
            title={
              level === 0 ? "Nessuna spesa" : formatMoney((maxDailySpent * level) / 5)
            }
            aria-hidden="true"
          />
        ))}
      </div>
      <span>Più speso</span>
    </div>
  );
}

export function CraftedDailySpendingHeatmap({ data }: CraftedDailySpendingHeatmapProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(
    null,
  );
  const hasData = hasHeatmapData(data);
  const currentDays = useMemo(() => getCurrentMonthDays(data), [data]);
  const maxCurrentDailySpent = useMemo(
    () => getMaxCurrentDailySpent(currentDays),
    [currentDays],
  );
  const activeDetails = useMemo(() => {
    const activeCell = currentDays.find((cell) => cell.day === activeDay);
    return activeCell ? buildDayDetails(activeCell, data) : null;
  }, [activeDay, currentDays, data]);

  function getPopoverPosition(day: number, element: HTMLElement): PopoverPosition {
    const rect = element.getBoundingClientRect();
    const width = Math.min(336, window.innerWidth - 32);
    const left = Math.min(
      Math.max(16, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 16,
    );
    const estimatedHeight = 300;
    const hasRoomBelow = rect.bottom + estimatedHeight + 14 < window.innerHeight;
    const top = hasRoomBelow ? rect.bottom + 10 : rect.top - 10;

    return {
      day,
      left,
      top,
      placement: hasRoomBelow ? "bottom" : "top",
      width,
    };
  }

  function activateDay(day: number, element: HTMLElement) {
    setActiveDay(day);
    setPopoverPosition(getPopoverPosition(day, element));
  }
  useEffect(() => {
    if (!activeDay || currentDays.some((cell) => cell.day === activeDay)) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setActiveDay(null);
      setPopoverPosition(null);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeDay, currentDays]);

  useEffect(() => {
    if (activeDay === null) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      setActiveDay(null);
      setPopoverPosition(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveDay(null);
        setPopoverPosition(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDay]);

  return (
    <section ref={rootRef} className="px-5 py-5">
      <Label className="mb-2 block">Spesa giornaliera</Label>
      <Serif className="mb-4 block text-sm text-ink-3">{getSubtitle(data)}</Serif>

      {!hasData ? (
        <p className="py-8 text-sm text-ink-3">
          Nessuna spesa registrata nel mese corrente o in quello precedente.
        </p>
      ) : (
        <>
          <div className="-mx-1 overflow-x-auto px-1 pb-2">
            <ol
              className="grid min-w-[21rem] grid-cols-7 gap-1.5 sm:min-w-0 sm:gap-2"
              aria-label={`Heatmap di ${data.currentMonth.label}`}
            >
              {currentDays.map((cell) => {
                const details = buildDayDetails(cell, data);
                const level = getIntensityLevel(cell.totalRealSpent, maxCurrentDailySpent);
                const isActive = activeDay === cell.day;

                return (
                  <li key={cell.dateKey} className="relative min-w-0">
                    <button
                      type="button"
                      aria-label={getDayAriaLabel(details)}
                      aria-describedby={isActive ? "daily-spending-heatmap-detail" : undefined}
                      aria-expanded={isActive}
                      onClick={(event) => activateDay(cell.day, event.currentTarget)}
                      onFocus={(event) => activateDay(cell.day, event.currentTarget)}
                      onPointerEnter={(event) => {
                        if (event.pointerType !== "touch") {
                          activateDay(cell.day, event.currentTarget);
                        }
                      }}
                      className={cn(
                        "group flex aspect-square min-h-11 w-full touch-manipulation flex-col items-start justify-between rounded-2xl border p-2.5 text-left outline-none transition-[background-color,border-color,box-shadow,opacity,transform] duration-150 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring/50 sm:min-h-14 sm:p-3",
                        INTENSITY_CLASS[level],
                        cell.isToday &&
                          "ring-2 ring-accent/45 ring-offset-2 ring-offset-background",
                        cell.isFuture && "border-line-soft bg-surface-muted text-ink-3 opacity-55",
                        isActive &&
                          "border-foreground/40 shadow-sm ring-2 ring-foreground/10 ring-offset-2 ring-offset-background",
                      )}
                    >
                      <Mono className="text-[11px] font-semibold leading-none sm:text-xs">
                        {cell.day}
                      </Mono>
                      <span className="flex w-full items-end justify-between gap-1">
                        {cell.entriesCount > 0 ? (
                          <span className="size-1.5 rounded-full bg-current opacity-75" />
                        ) : (
                          <span className="size-1.5 rounded-full bg-current opacity-20" />
                        )}
                        {cell.isFuture ? (
                          <span className="text-[8px] uppercase tracking-[0.12em] opacity-80">
                            Fut
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {activeDetails && popoverPosition?.day === activeDetails.cell.day ? (
            <DayDetailPopover
              details={activeDetails}
              className="fixed z-[70]"
              style={{
                left: popoverPosition.left,
                top: popoverPosition.top,
                width: popoverPosition.width,
                transform:
                  popoverPosition.placement === "top"
                    ? "translateY(-100%)"
                    : undefined,
              }}
            />
          ) : null}

          <div className="mt-4 space-y-3 border-t border-line-soft pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-5 text-muted-foreground">
                Ogni quadrato e un giorno di{" "}
                {data.currentMonth.label.toLowerCase()}. Tocca un giorno per vedere il confronto.
              </p>
              <IntensityLegend maxDailySpent={maxCurrentDailySpent} />
            </div>

            {data.monthToDateDelta !== null ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Totale progressivo: {" "}
                <Mono className="font-semibold text-foreground">
                  {formatCraftedCompact(data.currentMonth.totalRealSpent)}€
                </Mono>{" "}
                nel mese corrente, {" "}
                <Mono
                  className={cn(
                    "font-semibold",
                    data.monthToDateDelta > 0
                      ? "text-destructive"
                      : data.monthToDateDelta < 0
                        ? "text-green"
                        : "text-foreground",
                  )}
                >
                  {formatSignedMoney(data.monthToDateDelta)}
                </Mono>{" "}
                rispetto allo stesso periodo del mese precedente.
              </p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
