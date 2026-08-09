"use client";

import { getDaysInMonth } from "@/src/lib/workspace-dates";
import { round2 } from "@/src/lib/money-number";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import { Amount, Eyebrow, Mono, Serif } from "@/components/crafted";
import { cn } from "@/lib/utils";
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

/**
 * La rampa dell'intensità. Erano sei velature di lime (`bg-accent/10` … `/60`):
 * trentun celle del colore che in questa app significa "premi qui", su una
 * griglia in cui non si preme niente — e in tema chiaro il lime diventava
 * oliva, quindi la stessa heatmap aveva due identità nei due temi.
 *
 * Adesso è inchiostro: `--foreground` mescolato dentro `--background`, opaco.
 * Opaco è la parte che conta e non è estetica — una cella ad alpha sopra la
 * stanza cambia valore quando ci passa dietro un orb, e un grafico il cui
 * livello dipende da cosa gli sta dietro non sta misurando niente.
 * I gradini e il ribaltamento dell'inchiostro stanno in globals.css.
 */
const INTENSITY_CLASS = [
  "nlc-heat-0",
  "nlc-heat-1",
  "nlc-heat-2",
  "nlc-heat-3",
  "nlc-heat-4",
  "nlc-heat-5",
] as const;

function formatSignedMoney(
  value: number,
  currencyCode: string,
  locale: string,
): string {
  const normalized = formatMoney(Math.abs(value), currencyCode, locale);

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

/** Segnaposto del delta dentro il template tradotto del sottotitolo. */
const DELTA_PLACEHOLDER = "@@delta@@";

function hasHeatmapData(data: DailySpendingComparison): boolean {
  return (
    data.currentMonth.days.some((cell) => cell.entriesCount > 0) ||
    Boolean(data.previousMonth?.days.some((cell) => cell.entriesCount > 0))
  );
}

/**
 * Il sottotitolo scriveva il delta con `formatMoney` ("-676,00 €") mentre due
 * righe più sotto lo stesso numero era scritto da `Amount` ("−€676,00"): stessa
 * cifra, due convenzioni, duecento pixel di distanza. Adesso il pezzo variabile
 * è un `Amount` e all'i18n resta l'ordine delle parole, che è la sua parte.
 */
function getSubtitleParts(
  data: DailySpendingComparison,
  locale: string,
  hs: HeatmapStrings,
): { head: string; delta: number | null; tail: string } {
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
    return {
      head: hs.subtitleDayByDay(data.currentMonth.label, previousAbbrev),
      delta: null,
      tail: "",
    };
  }

  const scope = data.currentMonth.days.some((cell) => cell.isToday)
    ? hs.soFar
    : hs.monthTotalScope;

  // Il template resta quello dell'i18n: la frase si spezza attorno a un
  // segnaposto, così l'ordine delle parole continua a deciderlo la lingua e non
  // questo componente.
  const [head, tail] = hs
    .subtitleWithDelta(data.currentMonth.label, DELTA_PLACEHOLDER, scope, previousAbbrev)
    .split(DELTA_PLACEHOLDER);

  return {
    head: head ?? "",
    delta: data.monthToDateDelta,
    tail: tail ?? "",
  };
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

function getDayAriaLabel(
  details: DayDetails,
  currencyCode: string,
  hs: HeatmapStrings,
  locale: string,
): string {
  const parts = [
    details.currentLabel,
    hs.ariaSpentForReal(formatMoney(details.cell.totalRealSpent, currencyCode, locale)),
  ];

  // Il giorno futuro non porta più l'etichetta "FUT" sulla cella: sullo schermo
  // lo dice lo spegnimento, qui lo deve dire una parola.
  if (details.cell.isFuture) {
    parts.splice(1, 1, hs.futureBadge);
  }

  if (details.previousDateExists && details.previousLabel) {
    parts.push(
      details.hasPreviousData
        ? `${details.previousLabel}: ${formatMoney(details.previousTotal ?? 0, currencyCode, locale)}`
        : hs.ariaNoData(details.previousLabel),
    );
  } else {
    parts.push(hs.ariaNoPrevDay);
  }

  if (details.delta !== null) {
    parts.push(hs.ariaDiff(formatSignedMoney(details.delta, currencyCode, locale)));
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
  // Il giudizio ha la sua scala e adesso è raggiungibile per nome: `destructive`
  // e `green` sono alias di `--nlc-over` e `--nlc-under`, ma passare dagli alias
  // è il modo in cui il giudizio, altrove nell'app, era finito scritto con i
  // colori del brand.
  const deltaTone =
    details.delta === null
      ? "text-ink-3"
      : details.delta > 0
        ? "text-nlc-over"
        : details.delta < 0
          ? "text-nlc-under"
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
            {formatMoney(details.cell.totalRealSpent, currencyCode, locale)}
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
              ? formatMoney(details.previousTotal ?? 0, currencyCode, locale)
              : hs.notAvailable}
          </Mono>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-1.5">
          <span className="text-ink-3">{hs.diffLabel}</span>
          <Mono className={cn("font-semibold", deltaTone)}>
            {details.delta === null ? hs.notCalculable : formatSignedMoney(details.delta, currencyCode, locale)}
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

/**
 * La leggenda serve, ma non quella di prima.
 *
 * Prima mostrava **sei** caselle, e la prima era il livello 0 — "nessuna
 * spesa". Ma zero non è "meno": è un'altra cosa. Infilarlo in fondo a una
 * rampa che va da "meno" a "più" dice che un giorno senza spese è un giorno di
 * spesa piccola, e non lo è. La rampa adesso ha i cinque livelli che sono
 * davvero una quantità; il giorno vuoto è il fondo della griglia e si spiega da
 * sé, perché è l'unico senza il pallino.
 *
 * L'altra cosa che è cambiata è a chi parla. Le caselle portavano il valore in
 * euro dentro un attributo `title`: su un telefono il `title` non si apre mai,
 * e con `aria-hidden` non lo leggeva nemmeno lo screen reader. Era un numero
 * scritto per nessuno. Adesso quel numero è il nome accessibile del gruppo — la
 * scala è relativa al massimo del mese, e senza il massimo "più speso" non ha
 * unità di misura.
 */
function IntensityLegend({ maxDailySpent, currency, hs }: { maxDailySpent: number; currency: string; hs: HeatmapStrings }) {
  const locale = languageToLocale(useWorkspaceLanguage());

  return (
    <div
      className="flex items-center justify-end gap-2 text-[10px] text-ink-3"
      role="img"
      aria-label={`${hs.intensityLegendLabel}: ${hs.lessLabel} – ${hs.moreLabel} (${formatMoney(maxDailySpent, currency, locale)})`}
    >
      <span aria-hidden="true">{hs.lessLabel}</span>
      <div className="flex gap-1" aria-hidden="true">
        {INTENSITY_CLASS.slice(1).map((className, index) => (
          <div key={index} className={cn("size-3.5 rounded-[4px]", className)} />
        ))}
      </div>
      <span aria-hidden="true">{hs.moreLabel}</span>
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
  const subtitle = getSubtitleParts(data, locale, hs);
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
      <Eyebrow className="mb-2 block">{hs.dailySpendingLabel}</Eyebrow>
      <Serif className="mb-4 block text-sm text-ink-3">
        {subtitle.head}
        {subtitle.delta !== null ? (
          <>
            <Amount value={subtitle.delta} sign="delta" className="text-sm" />
            {subtitle.tail}
          </>
        ) : null}
      </Serif>

      {!hasData ? (
        <p className="py-8 text-sm text-ink-3">
          {hs.noHeatmapData}
        </p>
      ) : (
        <>
          {/* La griglia era `min-w-[21rem]` (336px) dentro un contenitore che a
              360px ne misura 320: la settima colonna finiva tagliata, e per
              vederla si doveva scorrere lateralmente. Un calendario che scorre
              di sedici pixel non si legge come "c'è dell'altro", si legge come
              rotto. Adesso la griglia esce di 12px per lato dal margine di
              pagina — 344px invece di 320 — e le sette colonne entrano intere:
              a 360px la cella misura esattamente 44px, che è anche la misura
              minima di un bersaglio da toccare. Niente scroll orizzontale. */}
          <div className="-mx-3 pb-2">
            <ol
              className="grid grid-cols-7 gap-1.5 sm:gap-2"
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
                      aria-label={getDayAriaLabel(details, currencyCode, hs, locale)}
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
                        "group flex aspect-square w-full touch-manipulation flex-col items-start justify-between rounded-[var(--r-control)] p-2 text-left outline-none transition-[background-color,box-shadow,opacity,transform] duration-150 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring/50 sm:p-3",
                        INTENSITY_CLASS[level],
                        /* Oggi si marca con l'accento perché "oggi" è l'unico
                           posto della griglia dove l'app ti sta indicando
                           qualcosa; resta un anello, cioè un tratto. */
                        cell.isToday &&
                          "ring-2 ring-accent ring-offset-2 ring-offset-background",
                        cell.isFuture && "nlc-heat-future",
                        isActive &&
                          "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                      )}
                    >
                      <Mono className="text-[11px] font-semibold leading-none sm:text-xs">
                        {cell.day}
                      </Mono>
                      {/* Il pallino resta solo dove c'è un movimento: prima
                          c'era anche sui giorni vuoti, al 20% di opacità, e un
                          segno che compare sempre non segna niente. E l'etichetta
                          "FUT" è sparita da ventidue celle su trentuno — che il
                          giorno non sia ancora arrivato lo dice già il fatto che
                          è spento, e ventidue volte non è un'informazione, è un
                          motivo. Resta nel nome accessibile della cella. */}
                      {cell.entriesCount > 0 ? (
                        <span className="size-1.5 rounded-full bg-current opacity-70" />
                      ) : null}
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
              /* Questa riga scriveva i soldi in due modi diversi nella stessa
                 frase: "1016€" (compatto, simbolo in coda) e "-676,00 €"
                 (esteso, simbolo staccato). Adesso è due volte lo stesso
                 oggetto, e il segno del delta lo porta `Amount` con la sua
                 variante `delta` — lì il segno è il contenuto, non un'eccezione. */
              <p className="text-xs leading-5 text-muted-foreground">
                {data.currentMonth.days.some((cell) => cell.isToday) ? hs.monthProgress : hs.monthTotal}:{" "}
                <Amount
                  value={data.currentMonth.totalRealSpent}
                  className="text-xs font-semibold text-foreground"
                />{" "}
                {hs.inMonth(data.currentMonth.label.toLowerCase())},{" "}
                <Amount
                  value={data.monthToDateDelta}
                  sign="delta"
                  className={cn(
                    "text-xs font-semibold",
                    data.monthToDateDelta > 0
                      ? "text-nlc-over"
                      : data.monthToDateDelta < 0
                        ? "text-nlc-under"
                        : "text-foreground",
                  )}
                />{" "}
                {hs.comparedToPrevious}
              </p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
