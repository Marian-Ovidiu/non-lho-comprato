"use client";

import { Eyebrow } from "@/components/crafted";
import { cn } from "@/lib/utils";
import { shiftDateKey } from "@/src/lib/workspace-dates";

/**
 * La grammatica dei pannelli a foglio.
 *
 * Nasce nell'aggiunta rapida e da lì viene: non è una seconda grammatica, sono
 * le stesse regole tirate fuori dal file in cui erano scritte, perché adesso i
 * pannelli sono tre e la stessa forma copiata tre volte è la condizione da cui
 * nascono le divergenze.
 *
 * Le regole, per chi ne aggiunge un quarto:
 *   - il pannello è un foglio incollato al bordo basso su telefono e una carta
 *     centrata da `sm` in su; non è vetro e non porta un secondo fondo;
 *   - i controlli stanno dentro **una lastra piatta sola** (`--surface-muted`,
 *     raggio di card, separatori interni). Niente vetro dentro un pannello che
 *     è già una superficie;
 *   - **nessuna riga con una parola sola**: etichetta a sinistra, sostanza a
 *     destra, sulla stessa riga. Dove l'etichetta non serve, non c'è;
 *   - lo stato si dice con il materiale (la cella piena), mai con il lime. Il
 *     lime è l'azione, e in un pannello l'azione è una sola.
 */

/** La geometria del foglio: in basso sul telefono, centrato da `sm` in su. */
export const PANEL_SHEET_CLASS = cn(
  "inset-x-2 top-auto bottom-[var(--nlc-kb,0px)] w-auto max-w-none translate-x-0 translate-y-0",
  "overflow-x-hidden rounded-t-[var(--r-sheet)] rounded-b-none border-border bg-surface p-0",
  "shadow-[var(--shadow-sheet)]",
  "data-open:animate-in data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:slide-out-to-bottom-4",
  "sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2",
  "sm:rounded-[var(--r-sheet)] sm:data-open:zoom-in-95 sm:data-closed:zoom-out-95",
);

/** Il corpo scorrevole del foglio, con il guinzaglio della tastiera. */
export const PANEL_BODY_CLASS = cn(
  "flex max-h-[min(88vh,calc(100vh-var(--nlc-kb,0px)-1.5rem))] min-w-0 flex-col",
  "overflow-y-auto overflow-x-hidden overscroll-contain",
);

/** La lastra piatta che raccoglie i controlli. Una sola per pannello. */
export const PANEL_SLAB_CLASS =
  "grid divide-y divide-line overflow-hidden rounded-[var(--r-card)] bg-surface-muted";

/** Il gesto principale: campitura lime, l'unica della schermata. */
export const PANEL_CTA_CLASS = cn(
  "flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--r-cta)] text-[15.5px] font-bold",
  "outline-none transition-[opacity,transform,background-color] duration-200 motion-reduce:transition-none",
  "focus-visible:ring-2 focus-visible:ring-ring/50",
);

/**
 * Il campo in cui si scrive un importo.
 *
 * Porta `.nlc-amount`, cioè la tipografia dei soldi dell'app, e non `font-num`.
 * Non è pignoleria: `.font-num` in `:root` è **Geist Mono**, e l'Instrument Sans
 * tabulare arriva solo da `.nlc-glass-home`, che è la dashboard. Un pannello
 * vive in un portale, cioè fuori da quello scope — quindi ogni importo scritto
 * dentro un foglio usciva in monospace, che è precisamente il carattere da cui
 * questa direzione artistica ha tolto i numeri. Il numero che si scrive deve
 * avere la faccia del numero che poi si legge.
 */
export const PANEL_MONEY_INPUT_CLASS = cn(
  "nlc-amount min-w-0 max-w-full bg-transparent text-[23px] font-semibold text-foreground outline-none",
  "placeholder:font-normal placeholder:text-ink-3/60",
);

export const PANEL_MONEY_SYMBOL_CLASS = "nlc-amount text-[15px] text-ink-3";

/**
 * La larghezza del campo importo, misurata sul contenuto.
 *
 * Serve a tenere il simbolo di valuta attaccato al numero: con un input a
 * larghezza piena e il testo allineato a destra, la `€` resta dov'è e finisce
 * accanto all'etichetta, a mezza riga di distanza dalle cifre che dovrebbe
 * introdurre. Le cifre sono tabulari, quindi un `ch` è una misura onesta; il
 * `+1` è il margine per la virgola e per il meno.
 */
export function moneyFieldWidth(value: string, placeholder = "0,00") {
  return `${Math.max(placeholder.length, value.length) + 1}ch`;
}

/** Una cella di un segmentato: lo stato si dice con il materiale, mai col lime. */
export function segmentClassName(active: boolean) {
  return cn(
    "flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-[calc(var(--r-control)-4px)] px-2 py-1.5",
    "text-center text-[13px] font-medium leading-4 outline-none",
    "transition-colors duration-150 motion-reduce:transition-none",
    "focus-visible:ring-2 focus-visible:ring-ring/50",
    active
      ? "bg-foreground text-background"
      : "text-muted-text hover:bg-surface-muted hover:text-foreground",
  );
}

/** La cornice di un segmentato dentro una riga della lastra. */
export function segmentGroupClassName(columns: number) {
  return cn(
    "ml-auto grid min-w-0 flex-1 gap-1 rounded-[var(--r-control)] bg-background p-1",
    columns === 2 ? "grid-cols-2" : "grid-cols-3",
  );
}

/**
 * Una riga della lastra: etichetta a sinistra, sostanza a destra.
 * È la regola che tiene insieme tutti i pannelli — se una riga porta una parola
 * sola, quella riga è sbagliata, non l'etichetta.
 */
export function PanelRow({
  label,
  labelFor,
  children,
  className,
}: {
  label: string;
  labelFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const eyebrow = (
    <Eyebrow className="shrink-0 text-muted-foreground">{label}</Eyebrow>
  );

  return (
    <div className={cn("flex items-center gap-3 px-3.5 py-2.5", className)}>
      {labelFor ? (
        <label htmlFor={labelFor} className="shrink-0">
          {eyebrow}
        </label>
      ) : (
        eyebrow
      )}
      {children}
    </div>
  );
}

function formatShortDate(dateKey: string, locale: string) {
  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return dateKey;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * La riga della data: etichetta a sinistra, tre celle a destra — Oggi, Ieri, e
 * una terza che è il calendario di sistema.
 *
 * Quando la data è personalizzata la terza cella smette di dire «Altra» e
 * scrive la data: il controllo mostra il proprio stato invece di nasconderlo
 * dietro una parola generica. L'input `type="date"` copre la cella a opacità
 * zero, così il dito apre il selettore nativo e la tastiera lo raggiunge lo
 * stesso.
 *
 * `todayKey` arriva da chi chiama e non dal browser: nell'aggiunta rapida è il
 * giorno del telefono, nei pannelli del saldo è il giorno del workspace, che
 * con un fuso diverso non è lo stesso giorno.
 */
export function DateSegmentedRow({
  value,
  onChange,
  todayKey,
  locale,
  labels,
}: {
  value: string;
  onChange: (next: string) => void;
  todayKey: string;
  locale: string;
  labels: {
    row: string;
    group: string;
    today: string;
    yesterday: string;
    other: string;
    otherAria: string;
  };
}) {
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const isCustom = value !== todayKey && value !== yesterdayKey;

  return (
    <PanelRow label={labels.row}>
      <div
        role="group"
        aria-label={labels.group}
        className={segmentGroupClassName(3)}
      >
        <button
          type="button"
          className={segmentClassName(value === todayKey)}
          aria-pressed={value === todayKey}
          onClick={() => onChange(todayKey)}
        >
          {labels.today}
        </button>
        <button
          type="button"
          className={segmentClassName(value === yesterdayKey)}
          aria-pressed={value === yesterdayKey}
          onClick={() => onChange(yesterdayKey)}
        >
          {labels.yesterday}
        </button>
        <label className={cn("relative", segmentClassName(isCustom))}>
          <span className="truncate">
            {isCustom ? formatShortDate(value, locale) : labels.other}
          </span>
          <input
            type="date"
            value={value}
            aria-label={labels.otherAria}
            onClick={(event) => {
              try {
                event.currentTarget.showPicker?.();
              } catch {
                /* Safari e i browser che non lo espongono aprono comunque il
                   loro selettore al tocco: qui non c'è niente da fare. */
              }
            }}
            onChange={(event) => {
              if (event.target.value) {
                onChange(event.target.value);
              }
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>
    </PanelRow>
  );
}
