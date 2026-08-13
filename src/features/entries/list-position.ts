/**
 * Memoria di dov'era l'elenco movimenti quando se n'è usciti.
 *
 * Tornare indietro da un movimento aperto deve riportare alla riga da cui si
 * era partiti. Ripristinare solo lo scorrimento non basta: l'elenco tiene i
 * movimenti in stato client e ne carica venti per volta, quindi al rimontaggio
 * si ritrova con la prima pagina e la riga cercata può non esserci più.
 *
 * Quello che va conservato è quindi lo *stato della vista* — filtri e quante
 * pagine erano caricate — non i dati: al ritorno l'elenco viene ricaricato dal
 * server con la stessa ampiezza, così la posizione è giusta e i movimenti sono
 * aggiornati anche se nel frattempo quello aperto è stato modificato.
 */

import type { EntriesKindFilter } from "@/src/features/entries/search";

export type EntriesListSnapshot = {
  monthKey: string;
  query: string;
  kind: EntriesKindFilter;
  categoryIds: string[];
  /** Quanti movimenti erano caricati, per ricaricarli tutti in una volta. */
  loadedCount: number;
  /** Riga da cui si è usciti: è lì che si deve tornare. */
  anchorEntryId: string;
  savedAt: number;
};

export const ENTRIES_SNAPSHOT_STORAGE_KEY = "nlc_entries_list_position";

/** Oltre questa soglia il ripristino costerebbe più di quanto valga. */
export const MAX_RESTORED_ENTRIES = 200;

/**
 * Uno scatto vecchio non descrive più l'intenzione dell'utente: se si torna
 * su /entries mezz'ora dopo, si vuole l'elenco dall'inizio.
 */
export const SNAPSHOT_TTL_MS = 10 * 60 * 1000;

export function entryAnchorId(entryId: string): string {
  return `entry-row-${entryId}`;
}

/**
 * Quante righe restano allo scorrimento morbido. Sotto questa distanza il
 * ritorno è tutto morbido; sopra, si salta di colpo fin qui e si scivola solo
 * l'ultimo tratto — quello che serve a capire dove si è atterrati, senza far
 * viaggiare l'occhio per mezzo elenco.
 */
export const SMOOTH_TAIL_ROWS = 10;

export type RestoreScrollPlan = {
  /** Salto secco, per accorciare la strada. Null se non serve. */
  instantTo: number | null;
  /** Tratto finale morbido. Null quando il movimento va fatto tutto secco. */
  smoothTo: number | null;
};

export function planRestoreScroll(input: {
  currentScroll: number;
  destination: number;
  rowHeight: number;
  prefersReducedMotion: boolean;
}): RestoreScrollPlan {
  const { currentScroll, destination, rowHeight, prefersReducedMotion } = input;

  if (prefersReducedMotion) {
    return { instantTo: destination, smoothTo: null };
  }

  const tail = Math.max(rowHeight, 1) * SMOOTH_TAIL_ROWS;
  const distance = Math.abs(destination - currentScroll);

  if (distance <= tail) {
    return { instantTo: null, smoothTo: destination };
  }

  /* Il salto atterra a una coda di distanza dalla meta, dalla parte da cui si
     stava arrivando: così la parte morbida si muove sempre nello stesso verso
     del viaggio, e non si vede un rimbalzo all'indietro. */
  const approach =
    destination > currentScroll ? destination - tail : destination + tail;

  return { instantTo: approach, smoothTo: destination };
}

export function isSnapshotUsable(
  snapshot: EntriesListSnapshot | null,
  monthKey: string,
  now: number,
): snapshot is EntriesListSnapshot {
  if (!snapshot) {
    return false;
  }

  if (snapshot.monthKey !== monthKey) {
    return false;
  }

  if (!snapshot.anchorEntryId) {
    return false;
  }

  const age = now - snapshot.savedAt;
  return age >= 0 && age <= SNAPSHOT_TTL_MS;
}

export function clampRestoredCount(loadedCount: number, pageSize: number): number {
  if (!Number.isFinite(loadedCount) || loadedCount <= 0) {
    return pageSize;
  }

  return Math.min(Math.max(Math.ceil(loadedCount), pageSize), MAX_RESTORED_ENTRIES);
}

export function parseSnapshot(raw: string | null): EntriesListSnapshot | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<EntriesListSnapshot>;

    if (
      typeof parsed?.monthKey !== "string" ||
      typeof parsed?.anchorEntryId !== "string" ||
      typeof parsed?.savedAt !== "number"
    ) {
      return null;
    }

    return {
      monthKey: parsed.monthKey,
      query: typeof parsed.query === "string" ? parsed.query : "",
      kind: (parsed.kind ?? "all") as EntriesKindFilter,
      categoryIds: Array.isArray(parsed.categoryIds)
        ? parsed.categoryIds.filter((id): id is string => typeof id === "string")
        : [],
      loadedCount:
        typeof parsed.loadedCount === "number" && Number.isFinite(parsed.loadedCount)
          ? parsed.loadedCount
          : 0,
      anchorEntryId: parsed.anchorEntryId,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function readSnapshot(
  storage: Pick<Storage, "getItem" | "removeItem"> | null,
): EntriesListSnapshot | null {
  if (!storage) {
    return null;
  }

  const snapshot = parseSnapshot(storage.getItem(ENTRIES_SNAPSHOT_STORAGE_KEY));
  // Lettura una tantum: il ripristino vale per il ritorno indietro, non per
  // ogni visita successiva alla pagina.
  storage.removeItem(ENTRIES_SNAPSHOT_STORAGE_KEY);

  return snapshot;
}

export function writeSnapshot(
  storage: Pick<Storage, "setItem"> | null,
  snapshot: EntriesListSnapshot,
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(ENTRIES_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // spazio esaurito o storage negato: si perde solo la posizione
  }
}
