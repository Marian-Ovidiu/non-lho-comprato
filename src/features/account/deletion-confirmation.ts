/**
 * Parola di conferma per l'eliminazione dell'account.
 *
 * Client e server devono guardare la stessa cosa. Finché il client
 * confrontava la parola tradotta e il server la sola versione italiana, in
 * inglese il modulo chiedeva di scrivere DELETE, il bottone si accendeva e poi
 * la risposta diceva di scrivere ELIMINA: nessuna delle due parole portava a
 * termine l'operazione.
 */

export const ACCOUNT_DELETION_WORDS: Record<string, string> = {
  it: "ELIMINA",
  en: "DELETE",
};

export const DEFAULT_ACCOUNT_DELETION_WORD = ACCOUNT_DELETION_WORDS.it!;

export function getAccountDeletionWord(language: string | null | undefined): string {
  const key = language?.trim().toLowerCase() ?? "";
  return ACCOUNT_DELETION_WORDS[key] ?? DEFAULT_ACCOUNT_DELETION_WORD;
}

/**
 * Accetta la parola in una qualsiasi delle lingue supportate, senza badare a
 * maiuscole e spazi: la lingua dello spazio può cambiare tra il momento in cui
 * la pagina viene mostrata e quello in cui il modulo viene inviato, e chi ha
 * appena letto "scrivi ELIMINA" non deve indovinare anche la forma esatta.
 */
export function isAccountDeletionConfirmed(input: string | null | undefined): boolean {
  const normalized = input?.trim().toUpperCase() ?? "";

  if (!normalized) {
    return false;
  }

  return Object.values(ACCOUNT_DELETION_WORDS).some((word) => word === normalized);
}
