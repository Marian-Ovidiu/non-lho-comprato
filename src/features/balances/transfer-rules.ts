/**
 * Le regole di un giroconto, prima che tocchi il database.
 *
 * Stanno qui e non nell'action per lo stesso motivo per cui ci sta il resto
 * del calcolo dei saldi: una regola in una funzione pura si verifica, una
 * regola dentro una server action si spera.
 *
 * La regola non ovvia è quella sulle date, e vale la pena dire perché esiste.
 * Ogni saldo ha la sua data di partenza e ignora tutto ciò che è precedente:
 * è quello che ha reso indolore l'arrivo dei saldi su mesi di movimenti già
 * registrati. Un giroconto però è l'unico movimento che ne tocca due insieme,
 * e le due date di partenza possono essere diverse. Se il giroconto cade in
 * mezzo, un saldo lo conta e l'altro no: quattrocento euro escono dal conto
 * personale e non entrano nel comune, e nessuno se ne accorge.
 *
 * Prima di entrambe le date va bene, perché lo ignorano tutti e due allo
 * stesso modo. Dopo entrambe va bene, perché lo contano tutti e due. È solo
 * la finestra in mezzo a essere una bugia, ed è l'unica che rifiutiamo.
 *
 * Chi muove i soldi non è fra le regole perché non è una scelta: un giroconto
 * parte sempre dal conto di chi lo sta registrando. Nessuno puo' far scendere
 * il saldo personale dell'altra persona, nemmeno per versarlo nel comune —
 * è la stessa regola per cui il saldo di partenza lo imposta solo il diretto
 * interessato (setBalanceStartAction). Lo storico dei versamenti si riempie da
 * due lati, uno per persona, e resta visibile a entrambi.
 */

export const TRANSFER_DIRECTIONS = ["to_joint", "to_personal"] as const;

export type TransferDirectionValue = (typeof TRANSFER_DIRECTIONS)[number];

export function isTransferDirection(
  value: unknown,
): value is TransferDirectionValue {
  return TRANSFER_DIRECTIONS.includes(value as TransferDirectionValue);
}

export type TransferRulesInput = {
  amount: number;
  dateKey: string;
  direction: unknown;
  /** Il conto comune esiste solo dove ci sono almeno due persone. */
  isShared: boolean;
  /** Data di partenza del saldo di chi sta registrando, se l'ha impostata. */
  personalStartDateKey: string | null;
  /** Data di partenza del conto comune, se qualcuno l'ha impostata. */
  jointStartDateKey: string | null;
};

export type TransferRulesResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

/**
 * Vero quando il giroconto finirebbe dentro la finestra fra le due date di
 * partenza: contato da un saldo e ignorato dall'altro.
 */
export function fallsBetweenBalanceStarts(
  dateKey: string,
  personalStartDateKey: string | null,
  jointStartDateKey: string | null,
): boolean {
  if (!personalStartDateKey || !jointStartDateKey) {
    return false;
  }

  const prima =
    personalStartDateKey < jointStartDateKey
      ? personalStartDateKey
      : jointStartDateKey;
  const dopo =
    personalStartDateKey < jointStartDateKey
      ? jointStartDateKey
      : personalStartDateKey;

  return dateKey >= prima && dateKey < dopo;
}

export function validateTransfer(input: TransferRulesInput): TransferRulesResult {
  const errors: Record<string, string> = {};

  if (!input.isShared) {
    errors.direction =
      "Il conto comune esiste solo negli spazi condivisi: qui non c'e' niente da girare.";
  }

  if (!isTransferDirection(input.direction)) {
    errors.direction = "Scegli se stai versando sul comune o prelevando.";
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.amount = "L'importo deve essere maggiore di zero.";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateKey)) {
    errors.date = "Data non valida.";
  } else if (
    fallsBetweenBalanceStarts(
      input.dateKey,
      input.personalStartDateKey,
      input.jointStartDateKey,
    )
  ) {
    errors.date = `Questa data cade fra le due date di partenza dei saldi (${input.personalStartDateKey} il personale, ${input.jointStartDateKey} il comune): un saldo conterebbe il giroconto e l'altro no.`;
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}
