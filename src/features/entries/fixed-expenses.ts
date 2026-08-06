/**
 * Rilevamento automatico delle spese fisse ricorrenti.
 *
 * Serve a separare ciò che è già impegnato (affitto, tasse, abbonamenti) dalla
 * spesa corrente, quella che si decide giorno per giorno. Sommare le due cose
 * rende il totale del mese illeggibile: un affitto registrato il 5 invece che
 * l'11 sposta il confronto con il mese precedente di centinaia di euro senza
 * che sia cambiato nulla nei consumi.
 *
 * Il riconoscimento è automatico e non richiede all'utente di etichettare
 * niente: si basa su titolo normalizzato, cadenza mensile e stabilità
 * dell'importo.
 */

export type RecurringSample = {
  title: string;
  amount: number;
  /** Chiave del mese in formato YYYY-MM. */
  monthKey: string;
  categoryId?: string | null;
  payerId?: string | null;
};

export type FixedExpenseGroup = {
  key: string;
  label: string;
  medianAmount: number;
  monthsSeen: number;
  occurrences: number;
  /** Come è stata riconosciuta: dal titolo o dalla firma importo/categoria. */
  matchedBy: "title" | "signature";
};

export type FixedExpenseDetection = {
  titleKeys: Set<string>;
  signatures: Set<string>;
  groups: FixedExpenseGroup[];
};

export type FixedExpenseOptions = {
  /** Mesi distinti minimi in cui la voce deve comparire. */
  minMonths?: number;
  /** Occorrenze medie per mese: una fissa ricorre circa una volta al mese. */
  maxPerMonth?: number;
  /** Scarto massimo tollerato sull'importo, come frazione della mediana. */
  maxVariation?: number;
  /** Importo minimo: sotto questa soglia il rumore supera il segnale. */
  minAmount?: number;
  /**
   * Quanto la serie deve essere piena tra la prima e l'ultima comparsa: una
   * fissa non salta mesi. "Farmacia a maggio e a luglio" sono due acquisti
   * occasionali che si somigliano, non un impegno mensile.
   */
  minDensity?: number;
  /**
   * Mese corrente (YYYY-MM). Se presente, la voce deve essersi vista in questo
   * mese o nel precedente: una fissa che è sparita non è più un impegno.
   */
  currentMonthKey?: string;
  /**
   * Come raggruppare i movimenti. Di default per titolo normalizzato; la
   * seconda passata usa la firma importo/categoria/pagante.
   */
  groupBy?: (sample: RecurringSample) => string | null;
};

const DEFAULTS = {
  minMonths: 2,
  maxPerMonth: 1.5,
  maxVariation: 0.3,
  minAmount: 15,
  minDensity: 0.75,
} satisfies Omit<Required<FixedExpenseOptions>, "currentMonthKey" | "groupBy">;

function monthIndex(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  return Number.isFinite(year) && Number.isFinite(month)
    ? year! * 12 + month!
    : Number.NaN;
}

const MONTH_WORDS =
  /\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|january|february|march|april|may|june|july|august|september|october|november|december)\b/gu;

/**
 * "Affitto maggio", "Affitto giugno 2026" e "Affitto" sono la stessa voce:
 * mese e anno nel titolo sono etichette, non identità.
 */
export function normalizeRecurringTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .replace(MONTH_WORDS, " ")
    .replace(/\b(19|20)\d{2}\b/gu, " ")
    .replace(/[^\p{Letter}\s]/gu, " ")
    .split(/\s+/u)
    .filter((word) => word.length > 1)
    .join(" ")
    .trim();
}

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

/**
 * Raggruppa i movimenti per titolo normalizzato e tiene solo i gruppi che si
 * comportano da spesa fissa. Il vincolo sulla cadenza è quello che evita di
 * classificare come fissa un'abitudine quotidiana di importo costante: un
 * caffè da 1,20€ preso ogni giorno è stabile quanto un affitto, ma non è un
 * impegno mensile.
 */
export function detectFixedExpenseGroups(
  samples: ReadonlyArray<RecurringSample>,
  options: FixedExpenseOptions = {},
): FixedExpenseGroup[] {
  const config = { ...DEFAULTS, ...options };
  const groups = new Map<
    string,
    { amounts: number[]; months: Set<string>; labels: Map<string, number> }
  >();

  const groupKeyOf =
    options.groupBy ?? ((sample: RecurringSample) => normalizeRecurringTitle(sample.title));

  for (const sample of samples) {
    const key = groupKeyOf(sample);
    if (!key) {
      continue;
    }

    const group = groups.get(key) ?? {
      amounts: [],
      months: new Set<string>(),
      labels: new Map<string, number>(),
    };

    group.amounts.push(sample.amount);
    group.months.add(sample.monthKey);
    group.labels.set(
      sample.title.trim(),
      (group.labels.get(sample.title.trim()) ?? 0) + 1,
    );
    groups.set(key, group);
  }

  const detected: FixedExpenseGroup[] = [];

  for (const [key, group] of groups) {
    const monthsSeen = group.months.size;
    if (monthsSeen < config.minMonths) {
      continue;
    }

    if (group.amounts.length / monthsSeen > config.maxPerMonth) {
      continue;
    }

    const indexes = [...group.months].map(monthIndex).filter(Number.isFinite);
    const first = Math.min(...indexes);
    const last = Math.max(...indexes);
    const span = last - first + 1;

    if (monthsSeen / span < config.minDensity) {
      continue;
    }

    if (config.currentMonthKey) {
      const current = monthIndex(config.currentMonthKey);
      if (Number.isFinite(current) && last < current - 1) {
        continue;
      }
    }

    const medianAmount = median(group.amounts);
    if (medianAmount < config.minAmount) {
      continue;
    }

    const spread = Math.max(...group.amounts) - Math.min(...group.amounts);
    if (spread / medianAmount > config.maxVariation) {
      continue;
    }

    const label =
      [...group.labels.entries()].sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
      )[0]?.[0] ?? key;

    detected.push({
      key,
      label,
      medianAmount,
      monthsSeen,
      occurrences: group.amounts.length,
      matchedBy: options.groupBy ? "signature" : "title",
    });
  }

  return detected.sort(
    (left, right) => right.medianAmount - left.medianAmount || left.key.localeCompare(right.key),
  );
}

export function toFixedExpenseKeySet(
  groups: ReadonlyArray<FixedExpenseGroup>,
): Set<string> {
  return new Set(groups.map((group) => group.key));
}

export function isFixedExpenseTitle(
  title: string,
  fixedKeys: ReadonlySet<string>,
): boolean {
  const key = normalizeRecurringTitle(title);
  return key.length > 0 && fixedKeys.has(key);
}

/**
 * Firma di un movimento indipendente da come è stato intitolato: stesso
 * pagante, stessa categoria, stesso importo al centesimo.
 *
 * Serve per le fisse che ogni mese vengono scritte in modo diverso — la quota
 * d'affitto registrata una volta come "ponte marti" e una come "Affitto
 * Ponte" è la stessa spesa, e nessuna normalizzazione del titolo può saperlo.
 * A reggere il riconoscimento è la ripetizione esatta al centesimo: la spesa
 * discrezionale quasi mai si ripete identica da un mese all'altro.
 */
export function fixedExpenseSignature(
  sample: Pick<RecurringSample, "amount" | "categoryId" | "payerId">,
): string | null {
  if (!sample.categoryId || !sample.payerId) {
    return null;
  }

  return `${sample.payerId}|${sample.categoryId}|${sample.amount.toFixed(2)}`;
}

/**
 * Riconoscimento completo: prima per titolo, poi — solo su ciò che resta —
 * per firma. L'ordine evita di contare due volte la stessa voce.
 */
export function detectFixedExpenses(
  samples: ReadonlyArray<RecurringSample>,
  options: FixedExpenseOptions = {},
): FixedExpenseDetection {
  const byTitle = detectFixedExpenseGroups(samples, options);
  const titleKeys = toFixedExpenseKeySet(byTitle);
  const remaining = samples.filter(
    (sample) => !isFixedExpenseTitle(sample.title, titleKeys),
  );

  const bySignature = detectFixedExpenseGroups(remaining, {
    ...options,
    groupBy: fixedExpenseSignature,
  });

  return {
    titleKeys,
    signatures: new Set(bySignature.map((group) => group.key)),
    groups: [...byTitle, ...bySignature],
  };
}

export function isFixedExpense(
  sample: RecurringSample,
  detection: Pick<FixedExpenseDetection, "titleKeys" | "signatures">,
): boolean {
  if (isFixedExpenseTitle(sample.title, detection.titleKeys)) {
    return true;
  }

  const signature = fixedExpenseSignature(sample);
  return signature !== null && detection.signatures.has(signature);
}
