"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Wallet, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTranslations } from "@/src/components/language/language-context";

/**
 * L'invito a impostare il saldo, alla prima apertura.
 *
 * **Non è un modale.** Un modale all'apertura è un muro, e il requisito dice
 * l'opposto: farsi vedere, e lasciarsi saltare senza attrito. Questo è il
 * pannello galleggiante che l'app usa già per il permesso alle notifiche —
 * stessa quota sopra il velo della barra, stesso fondo opaco — perché un
 * messaggio che galleggia non può dipendere da ciò che gli scorre dietro.
 *
 * Chi lo vede: chiunque non abbia un saldo. Non serve distinguere chi ha
 * aggiornato da chi si è appena registrato, perché le colonne sono nullable e
 * «non impostato» è già la condizione che li accomuna. Un flag «ha visto
 * l'aggiornamento» sarebbe un secondo modo di dire la stessa cosa, e i due
 * prima o poi divergono.
 */

/** Dove si tiene memoria del «non adesso». Vedi la nota qui sotto. */
const DISMISS_KEY = "nlc:balance-invite";

/**
 * Per quanto tempo il rifiuto vale.
 *
 * Non è un booleano di proposito. Un booleano dice «mai più», e mai più è
 * sbagliato in tutte e due le direzioni: chi dice di no mentre è alla cassa non
 * sta dicendo che la funzione non gli serve, e una funzione che dopo un solo
 * rifiuto non si ripropone mai è una funzione che, per quella persona, non
 * esiste più. Una data lascia passare il momento sbagliato senza cancellare la
 * cosa. La porta comunque non si chiude mai: il pulsante dentro la scheda resta
 * lì tutti i giorni, e questo è solo l'annuncio.
 */
const DISMISS_DAYS = 30;

/**
 * Il ritardo prima di comparire. L'invito deve arrivare quando la dashboard è
 * già lì e si è capito cosa si sta guardando: comparire insieme al contenuto
 * vorrebbe dire farsi leggere come parte della pagina, e poi sparire.
 */
const APPEAR_DELAY_MS = 1200;

function shouldAnnounce(): boolean {
  try {
    const stored = window.localStorage.getItem(DISMISS_KEY);

    if (!stored) {
      return true;
    }

    const dismissedAt = Date.parse(stored);

    if (!Number.isFinite(dismissedAt)) {
      return true;
    }

    return Date.now() - dismissedAt > DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    /* Modalità privata, storage pieno, permessi negati: senza memoria si
       preferisce mostrarlo. Un invito di troppo costa un tocco; un invito
       mancato costa la funzione. */
    return true;
  }
}

function remember() {
  try {
    window.localStorage.setItem(DISMISS_KEY, new Date().toISOString());
  } catch {
    /* Se non si può ricordare, pazienza: tornerà. */
  }
}

export function BalanceInvite({
  onAccept,
  configured,
}: {
  onAccept: () => void;
  /** Appena il saldo esiste l'invito non ha più niente da dire. */
  configured: boolean;
}) {
  const t = useTranslations();
  /* Al primo render `visible` è falso e il componente non rende niente, che è
     esattamente ciò che rende il server: nessuna discrepanza da idratare. Il
     portale nasce solo dopo il timer, cioè dopo l'idratazione, ed è il motivo
     per cui qui non serve nessuna guardia «sono montato». */
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (configured || !shouldAnnounce()) {
      return;
    }

    const appear = window.setTimeout(() => {
      setVisible(true);
      /* Un fotogramma dopo, così la transizione ha uno stato da cui partire. */
      window.requestAnimationFrame(() => setEntered(true));
    }, APPEAR_DELAY_MS);

    return () => window.clearTimeout(appear);
  }, [configured]);

  if (!visible || configured || typeof document === "undefined") {
    return null;
  }

  function dismiss() {
    remember();
    setEntered(false);
    setVisible(false);
  }

  return createPortal(
    /* Il portale non è un vezzo: la scheda del saldo vive dentro un elemento
       con la parallasse, cioè una trasformata permanente, e una trasformata
       crea un contenitore per il `fixed`. Senza portale questo pannello si
       ancorerebbe alla card invece che al viewport. */
    <div
      role="region"
      aria-label={t.balances.inviteRegionLabel}
      className={cn(
        "fixed inset-x-0 z-50 flex justify-center px-4",
        "bottom-[calc(env(safe-area-inset-bottom)+var(--nlc-chrome-bottom))] md:bottom-6",
        "transition-[opacity,transform] duration-[280ms] ease-[cubic-bezier(.2,.8,.2,1)]",
        "motion-reduce:transition-none",
        entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
    >
      {/* Fondo opaco, e in scuro un gradino sopra la superficie delle schede:
          l'invito galleggia sopra il vetro della dashboard, e se prende lo
          stesso `--surface` delle lastre si legge come se una card fosse
          cresciuta. È la stessa cura che ha già il prompt delle notifiche. */}
      <div className="w-full max-w-md rounded-[var(--r-card)] border border-border bg-surface p-3.5 shadow-[var(--shadow-pop)] dark:bg-surface-muted">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-surface-muted"
            aria-hidden="true"
          >
            <Wallet className="size-4 text-muted-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-5 text-foreground">
              {t.balances.inviteTitle}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-4 text-muted-foreground">
              {t.balances.inviteText}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">{t.balances.inviteDismiss}</span>
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="h-10 shrink-0 rounded-[var(--r-control)] px-3 text-[13px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {t.balances.inviteDismiss}
          </button>
          <button
            type="button"
            onClick={() => {
              /* Chi accetta non deve ritrovarselo dietro al pannello, e non
                 deve rivederlo al prossimo avvio se poi ci ripensa. */
              remember();
              setVisible(false);
              onAccept();
            }}
            className={cn(
              "ml-auto flex h-10 min-w-0 flex-1 items-center justify-center rounded-[var(--r-control)] px-4",
              "bg-accent text-[14px] font-semibold text-accent-foreground outline-none",
              "transition-[opacity,transform] duration-150 active:scale-[0.98] active:opacity-90",
              "motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            {t.balances.setUpCta}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
