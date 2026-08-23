/**
 * Il cursore del feed dei movimenti.
 *
 * L'elenco delle spese paginava sull'id di `Entry`, e finché le righe venivano
 * da una tabella sola bastava. Ora ne arrivano da tre — spese, entrate,
 * giroconti — e un id non dice più a che punto dell'ordine ci si è fermati:
 * due tabelle diverse possono avere righe con lo stesso posto in classifica.
 *
 * Il cursore diventa quindi la chiave d'ordinamento intera: data, istante di
 * creazione, id. È la stessa terna con cui il feed ordina, quindi "riprendi
 * da dopo questa riga" si traduce in un confronto solo, che Postgres sa fare
 * su una tupla: `(date, createdAt, id) < (...)`.
 *
 * Resta una stringa opaca: chi la riceve la rimanda indietro e basta.
 */

export type FeedCursor = {
  date: Date;
  createdAt: Date;
  id: string;
};

/** L'ordine del feed, dal più recente al più vecchio. */
export const FEED_ORDER_SQL = 'ORDER BY "date" DESC, "createdAt" DESC, "id" DESC';

const SEPARATORE = "|";

export function encodeFeedCursor(cursor: FeedCursor): string {
  return [
    cursor.date.toISOString(),
    cursor.createdAt.toISOString(),
    cursor.id,
  ].join(SEPARATORE);
}

/**
 * Torna nullo su qualunque cosa non sia un cursore che abbiamo scritto noi.
 * Un cursore illeggibile vale come nessun cursore — si riparte dalla prima
 * pagina invece di far esplodere l'elenco.
 */
export function decodeFeedCursor(raw: string | null | undefined): FeedCursor | null {
  if (!raw) {
    return null;
  }

  const parti = raw.split(SEPARATORE);

  if (parti.length !== 3) {
    return null;
  }

  const [rawDate, rawCreatedAt, id] = parti;
  const date = new Date(rawDate);
  const createdAt = new Date(rawCreatedAt);

  if (!id || Number.isNaN(date.getTime()) || Number.isNaN(createdAt.getTime())) {
    return null;
  }

  return { date, createdAt, id };
}

export type FeedRowKind = "entry" | "income" | "transfer";

export type FeedRowRef = {
  kind: FeedRowKind;
  id: string;
  date: Date;
  createdAt: Date;
};

/**
 * Taglia la pagina e dice se ce n'è un'altra. La query chiede sempre una riga
 * in più del necessario: se torna, esiste il seguito, e il cursore è l'ultima
 * riga che teniamo — non quella in più, che appartiene già alla pagina dopo.
 */
export function sliceFeedPage(
  rows: FeedRowRef[],
  limit: number,
): { rows: FeedRowRef[]; nextCursor: string | null; hasMore: boolean } {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const ultima = page.at(-1);

  return {
    rows: page,
    hasMore,
    nextCursor: hasMore && ultima ? encodeFeedCursor(ultima) : null,
  };
}
