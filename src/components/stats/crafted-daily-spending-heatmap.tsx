"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import { Label, Mono, Serif } from "@/components/crafted";
import { cn } from "@/lib/utils";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import type {
  DailySpendingCell,
  DailySpendingComparison,
} from "@/src/lib/daily-spending-comparison";
import { formatMoney } from "@/src/lib/formatters";
import { useCurrencyCode, useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useTranslations, useWorkspaceLanguage } from "@/src/components/language/language-context";
import { languageToLocale } from "@/src/lib/i18n";
import type { Translations } from "@/src/lib/i18n/types";

type HeatmapStrings = Translations["stats"];

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

type AnchorPoint = {
  x: number;
  y: number;
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

function formatSignedMoney(value: number, currencyCode: string): string {
  const normalized = formatMoney(Math.abs(value), currencyCode);

  if (value > 0) {
    return `+${normalized}`;
  }

  if (value < 0) {
    return `-${normalized}`;
  }

  return normalized;
}

function formatSignedPercent(value: number, locale: string): string {
  const normalized = new Intl.NumberFormat(locale, {
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

function formatMonthLabel(parts: MonthParts, locale: string): string {
  const raw = new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, 1, 12, 0, 0)));

  const normalized = raw.replace(/\./g, "").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatDateKeyLong(dateKey: string | null, locale: string, dateUnavailable: string): string {
  if (!dateKey) {
    return dateUnavailable;
  }

  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return dateKey;
  }

  return new Intl.DateTimeFormat(locale, {
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

function getSubtitle(data: DailySpendingComparison, currencyCode: string, locale: string, hs: HeatmapStrings): string {
  const previousLabel =
    data.previousMonth?.label ??
    (() => {
      const currentParts = parseMonthKey(data.currentMonth.monthKey);
      return currentParts
        ? formatMonthLabel(getPreviousMonthParts(currentParts), locale)
        : hs.previousMonthFallback;
    })();
  const previousAbbrev = getMonthAbbrev(previousLabel).toLowerCase();

  if (data.monthToDateDelta === null) {
    return hs.subtitleDayByDay(data.currentMonth.label, previousAbbrev);
  }

  const scope = data.currentMonth.days.some((cell) => cell.isToday)
    ? hs.soFar
    : hs.monthTotalScope;

  return hs.subtitleWithDelta(data.currentMonth.label, formatSignedMoney(data.monthToDateDelta, currencyCode), scope, previousAbbrev);
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
  currencySymbol: string,
  locale: string,
  hs: HeatmapStrings,
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

  let note = hs.comparisonNote;

  if (cell.isFuture) {
    note = hs.futureNote;
  } else if (!previousDateExists) {
    note = hs.noPreviousDayNote(cell.day);
  } else if (!hasPreviousData) {
    note = hs.noPreviousDataNote(formatDateKeyLong(previousDateKey, locale, hs.dateUnavailable));
  } else if (percentDelta === null) {
    note = hs.deltaNotCalcNote(currencySymbol);
  }

  return {
    cell,
    currentLabel: formatDateKeyLong(cell.dateKey, locale, hs.dateUnavailable),
    previousDateExists,
    previousLabel: previousDateExists ? formatDateKeyLong(previousDateKey, locale, hs.dateUnavailable) : null,
    previousTotal,
    previousEntriesCount,
    hasPreviousData,
    delta,
    percentDelta,
    note,
  };
}

function getDayAriaLabel(details: DayDetails, currencyCode: string, hs: HeatmapStrings): string {
  const parts = [
    details.currentLabel,
    hs.ariaSpentForReal(formatMoney(details.cell.totalRealSpent, currencyCode)),
  ];

  if (details.previousDateExists && details.previousLabel) {
    parts.push(
      details.hasPreviousData
        ? `${details.previousLabel}: ${formatMoney(details.previousTotal ?? 0, currencyCode)}`
        : hs.ariaNoData(details.previousLabel),
    );
  } else {
    parts.push(hs.ariaNoPrevDay);
  }

  if (details.delta !== null) {
    parts.push(hs.ariaDiff(formatSignedMoney(details.delta, currencyCode)));
  }

  return parts.join(". ");
}

function DayDetailPopover({
  details,
  currencyCode,
  locale,
  hs,
  className,
  style,
}: {
  details: DayDetails;
  currencyCode: string;
  locale: string;
  hs: HeatmapStrings;
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
        "rounded-2xl border border-line bg-background/95 px-3 py-2.5 shadow-[0_16px_46px_rgba(0,0,0,0.18)] backdrop-blur",
        className,
      )}
      style={style}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[13px] font-semibold leading-5 text-foreground">
          {details.currentLabel}
        </p>
        {details.cell.isFuture ? (
          <span className="shrink-0 rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-ink-3">
            {hs.futureBadge}
          </span>
        ) : details.cell.isToday ? (
          <span className="shrink-0 rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-accent">
            {hs.todayBadge}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 space-y-1.5 text-[12px] leading-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-ink-3">{hs.realSpentLabel}</span>
          <Mono className="font-semibold text-foreground">
            {formatMoney(details.cell.totalRealSpent, currencyCode)}
          </Mono>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-ink-3">{hs.entriesLabel}</span>
          <Mono className="font-semibold text-foreground">
            {details.cell.entriesCount}
          </Mono>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0 text-ink-3">
            {details.previousLabel ?? hs.prevMonthLabel}
          </span>
          <Mono className="shrink-0 font-semibold text-foreground">
            {details.previousDateExists
              ? formatMoney(details.previousTotal ?? 0, currencyCode)
              : hs.notAvailable}
          </Mono>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-1.5">
          <span className="text-ink-3">{hs.diffLabel}</span>
          <Mono className={cn("font-semibold", deltaTone)}>
            {details.delta === null ? hs.notCalculable : formatSignedMoney(details.delta, currencyCode)}
          </Mono>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-ink-3">{hs.percentLabel}</span>
          <Mono className={cn("font-semibold", deltaTone)}>
            {details.percentDelta === null
              ? hs.notCalculable
              : formatSignedPercent(details.percentDelta, locale)}
          </Mono>
        </div>
      </div>

      <p className="mt-2 border-t border-line-soft pt-2 text-[11px] leading-4 text-muted-foreground">
        {details.note}
      </p>
    </div>
  );
}

function IntensityLegend({ maxDailySpent, currency, hs }: { maxDailySpent: number; currency: string; hs: HeatmapStrings }) {
  return (
    <div className="flex items-center justify-end gap-2 text-[10px] text-ink-3">
      <span>{hs.lessLabel}</span>
      <div className="flex gap-1">
        {INTENSITY_CLASS.map((className, level) => (
          <div
            key={level}
            className={cn("size-4 rounded-md border", className)}
            title={
              level === 0 ? hs.noSpendingTitle : formatMoney((maxDailySpent * level) / 5, currency)
            }
            aria-hidden="true"
          />
        ))}
      </div>
      <span>{hs.moreLabel}</span>
    </div>
  );
}

export function CraftedDailySpendingHeatmap({ data }: CraftedDailySpendingHeatmapProps) {
  const t = useTranslations();
  const hs = t.stats;
  const language = useWorkspaceLanguage();
  const locale = languageToLocale(language);
  const rootRef = useRef<HTMLElement | null>(null);
  const currencySymbol = useCurrencySymbol();
  const currencyCode = useCurrencyCode();
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
    return activeCell ? buildDayDetails(activeCell, data, currencySymbol, locale, hs) : null;
  }, [activeDay, currentDays, data, currencySymbol, locale, hs]);

  function getPopoverPosition(
    day: number,
    element: HTMLElement,
    anchor?: AnchorPoint,
  ): PopoverPosition {
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const gap = 10;
    const width = Math.min(282, viewportWidth - margin * 2);
    const estimatedHeight = 190;
    const anchorX = anchor?.x ?? rect.left + rect.width / 2;
    const anchorY = anchor?.y ?? rect.top + rect.height / 2;
    const left = Math.min(
      Math.max(margin, anchorX - width / 2),
      viewportWidth - width - margin,
    );
    const hasRoomBelow = anchorY + estimatedHeight + gap < viewportHeight;
    const unclampedTop = hasRoomBelow
      ? anchorY + gap
      : anchorY - estimatedHeight - gap;
    const top = Math.min(
      Math.max(margin, unclampedTop),
      Math.max(margin, viewportHeight - estimatedHeight - margin),
    );

    return {
      day,
      left,
      top,
      placement: hasRoomBelow ? "bottom" : "top",
      width,
    };
  }

  function activateDay(day: number, element: HTMLElement, anchor?: AnchorPoint) {
    setActiveDay(day);
    setPopoverPosition(getPopoverPosition(day, element, anchor));
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

    function handlePointerDown() {
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

  const portalRoot = typeof document === "undefined" ? null : document.body;

  return (
    <section ref={rootRef} className="px-5 py-5">
      <Label className="mb-2 block">{hs.dailySpendingLabel}</Label>
      <Serif className="mb-4 block text-sm text-ink-3">{getSubtitle(data, currencyCode, locale, hs)}</Serif>

      {!hasData ? (
        <p className="py-8 text-sm text-ink-3">
          {hs.noHeatmapData}
        </p>
      ) : (
        <>
          <div className="-mx-1 overflow-x-auto px-1 pb-2">
            <ol
              className="grid min-w-[21rem] grid-cols-7 gap-1.5 sm:min-w-0 sm:gap-2"
              aria-label={hs.heatmapAriaLabel(data.currentMonth.label)}
            >
              {currentDays.map((cell) => {
                const details = buildDayDetails(cell, data, currencySymbol, locale, hs);
                const level = getIntensityLevel(cell.totalRealSpent, maxCurrentDailySpent);
                const isActive = activeDay === cell.day;

                return (
                  <li key={cell.dateKey} className="relative min-w-0">
                    <button
                      type="button"
                      aria-label={getDayAriaLabel(details, currencyCode, hs)}
                      aria-describedby={isActive ? "daily-spending-heatmap-detail" : undefined}
                      aria-expanded={isActive}
                      onClick={(event) =>
                        activateDay(cell.day, event.currentTarget, {
                          x: event.clientX,
                          y: event.clientY,
                        })
                      }
                      onFocus={(event) => activateDay(cell.day, event.currentTarget)}
                      onPointerEnter={(event) => {
                        if (event.pointerType !== "touch") {
                          activateDay(cell.day, event.currentTarget, {
                            x: event.clientX,
                            y: event.clientY,
                          });
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
                            {hs.futureShort}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {activeDetails && popoverPosition?.day === activeDetails.cell.day && portalRoot
            ? createPortal(
                <DayDetailPopover
                  details={activeDetails}
                  currencyCode={currencyCode}
                  locale={locale}
                  hs={hs}
                  className="fixed z-[70]"
                  style={{
                    left: popoverPosition.left,
                    top: popoverPosition.top,
                    width: popoverPosition.width,
                  }}
                />,
                portalRoot,
              )
            : null}

          <div className="mt-4 space-y-3 border-t border-line-soft pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-5 text-muted-foreground">
                {hs.heatmapDesc(data.currentMonth.label.toLowerCase())}
              </p>
              <IntensityLegend maxDailySpent={maxCurrentDailySpent} currency={currencyCode} hs={hs} />
            </div>

            {data.monthToDateDelta !== null ? (
              <p className="text-xs leading-5 text-muted-foreground">
                {data.currentMonth.days.some((cell) => cell.isToday) ? hs.monthProgress : hs.monthTotal}:{" "}
                <Mono className="font-semibold text-foreground">
                  {formatCraftedCompact(data.currentMonth.totalRealSpent)}{currencySymbol}
                </Mono>{" "}
                {hs.inMonth(data.currentMonth.label.toLowerCase())},{" "}
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
                  {formatSignedMoney(data.monthToDateDelta, currencyCode)}
                </Mono>{" "}
                {hs.comparedToPrevious}
              </p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
