import Link from "next/link";

import { CraftedIcon, Label, Rule, Serif } from "@/components/crafted";

const supportEmail = "h.marian914@gmail.com";

export default function PublicDeleteAccountPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-8 flex items-center gap-2">
        <CraftedIcon name="flame" size={18} className="text-accent" />
        <span className="text-[13px] font-semibold text-muted-foreground">
          Non l&apos;ho comprato
        </span>
      </div>

      <section className="space-y-4">
        <Label>Account e dati</Label>
        <h1 className="text-[clamp(2.4rem,10vw,4rem)] font-bold leading-[0.95] tracking-[-0.045em]">
          Eliminare account e dati
        </h1>
        <Serif className="block max-w-2xl text-base leading-7 text-muted-foreground">
          Questa pagina e pubblica e spiega come richiedere o completare la
          cancellazione del tuo account.
        </Serif>
      </section>

      <Rule className="my-8" />

      <div className="space-y-8">
        <section className="space-y-3">
          <Label>Come fare dall&apos;app</Label>
          <ol className="space-y-2 text-sm leading-6 text-muted-foreground">
            <li>1. Accedi all&apos;app con il tuo account.</li>
            <li>2. Apri Altro, poi Account, poi Elimina account.</li>
            <li>3. Leggi l&apos;avviso, seleziona la conferma e scrivi ELIMINA.</li>
            <li>4. Premi Elimina account e dati. La sessione verra chiusa.</li>
          </ol>
          <Link
            href="/account/delete"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-accent px-4 text-sm font-bold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Vai al percorso in-app
          </Link>
        </section>

        <section className="space-y-3">
          <Label>Dati eliminati</Label>
          <p className="text-sm leading-6 text-muted-foreground">
            Eliminiamo il profilo dell&apos;app, i workspace personali dove sei
            l&apos;unico membro, movimenti, categorie, abitudini, obiettivi, preset,
            inviti e impostazioni collegati a quei workspace.
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            Nei workspace condivisi rimuoviamo la tua membership e i riferimenti
            diretti al tuo account. I dati condivisi possono restare disponibili
            agli altri membri senza il tuo profilo collegato, per non rompere lo
            storico comune.
          </p>
        </section>

        <section className="space-y-3">
          <Label>Dati conservati</Label>
          <p className="text-sm leading-6 text-muted-foreground">
            Possiamo conservare solo informazioni richieste da legge, sicurezza,
            prevenzione abusi o log tecnici essenziali. Queste informazioni non
            vengono usate per ricostruire il tuo account nell&apos;app.
          </p>
        </section>

        <section className="space-y-3">
          <Label>Se non riesci ad accedere</Label>
          <p className="text-sm leading-6 text-muted-foreground">
            Scrivi a{" "}
            <a className="text-accent underline-offset-4 hover:underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>{" "}
            dalla mail collegata all&apos;account e indica che vuoi eliminare account
            e dati. TODO: sostituire questo indirizzo con la mail reale del
            progetto prima della pubblicazione.
          </p>
        </section>
      </div>
    </main>
  );
}
