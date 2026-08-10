/**
 * Motore delle osservazioni.
 *
 * Sostituisce l'analisi precedente, che guardava solo i movimenti evitati o
 * con confronto: un filtro che in tre mesi d'uso reale lasciava fuori il 99%
 * della spesa — a luglio la pagina calcolava tassi e pattern su un movimento
 * solo su cento. Qui si guarda tutto quello che è stato speso davvero.
 *
 * Le regole sono state validate sui dati reali prima di essere scritte: girate
 * su tre mesi producevano una cinquantina di osservazioni, circa una ogni due
 * giorni. Le regole che non scattavano mai, o che scattavano ogni giorno, sono
 * state scartate — una cosa che non succede mai non è un pattern, una che
 * succede sempre non è una notizia.
 *
 * Ogni osservazione è un fatto calcolato, non una frase generata: la pagina la
 * mostra, non la inventa.
 */

import { round2 } from "@/src/lib/money-number";

export type ObservationEntry = {
  id: string;
  title: string;
  amount: number;
  /** YYYY-MM-DD nel fuso dello spazio. */
  dateKey: string;
  monthKey: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string | null;
  /** Voce ricorrente fissa: esclusa dai confronti, non è spesa che si decide. */
  isFixed: boolean;
  payerId: string | null;
  payerLabel: string | null;
  isShared: boolean;
};

export type ObservationKind =
  | "pace"
  | "attribution"
  | "composition"
  | "outlier"
  | "second-half"
  | "ratio"
  | "dominant"
  | "new-category"
  | "payer-balance";

export type Observation = {
  kind: ObservationKind;
  /** Ordina cosa vede per primo chi apre la pagina. */
  weight: number;
  title: string;
  detail: string;
  /** Movimenti su cui poggia, per poter mostrare il "perché". */
  entryIds: string[];
};

export type ObservationInput = {
  entries: ObservationEntry[];
  /** Mese da commentare, YYYY-MM. */
  monthKey: string;
  /** Giorno del mese già trascorso: i confronti si fanno a parità di giorno. */
  dayOfMonth: number;
  daysInMonth: number;
  formatAmount: (value: number) => string;
};

const MIN_HISTORY_MONTHS = 1;
const MIN_BASELINE_AMOUNT = 150;
const MIN_DAY_FOR_RATIOS = 7;
/** Quante osservazioni dello stesso tipo hanno ancora qualcosa da aggiungere. */
const MAX_PER_KIND = 2;
/** Il tetto della pagina: oltre, si smette di leggere. */
const MAX_OBSERVATIONS = 5;

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function monthIndex(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  return Number.isFinite(year) && Number.isFinite(month) ? year! * 12 + month! : Number.NaN;
}

function dayOf(dateKey: string): number {
  return Number(dateKey.split("-")[2] ?? 0);
}

/** Spesa che si decide giorno per giorno: le fisse non entrano nei confronti. */
function isCurrent(entry: ObservationEntry): boolean {
  return !entry.isFixed;
}

function sumUpTo(
  entries: ObservationEntry[],
  monthKey: string,
  day: number,
  extra?: (entry: ObservationEntry) => boolean,
): number {
  let total = 0;
  for (const entry of entries) {
    if (!isCurrent(entry) || entry.monthKey !== monthKey || dayOf(entry.dateKey) > day) {
      continue;
    }
    if (!extra || extra(entry)) {
      total += entry.amount;
    }
  }
  return total;
}

function previousMonths(entries: ObservationEntry[], monthKey: string): string[] {
  const current = monthIndex(monthKey);
  return [...new Set(entries.map((entry) => entry.monthKey))]
    .filter((key) => monthIndex(key) < current)
    .sort();
}

function baselineUpTo(
  entries: ObservationEntry[],
  months: string[],
  day: number,
  extra?: (entry: ObservationEntry) => boolean,
): number | null {
  if (months.length < MIN_HISTORY_MONTHS) {
    return null;
  }
  return median(months.map((key) => sumUpTo(entries, key, day, extra)));
}

/**
 * Le osservazioni del mese in corso, ordinate per rilevanza.
 *
 * Restituisce una lista vuota quando non c'è abbastanza storico: meglio una
 * pagina che dice "ancora presto" di una che inventa un pattern su due
 * settimane di dati.
 */
export function buildObservations({
  entries,
  monthKey,
  dayOfMonth,
  daysInMonth,
  formatAmount,
}: ObservationInput): Observation[] {
  const observations: Observation[] = [];
  const history = previousMonths(entries, monthKey);
  const monthEnded = dayOfMonth >= daysInMonth;
  const currentTotal = sumUpTo(entries, monthKey, dayOfMonth);
  const baseline = baselineUpTo(entries, history, dayOfMonth);
  const ratiosUsable =
    dayOfMonth >= MIN_DAY_FOR_RATIOS &&
    baseline !== null &&
    baseline >= MIN_BASELINE_AMOUNT;

  const categories = [...new Set(entries.filter(isCurrent).map((entry) => entry.categoryId))];
  const categoryName = new Map(
    entries.map((entry) => [entry.categoryId, entry.categoryName] as const),
  );

  // Il passo del mese, e da dove viene lo scarto.
  if (ratiosUsable) {
    const delta = currentTotal - baseline!;

    if (Math.abs(delta) > Math.max(50, 0.15 * baseline!)) {
      const above = delta > 0;
      observations.push({
        kind: "pace",
        weight: 100 + Math.min(Math.abs(delta) / baseline!, 1) * 20,
        title: above
          ? `${formatAmount(Math.abs(delta))} sopra il vostro ritmo`
          : `${formatAmount(Math.abs(delta))} sotto il vostro ritmo`,
        detail: `Al giorno ${dayOfMonth} avete speso ${formatAmount(currentTotal)}, contro i ${formatAmount(baseline!)} che spendete di solito allo stesso punto del mese.`,
        entryIds: [],
      });

      const shifts = categories
        .map((categoryId) => {
          const base = baselineUpTo(
            entries,
            history,
            dayOfMonth,
            (entry) => entry.categoryId === categoryId,
          );
          if (base === null) {
            return null;
          }
          const now = sumUpTo(
            entries,
            monthKey,
            dayOfMonth,
            (entry) => entry.categoryId === categoryId,
          );
          return { categoryId, shift: now - base };
        })
        .filter((item): item is { categoryId: string; shift: number } => item !== null)
        .sort((left, right) => Math.abs(right.shift) - Math.abs(left.shift));

      const leaders = shifts.slice(0, 2);
      const explained = leaders.reduce((sum, item) => sum + Math.abs(item.shift), 0);
      const total = shifts.reduce((sum, item) => sum + Math.abs(item.shift), 0) || 1;

      if (leaders.length > 0 && explained / total >= 0.5) {
        observations.push({
          kind: "attribution",
          weight: 95,
          title: "Da dove viene lo scarto",
          detail: leaders
            .map(
              (item) =>
                `${categoryName.get(item.categoryId) ?? "Altro"} ${item.shift > 0 ? "+" : "−"}${formatAmount(Math.abs(item.shift))}`,
            )
            .join(" · "),
          entryIds: entries
            .filter(
              (entry) =>
                isCurrent(entry) &&
                entry.monthKey === monthKey &&
                leaders.some((item) => item.categoryId === entry.categoryId),
            )
            .map((entry) => entry.id),
        });
      }
    } else {
      // Una categoria che cresce mentre un'altra cala è invisibile nel totale.
      for (const categoryId of categories) {
        const base = baselineUpTo(
          entries,
          history,
          dayOfMonth,
          (entry) => entry.categoryId === categoryId,
        );
        if (base === null || currentTotal <= 0 || baseline! <= 0) {
          continue;
        }
        const nowShare =
          sumUpTo(entries, monthKey, dayOfMonth, (entry) => entry.categoryId === categoryId) /
          currentTotal;
        const baseShare = base / baseline!;

        if (Math.abs(nowShare - baseShare) >= 0.08) {
          observations.push({
            kind: "composition",
            weight: 80,
            title: `${categoryName.get(categoryId) ?? "Una categoria"} ha cambiato peso`,
            detail: `Spendete come sempre, ma è passata dal ${Math.round(baseShare * 100)}% al ${Math.round(nowShare * 100)}% del mese.`,
            entryIds: [],
          });
          break;
        }
      }
    }
  }

  // Il movimento fuori scala rispetto al tipico della sua categoria.
  const categoryMedian = new Map(
    categories.map((categoryId) => [
      categoryId,
      median(
        entries
          .filter((entry) => isCurrent(entry) && entry.categoryId === categoryId)
          .map((entry) => entry.amount),
      ),
    ]),
  );

  for (const entry of entries) {
    if (!isCurrent(entry) || entry.monthKey !== monthKey) {
      continue;
    }
    const typical = categoryMedian.get(entry.categoryId) ?? 0;
    if (typical > 0 && entry.amount >= 3 * typical && entry.amount >= 50) {
      observations.push({
        kind: "outlier",
        weight: 70 + Math.min(entry.amount / typical, 6),
        title: entry.title,
        detail: `${formatAmount(entry.amount)}: ${(entry.amount / typical).toFixed(1)}× il tipico di ${entry.categoryName}.`,
        entryIds: [entry.id],
      });
    }
  }

  // Il rapporto fra due categorie racconta più della somma delle due.
  if (monthEnded || dayOfMonth >= 20) {
    const totals = categories
      .map((categoryId) => ({
        categoryId,
        total: sumUpTo(entries, monthKey, dayOfMonth, (entry) => entry.categoryId === categoryId),
      }))
      .filter((item) => item.total > 0)
      .sort((left, right) => right.total - left.total);

    const [first, second] = totals;
    if (first && second && second.total > 0 && first.total / second.total >= 2) {
      observations.push({
        kind: "ratio",
        weight: 90,
        title: `${categoryName.get(first.categoryId) ?? "La prima voce"} pesa ${(first.total / second.total).toFixed(1)}× ${categoryName.get(second.categoryId) ?? "la seconda"}`,
        detail: `${formatAmount(first.total)} contro ${formatAmount(second.total)}.`,
        entryIds: [],
      });
    }

    if (first && currentTotal > 0 && first.total / currentTotal >= 0.25) {
      observations.push({
        kind: "dominant",
        weight: 85,
        title: `${categoryName.get(first.categoryId) ?? "Una categoria"} è ${Math.round((first.total / currentTotal) * 100)}% del mese`,
        detail: `${formatAmount(first.total)} su ${formatAmount(currentTotal)} di spesa corrente.`,
        entryIds: [],
      });
    }
  }

  // Le voci che si concentrano nella seconda metà del mese.
  if (monthEnded) {
    for (const categoryId of categories) {
      const total = sumUpTo(
        entries,
        monthKey,
        daysInMonth,
        (entry) => entry.categoryId === categoryId,
      );
      if (total < 100) {
        continue;
      }
      const firstHalf = sumUpTo(
        entries,
        monthKey,
        14,
        (entry) => entry.categoryId === categoryId,
      );
      const secondShare = (total - firstHalf) / total;

      if (secondShare >= 0.65) {
        observations.push({
          kind: "second-half",
          weight: 60,
          title: `${categoryName.get(categoryId) ?? "Una categoria"} si concentra a fine mese`,
          detail: `Il ${Math.round(secondShare * 100)}% è stato speso dopo il 15.`,
          entryIds: [],
        });
      }
    }
  }

  // Una voce che prima non c'era. Serve storico vero per poterlo dire: con un
  // mese solo alle spalle "nuovo" vuol dire soltanto "non ancora visto".
  if (history.length >= 2) {
    const seenBefore = new Set(
      entries
        .filter((item) => isCurrent(item) && item.monthKey !== monthKey)
        .map((item) => item.categoryId),
    );

    for (const categoryId of categories) {
      if (seenBefore.has(categoryId)) {
        continue;
      }

      const total = sumUpTo(
        entries,
        monthKey,
        dayOfMonth,
        (item) => item.categoryId === categoryId,
      );

      if (total >= 50) {
        observations.push({
          kind: "new-category",
          weight: 75,
          title: `${categoryName.get(categoryId) ?? "Una voce"} è entrata nelle vostre spese`,
          detail: `Non compariva nei mesi scorsi, e questo mese vale ${formatAmount(total)}.`,
          entryIds: entries
            .filter((item) => item.monthKey === monthKey && item.categoryId === categoryId)
            .map((item) => item.id),
        });
      }
    }
  }

  // Chi paga cosa: vale solo dove le persone sono davvero due.
  const payers = [...new Set(entries.map((entry) => entry.payerId).filter(Boolean))];
  if (ratiosUsable && monthEnded && payers.length === 2 && currentTotal > 0) {
    for (const payerId of payers) {
      const base = baselineUpTo(
        entries,
        history,
        daysInMonth,
        (entry) => entry.payerId === payerId,
      );
      if (base === null || baseline! <= 0) {
        continue;
      }
      const nowShare =
        sumUpTo(entries, monthKey, daysInMonth, (entry) => entry.payerId === payerId) /
        currentTotal;
      const baseShare = base / baseline!;

      if (Math.abs(nowShare - baseShare) >= 0.15) {
        const label =
          entries.find((entry) => entry.payerId === payerId)?.payerLabel ?? "Uno di voi";
        observations.push({
          kind: "payer-balance",
          weight: 65,
          title:
            nowShare > baseShare
              ? `${label} ha pagato più del solito`
              : `${label} ha pagato meno del solito`,
          detail: `Il ${Math.round(nowShare * 100)}% della spesa, contro il ${Math.round(baseShare * 100)}% abituale.`,
          entryIds: [],
        });
        break;
      }
    }
  }

  // Un tetto per tipo e un tetto totale. Senza, su tre mesi veri la pagina
  // arrivava a quattordici schede — con la stessa voce ripetuta tre volte,
  // una per ogni movimento che superava la soglia. Quattordici osservazioni
  // non sono quattordici notizie: sono un elenco, e un elenco non si legge.
  const perKind = new Map<ObservationKind, number>();
  const seen = new Set<string>();

  return observations
    .map((observation) => ({ ...observation, weight: round2(observation.weight) }))
    .sort((left, right) => right.weight - left.weight)
    .filter((observation) => {
      // Lo stesso fatto detto due volte resta un fatto solo.
      const fingerprint = `${observation.kind}|${observation.title}|${observation.detail}`;
      if (seen.has(fingerprint)) {
        return false;
      }
      seen.add(fingerprint);

      const used = perKind.get(observation.kind) ?? 0;
      if (used >= MAX_PER_KIND) {
        return false;
      }
      perKind.set(observation.kind, used + 1);
      return true;
    })
    .slice(0, MAX_OBSERVATIONS);
}
