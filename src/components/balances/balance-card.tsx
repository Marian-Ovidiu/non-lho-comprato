"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Amount, Eyebrow, Serif } from "@/components/crafted";
import { cn } from "@/lib/utils";
import {
  useTranslations,
  useWorkspaceLanguage,
} from "@/src/components/language/language-context";
import { languageToLocale } from "@/src/lib/i18n";
import type { BalanceState } from "@/src/features/balances/balance";
import { BalanceInvite } from "@/src/components/balances/balance-invite";
import {
  BalanceSetupDialog,
  type BalanceSetupTarget,
} from "@/src/components/balances/balance-setup-dialog";
import {
  IncomeDialog,
  type IncomeMemberOption,
} from "@/src/components/balances/income-dialog";

type BalanceCardProps = {
  personal: BalanceState;
  joint: BalanceState | null;
  isShared: boolean;
  members: IncomeMemberOption[];
  currentUserId: string;
  todayDateKey: string;
};

/**
 * La scheda del saldo.
 *
 * Sta subito sotto il foglio della spesa corrente e subito sopra il budget,
 * perché la lettura è: quanto ho speso → quanto mi resta → quanto mi ero dato.
 * Fatto, fatto, intenzione. Il numero è un gradino sotto l'eroe (`--num-lead`)
 * e resta il secondo più grande dell'app: la posizione gli dà il peso, il corpo
 * conserva l'identità di un'app che parla di spese.
 *
 * Nello spazio condiviso i numeri sono due e non sono pari grado, quindi non
 * hanno la stessa forma: **il saldo personale ha un paragrafo, il conto comune
 * ha una riga.** Il saldo dell'altra persona non compare, e non arriva qui
 * nemmeno dal server.
 */
export function BalanceCard({
  personal,
  joint,
  isShared,
  members,
  currentUserId,
  todayDateKey,
}: BalanceCardProps) {
  const t = useTranslations();
  const locale = languageToLocale(useWorkspaceLanguage());
  const [setupTarget, setSetupTarget] = useState<BalanceSetupTarget | null>(
    null,
  );
  const [incomeOpen, setIncomeOpen] = useState(false);

  /* Un'entrata registrata prima che esista un saldo finisce in un posto che
     non si vede: il calcolo parte da una data di partenza, e senza partenza non
     c'è niente a cui sommarla. Finché nessuno dei due conti è impostato, la
     porta delle entrate non si apre — un gesto che non produce niente è peggio
     di un gesto che manca. */
  const hasAnyBalance =
    personal.configured || Boolean(isShared && joint?.configured);

  return (
    <>
      <section className="nlc-glass-card rounded-[var(--r-card)] p-4">
        <div className="flex items-start justify-between gap-3">
          <Eyebrow>{t.balances.sectionTitle}</Eyebrow>
          {/* Le entrate restano marginali per scelta: una riga quieta in cima
              alla scheda, non un gesto dell'app. */}
          {hasAnyBalance ? (
            <button
              type="button"
              onClick={() => setIncomeOpen(true)}
              className="-mt-1.5 -mr-1.5 flex min-h-9 shrink-0 items-center gap-1 rounded-[var(--r-control)] px-1.5 text-[12px] text-muted-foreground outline-none transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              {t.balances.addIncome}
            </button>
          ) : null}
        </div>

        <PersonalBalance
          state={personal}
          isShared={isShared}
          locale={locale}
          t={t}
          onSetUp={() => setSetupTarget("personal")}
        />

        {isShared && joint ? (
          <JointBalance
            state={joint}
            locale={locale}
            t={t}
            onSetUp={() => setSetupTarget("joint")}
          />
        ) : null}
      </section>

      <BalanceInvite
        configured={personal.configured}
        onAccept={() => setSetupTarget("personal")}
      />

      <BalanceSetupDialog
        /* Rimontando a ogni cambio di bersaglio, i valori di partenza entrano
           dagli inizializzatori di stato invece che da un effetto. */
        key={setupTarget ?? "chiuso"}
        target={setupTarget}
        todayDateKey={todayDateKey}
        initial={
          setupTarget === "joint"
            ? joint?.configured
              ? { amount: joint.start.amount, dateKey: joint.start.dateKey }
              : null
            : personal.configured
              ? { amount: personal.start.amount, dateKey: personal.start.dateKey }
              : null
        }
        onClose={() => setSetupTarget(null)}
      />

      <IncomeDialog
        open={incomeOpen}
        onClose={() => setIncomeOpen(false)}
        members={members}
        currentUserId={currentUserId}
        isShared={isShared}
        todayDateKey={todayDateKey}
      />
    </>
  );
}

type Translations = ReturnType<typeof useTranslations>;

/* Nota sul colore dei testi secondari di questa scheda.
   Sono tutti su `--muted-foreground` e nessuno su `--ink-3`, e non è una
   preferenza. Misurato sui pixel realmente resi: la riga serif della data in
   `--ink-3`, sopra il vetro della scheda in tema chiaro, dava **4,43:1** —
   sotto la soglia AA, con axe che la classificava `incomplete` e quindi con la
   suite verde. È lo stesso difetto già trovato su `/more`, dove la cura era la
   stessa: il fondo qui non è una costante, è vetro sopra la stanza, e un
   inchiostro tarato sul fondo piatto non regge sopra un fondo composito.
   Dopo il cambio la peggiore di queste righe sta a 7,0:1 in chiaro. */

function formatDay(dateKey: string, locale: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return dateKey;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function PersonalBalance({
  state,
  isShared,
  locale,
  t,
  onSetUp,
}: {
  state: BalanceState;
  isShared: boolean;
  locale: string;
  t: Translations;
  onSetUp: () => void;
}) {
  /* «Il tuo saldo» serve solo dove c'è un secondo saldo da cui distinguerlo.
     In uno spazio privato l'eyebrow della scheda dice già «Saldo», e ripeterlo
     due righe sotto è una riga in più che non aggiunge una parola. */
  const label = isShared ? (
    <p className="text-[13px] text-muted-foreground">{t.balances.yourBalance}</p>
  ) : null;

  if (!state.configured) {
    /* Quando il saldo non c'è, la scheda è una porta, non un annuncio: la frase
       che spiega a cosa serve sta nel pannello, dove si decide, e nell'invito,
       che è il posto in cui l'app chiede. Qui basta dire che manca. */
    return (
      <div className="mt-3">
        {label}
        <p
          className={cn(
            "text-[13px] text-muted-foreground",
            isShared ? "mt-0.5" : undefined,
          )}
        >
          {t.balances.notSet}
        </p>
        {/* Qui il saldo è una possibilità fra i contenuti della scheda, non
            l'unica cosa da fare: quindi tratto, non campitura. Il lime pieno lo
            porta l'invito, dove è davvero l'azione della schermata. */}
        <button
          type="button"
          onClick={onSetUp}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-[var(--r-control)] border border-line px-4 text-[14px] font-medium text-foreground outline-none transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {t.balances.setUpCta}
        </button>
      </div>
    );
  }

  const isNegative = state.current < 0;

  return (
    <div className="mt-3">
      {label}
      {/* Il negativo non ha un colore, e non è una dimenticanza.
          `--nlc-over` nell'app significa «hai sforato il budget», cioè un
          giudizio su una regola che ti sei dato; un conto sotto zero è un
          fatto, e usare lo stesso corallo per le due cose vorrebbe dire dare
          due significati a una tinta sola. Il fatto lo dicono il segno meno —
          che a questo corpo non si può non vedere — e una frase. */}
      <Amount
        value={state.current}
        sign="minus"
        className={cn(
          "block text-[length:var(--num-lead)] font-semibold",
          isShared ? "mt-1" : undefined,
        )}
      />
      {/* La correzione entra da qui e non da un pulsante suo: la riga dice gia'
          da quando vale il saldo, quindi e' il punto in cui uno guarda quando
          si accorge di averlo sbagliato. Resta testo all'aspetto — il saldo si
          muove con le spese e le entrate, e un pulsante «modifica» in evidenza
          inviterebbe a usarlo come scorciatoia per quelle. */}
      <button
        type="button"
        onClick={onSetUp}
        aria-label={t.balances.correctCta}
        className="mt-1.5 block rounded-[6px] text-left outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Serif className="block text-[13px] text-muted-foreground">
          {t.balances.fromDay(formatDay(state.start.dateKey, locale))}
        </Serif>
      </button>

      {isNegative ? (
        <p className="mt-1.5 text-[12.5px] leading-4 text-muted-foreground">
          {t.balances.negativeNote}
        </p>
      ) : null}

      <BalanceFlow state={state} t={t} />
    </div>
  );
}

/**
 * Le postille: come si è arrivati da lì a qui.
 *
 * Compaiono solo se sono maggiori di zero. Prima la riga scriveva sempre tutte
 * e due le voci, e su un saldo appena impostato diceva «+0,00 in entrata, −0,00
 * in uscita»: due numeri che non erano ancora successi, e uno zero con il segno
 * meno davanti, che non è una quantità.
 */
function BalanceFlow({ state, t }: { state: BalanceState; t: Translations }) {
  if (!state.configured || (state.incoming <= 0 && state.outgoing <= 0)) {
    return null;
  }

  return (
    <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
      {state.incoming > 0 ? (
        <span className="inline-flex items-baseline gap-1">
          {t.balances.incomingLabel}
          <Amount value={state.incoming} sign="plus" className="text-[12px]" />
        </span>
      ) : null}
      {state.outgoing > 0 ? (
        <span className="inline-flex items-baseline gap-1">
          {t.balances.outgoingLabel}
          <Amount value={-state.outgoing} sign="minus" className="text-[12px]" />
        </span>
      ) : null}
    </p>
  );
}

/**
 * Il conto comune: una riga, non una seconda scheda.
 *
 * È l'unico posto della dashboard, insieme al dare/avere, dove i soggetti sono
 * due — quindi porta il lilla, che nella palette significa esattamente quello e
 * nient'altro. Un pallino da sei pixel basta a dire «questo è di tutti e due»
 * senza scrivere una parola in più, e distingue le due righe con il materiale
 * invece che con la dimensione.
 */
function JointBalance({
  state,
  locale,
  t,
  onSetUp,
}: {
  state: BalanceState;
  locale: string;
  t: Translations;
  onSetUp: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
      <div className="min-w-0">
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground">
          <span
            className="size-1.5 shrink-0 rounded-full bg-[var(--lilac-ink)]"
            aria-hidden="true"
          />
          <span className="truncate">{t.balances.jointBalance}</span>
        </span>
        {/* Stessa porta del saldo personale: la riga che dice da quando vale
            e' anche il modo per correggerla. Quando non c'e' ancora un saldo
            resta testo, perche' l'invito ce l'ha gia' il pulsante accanto. */}
        {state.configured ? (
          <button
            type="button"
            onClick={onSetUp}
            aria-label={t.balances.correctCta}
            className="mt-0.5 block rounded-[6px] pl-[14px] text-left text-[11px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {t.balances.fromDay(formatDay(state.start.dateKey, locale))}
          </button>
        ) : (
          <span className="mt-0.5 block pl-[14px] text-[11px] text-muted-foreground">
            {t.balances.notSet}
          </span>
        )}
      </div>

      {state.configured ? (
        <Amount
          value={state.current}
          sign="minus"
          className={cn(
            "shrink-0 text-[length:var(--num-mid)] font-semibold",
          )}
        />
      ) : (
        <button
          type="button"
          onClick={onSetUp}
          className="flex min-h-9 shrink-0 items-center rounded-[var(--r-control)] border border-line px-3 text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {t.balances.setUpJointCta}
        </button>
      )}
    </div>
  );
}
