import type { Metadata } from "next";
import Link from "next/link";

import { CraftedIcon, Label, Rule, Serif } from "@/components/crafted";

const supportEmail = "h.marian914@gmail.com";

const dataCategories = [
  {
    title: "Account e autenticazione",
    body:
      "ID utente, email, nome, immagine profilo se fornita dal provider di login, sessioni e cookie necessari all'accesso.",
  },
  {
    title: "Contenuti dell'app",
    body:
      "Workspace, membri, inviti, movimenti, importi, categorie, note, beneficiari, pagatore, abitudini, obiettivi, budget e report.",
  },
  {
    title: "Import CSV",
    body:
      "Nome file, dimensione, colonne mappate, righe importate, descrizioni transazioni, importi, valuta, categorie suggerite e stato di conferma.",
  },
  {
    title: "Feedback e supporto",
    body:
      "Messaggi inviati dall'utente, route, lingua, fuso orario, viewport, user agent e dati tecnici utili a risolvere problemi.",
  },
  {
    title: "Sicurezza e abuso",
    body:
      "Log tecnici, contatori di rate limit, identificativi pseudonimi e informazioni minime necessarie per proteggere account, export e inviti.",
  },
  {
    title: "Analytics ed errori opzionali",
    body:
      "Eventi limitati di utilizzo prodotto se PostHog e abilitato, e report tecnici di errore se Sentry e abilitato. Autocapture e session recording sono disattivati.",
  },
] as const;

const purposes = [
  {
    title: "Fornire il servizio",
    body:
      "Creare account, sincronizzare dati, mostrare movimenti, statistiche, budget, report e workspace condivisi.",
    basis: "Esecuzione del servizio richiesto dall'utente.",
  },
  {
    title: "Gestire collaborazione e inviti",
    body:
      "Permettere a piu persone di usare lo stesso workspace, vedere lo storico comune e gestire ruoli e inviti.",
    basis: "Esecuzione del servizio e legittimo interesse degli altri membri alla continuita dello storico condiviso.",
  },
  {
    title: "Sicurezza, prevenzione abusi e debug",
    body:
      "Limitare richieste anomale, proteggere export e inviti, diagnosticare errori e mantenere stabile l'app.",
    basis: "Legittimo interesse alla sicurezza del servizio e, se applicabile, obblighi legali.",
  },
  {
    title: "Miglioramento prodotto",
    body:
      "Capire quali flussi vengono usati e dove l'esperienza si rompe, solo con strumenti opzionali e configurati in modo minimale.",
    basis:
      "Consenso quando richiesto, oppure legittimo interesse dopo valutazione e configurazione privacy-preserving.",
  },
  {
    title: "Richieste privacy e assistenza",
    body:
      "Rispondere a richieste di accesso, rettifica, export, cancellazione, opposizione o supporto.",
    basis: "Obbligo legale, esecuzione del servizio e tutela dei diritti.",
  },
] as const;

const retentionItems = [
  "I dati dell'account e dell'app restano finche l'account e attivo o finche servono al servizio.",
  "I workspace personali dove l'utente e l'unico membro vengono eliminati con l'account.",
  "Nei workspace condivisi, i contenuti comuni possono restare per gli altri membri, rimuovendo membership e riferimenti diretti al profilo eliminato.",
  "Import CSV, righe importate e mapping restano nel workspace finche non vengono eliminati o finche il workspace resta attivo.",
  "Log tecnici, rate limit, backup e dati dei provider sono mantenuti per il tempo minimo necessario secondo configurazione operativa e policy dei fornitori.",
] as const;

const subprocessors = [
  {
    name: "Supabase",
    use: "Autenticazione, sessioni, database PostgreSQL e funzioni necessarie alla gestione account.",
  },
  {
    name: "Vercel",
    use: "Hosting dell'app, deploy, CDN, runtime serverless e log tecnici di piattaforma.",
  },
  {
    name: "Sentry",
    use: "Monitoraggio errori opzionale. La configurazione dell'app rimuove PII di default, query, cookie, header e body dalle segnalazioni.",
  },
  {
    name: "PostHog",
    use: "Analytics prodotto opzionale. L'app invia solo eventi espliciti, senza autocapture e senza session recording.",
  },
] as const;

export const metadata: Metadata = {
  title: "Privacy policy | Non l'ho comprato",
  description:
    "Privacy policy di Non l'ho comprato: dati raccolti, basi giuridiche, retention, export, cancellazione e subprocessors.",
};

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className="text-accent underline-offset-4 hover:underline"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

function PolicySection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <Label>{eyebrow}</Label>
      {title ? (
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

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
          Spieghiamo quali dati trattiamo, perche, per quanto tempo e come puoi
          esportarli o chiederne la cancellazione.
        </Serif>
      </section>

      <Rule className="my-8" />

      <div className="space-y-9 text-sm leading-6 text-muted-foreground">
        <PolicySection eyebrow="In breve">
          <p>
            I movimenti registrati in Non l&apos;ho comprato non sono
            necessariamente dati sensibili ai sensi del GDPR, ma possono rivelare
            abitudini di spesa e quindi li trattiamo come dati personali privati
            di natura finanziaria. Non vendiamo dati, non usiamo pubblicita
            comportamentale e non inviamo automaticamente i tuoi movimenti a
            servizi AI esterni.
          </p>
          <p>
            Non chiediamo dati sanitari, politici, religiosi o altre categorie
            particolari. Se li inserisci volontariamente in titoli, note o CSV,
            verranno trattati come contenuto del tuo account, anche se non sono
            necessari per usare il servizio.
          </p>
        </PolicySection>

        <PolicySection eyebrow="Titolare e contatto">
          <p>
            Il servizio e gestito da Non l&apos;ho comprato. Per richieste privacy,
            export, rettifica o cancellazione puoi scrivere a{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href={`mailto:${supportEmail}`}
            >
              {supportEmail}
            </a>
            .
          </p>
        </PolicySection>

        <PolicySection eyebrow="Privacy by design" title="Protezione fin dalla progettazione">
          <p>
            Il servizio applica il principio GDPR di data protection by design e
            by default: i dati sono separati per workspace, l&apos;accesso e
            verificato lato server, le chiavi admin restano solo server-side, gli
            export sono rate-limited, i testi liberi piu rivelatori possono
            essere cifrati a livello applicativo e analytics/error monitoring
            sono opzionali e minimizzati.
          </p>
          <p>
            Riferimenti:{" "}
            <ExternalLink href="https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/obligations/what-does-data-protection-design-and-default-mean_en">
              Commissione Europea su data protection by design/default
            </ExternalLink>{" "}
            e{" "}
            <ExternalLink href="https://www.edpb.europa.eu/documents/guideline/guidelines-42019-on-article-25-data-protection-by-design-and-by-default_en">
              linee guida EDPB 4/2019 sull&apos;Art. 25 GDPR
            </ExternalLink>
            .
          </p>
        </PolicySection>

        <PolicySection eyebrow="Dati raccolti">
          <div className="divide-y divide-line-soft border-y border-line">
            {dataCategories.map((item) => (
              <div key={item.title} className="py-4">
                <h2 className="font-semibold text-foreground">{item.title}</h2>
                <p className="mt-1">{item.body}</p>
              </div>
            ))}
          </div>
        </PolicySection>

        <PolicySection eyebrow="Perche li trattiamo" title="Finalita e base giuridica">
          <div className="divide-y divide-line-soft border-y border-line">
            {purposes.map((item) => (
              <div key={item.title} className="py-4">
                <h2 className="font-semibold text-foreground">{item.title}</h2>
                <p className="mt-1">{item.body}</p>
                <p className="mt-2 text-foreground">
                  Base giuridica:{" "}
                  <span className="text-muted-foreground">{item.basis}</span>
                </p>
              </div>
            ))}
          </div>
        </PolicySection>

        <PolicySection eyebrow="Conservazione" title="Retention">
          <ul className="space-y-2">
            {retentionItems.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </PolicySection>

        <PolicySection eyebrow="Export e cancellazione">
          <p>
            Puoi esportare i dati dei movimenti dal pannello Altro, Export AI:
            viene generato un CSV del workspace, scegliendo tutti i movimenti o
            il mese corrente. Il file viene scaricato dal tuo browser; sei tu a
            decidere se condividerlo con strumenti esterni.
          </p>
          <p>
            Puoi eliminare account e dati da Altro, Account, Elimina account.
            Se non riesci ad accedere, usa la pagina pubblica{" "}
            <Link
              className="text-accent underline-offset-4 hover:underline"
              href="/delete-account"
            >
              /delete-account
            </Link>{" "}
            o scrivi a{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href={`mailto:${supportEmail}`}
            >
              {supportEmail}
            </a>
            .
          </p>
          <p>
            Nei workspace condivisi rimuoviamo membership e riferimenti diretti
            al profilo. I contenuti comuni possono restare visibili agli altri
            membri senza collegamento diretto al tuo account, per conservare lo
            storico condiviso.
          </p>
        </PolicySection>

        <PolicySection eyebrow="Fornitori" title="Subprocessors">
          <p>
            Usiamo fornitori tecnici solo per far funzionare, ospitare,
            proteggere o monitorare il servizio. Prima di un uso commerciale
            devono essere verificati contratti, DPA, regioni di trattamento e
            impostazioni di retention dei provider.
          </p>
          <div className="divide-y divide-line-soft border-y border-line">
            {subprocessors.map((item) => (
              <div key={item.name} className="py-4">
                <h2 className="font-semibold text-foreground">{item.name}</h2>
                <p className="mt-1">{item.use}</p>
              </div>
            ))}
          </div>
        </PolicySection>

        <PolicySection eyebrow="Cookie e storage locale">
          <p>
            Usiamo cookie tecnici per autenticazione e sessione Supabase, un
            identificativo del workspace selezionato e storage locale per
            preferenze come tema, installazione PWA e, se abilitato, persistenza
            minima di PostHog. Non usiamo cookie pubblicitari.
          </p>
        </PolicySection>

        <PolicySection eyebrow="Diritti">
          <p>
            Puoi chiedere accesso, rettifica, cancellazione, limitazione,
            portabilita, opposizione e informazioni sui trattamenti. Puoi anche
            proporre reclamo all&apos;autorita di controllo competente. Per
            esercitare questi diritti scrivi a{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href={`mailto:${supportEmail}`}
            >
              {supportEmail}
            </a>
            .
          </p>
        </PolicySection>

        <PolicySection eyebrow="Minori">
          <p>
            Il servizio non e pensato per minori. Se ritieni che un minore abbia
            inserito dati personali senza autorizzazione, contattaci per
            verificarne la rimozione.
          </p>
        </PolicySection>

        <PolicySection eyebrow="Ultimo aggiornamento">
          <p>26 giugno 2026.</p>
        </PolicySection>
      </div>
    </main>
  );
}
