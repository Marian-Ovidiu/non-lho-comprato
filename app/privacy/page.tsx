import { CraftedIcon, Label, Rule, Serif } from "@/components/crafted";

const supportEmail = "h.marian914@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-8 flex items-center gap-2">
        <CraftedIcon name="flame" size={18} className="text-accent" />
        <span className="text-[13px] font-semibold text-muted-foreground">
          Non l&apos;ho comprato
        </span>
      </div>

      <section className="space-y-4">
        <Label>Privacy</Label>
        <h1 className="text-[clamp(2.4rem,10vw,4rem)] font-bold leading-[0.95] tracking-[-0.045em]">
          Privacy policy
        </h1>
        <Serif className="block max-w-2xl text-base leading-7 text-muted-foreground">
          Testo semplice e trasparente sui dati trattati dall&apos;app.
        </Serif>
      </section>

      <Rule className="my-8" />

      <div className="space-y-8 text-sm leading-6 text-muted-foreground">
        <section className="space-y-3">
          <Label>Dati raccolti</Label>
          <p>
            Raccogliamo dati di account come email, nome e immagine profilo
            forniti dal provider di login. Salviamo anche i dati inseriti
            dall&apos;utente: workspace, movimenti o spese, categorie, abitudini,
            obiettivi, preset, inviti e feedback.
          </p>
          <p>
            Possiamo trattare dati tecnici minimi, come informazioni di sessione,
            dispositivo, lingua, fuso orario, errori applicativi e log necessari
            a sicurezza e funzionamento. Per hosting, autenticazione, monitoraggio
            errori e analisi utilizzo possiamo avvalerci di servizi tecnici come
            Supabase, Vercel, Sentry e PostHog. I dati non vengono mai venduti a
            terzi.
          </p>
        </section>

        <section className="space-y-3">
          <Label>Finalita</Label>
          <p>
            Usiamo i dati per far funzionare l&apos;app, sincronizzare l&apos;account,
            mostrare statistiche, gestire workspace condivisi, inviti, feedback,
            sicurezza e assistenza.
          </p>
        </section>

        <section className="space-y-3">
          <Label>Conservazione</Label>
          <p>
            I dati restano conservati finche l&apos;account e attivo o finche sono
            necessari per fornire il servizio. Dopo l&apos;eliminazione, cancelliamo o
            anonimizziamo i dati collegati all&apos;account secondo la logica descritta
            sotto.
          </p>
        </section>

        <section className="space-y-3">
          <Label>Eliminazione account e dati</Label>
          <p>
            Dall&apos;app puoi aprire Altro, Account, Elimina account. Il flusso
            richiede una conferma esplicita e cancella il profilo dell&apos;app,
            workspace personali e dati associati.
          </p>
          <p>
            Nei workspace condivisi rimuoviamo membership e riferimenti diretti
            al profilo. I contenuti condivisi possono restare agli altri membri
            senza collegamento al tuo account, per conservare lo storico comune.
          </p>
          <p>
            Se non riesci ad accedere, usa la pagina pubblica{" "}
            <a className="text-accent underline-offset-4 hover:underline" href="/delete-account">/delete-account</a>{" "}
            o scrivi a{" "}
            <a className="text-accent underline-offset-4 hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.
          </p>
        </section>

        <section className="space-y-3">
          <Label>Contatto</Label>
          <p>
            Per richieste privacy o cancellazione dati:{" "}
            <a className="text-accent underline-offset-4 hover:underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <Label>Ultimo aggiornamento</Label>
          <p>14 giugno 2026.</p>
        </section>
      </div>
    </main>
  );
}
