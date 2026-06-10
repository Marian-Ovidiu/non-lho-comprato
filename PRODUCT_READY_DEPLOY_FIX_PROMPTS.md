# Product Ready Deploy Fix Prompts

Operational prompt plan for taking `non-lho-comprato` from the current local `nlc-v2` validation state to safe Vercel Preview and then Production readiness.

Current baseline, as of 2026-06-10:

- App: Next.js 16.2.4 App Router, Supabase Auth, PostgreSQL, Prisma.
- Target Supabase project: `nlc-v2`, project ref `nohezhrghqstxyyxbfhs`.
- `nlc-v2` has already been restored from a fresh old-production dump, migrated, repaired, and validated locally.
- Local Google login against `nlc-v2` works and old data is visible after login.
- Vercel Production must not be updated until Preview is clean and the Production runbook is explicitly executed.
- Do not include real secrets, full connection strings, DB passwords, service keys, OAuth secrets, or token values in any report.

Global release rules:

- Use `npm run release:archive` before deploy packaging. Do not create manual zip archives.
- `.env.local` may exist locally for development, but it must never be tracked by git and must never appear in release archives.
- The old Supabase project/database must not be deleted until the rollback window is complete and backups have been verified.
- Treat any password/key pasted during prior sessions as potentially compromised and rotate it after cutover verification.
- Do not run migrations, DB queries, or DB repair scripts unless a later explicitly approved runbook step says to do so.
- Do not print secrets or complete connection strings. Redact values as `<redacted>` and show only non-sensitive metadata such as variable names, host class, or port.

Recommended execution order:

1. Phase 2A — Repository and artifact hygiene.
2. Phase 2B — Secret exposure inventory and rotation checklist.
3. Phase 2C — Hydration splash fix.
4. Phase 2D — Local `nlc-v2` smoke test checklist.
5. Phase 2E — Vercel Preview cutover.
6. Phase 2F — Production cutover runbook.
7. Phase 2G — Product-ready gap audit.

## Phase 2A — Repository and artifact hygiene

### Objective

Make the repository and release artifact safe before any Preview deploy. Ensure env files, dumps, git metadata, caches, IDE directories, and agent directories are ignored, not staged, and absent from the release archive.

### Prompt to Paste Into Codex

```text
Sei GPT-5.5 / Codex agent nel repo `/Users/marian/Sites/Personale/non-lho-comprato`.

Task: esegui Phase 2A — Repository and artifact hygiene.

Contesto:
- Il repo contiene o ha contenuto file sensibili e artefatti locali: `.env.local`, `.env`, `.env.merge-source`, `.env-backup/`, `backups/*.dump`, `.git/`, `.idea/`, `.claude/`, `.agents/`, `.DS_Store`, `tsconfig.tsbuildinfo`.
- Alcuni dump possono essere staged/tracciabili: `backups/prod-2026-06-10.dump`, `backups/prod-fresh-2026-06-10.dump`.
- Non devi cancellare backup reali fuori dal repo. Per file già staged/tracked nel repo, rimuovili solo dal git index con `git rm --cached`, senza eliminare la copia locale.
- Prima del deploy bisogna usare `npm run release:archive`, non zip manuali.
- `.env.local` può esistere localmente, ma non deve essere tracciato e non deve finire nell'archive.

Obiettivo:
- Correggere `.gitignore`, `.dockerignore` e `release:archive` se necessario.
- Garantire ignore/esclusione di:
  - `.env`
  - `.env.*`
  - `!.env.example`
  - `.env-backup/`
  - `backups/`
  - `*.dump`
  - `.idea/`
  - `.claude/`
  - `.agents/`
  - `.next/`
  - `tsconfig.tsbuildinfo`
  - `.DS_Store`
- Rimuovere dal git index eventuali env/dump/cache/IDE/agent file già staged o tracked, usando solo `git rm --cached`.
- Non modificare segreti reali e non stamparli.
- Creare `PHASE_2A_REPO_ARTIFACT_HYGIENE.md` con comandi eseguiti, risultati, file rimossi dall'index, e verifica archive.

File che puoi modificare:
- `.gitignore`
- `.dockerignore`
- `package.json`, solo per rendere `release:archive` più sicuro
- `.env.example`, solo se serve mantenerlo come template senza segreti
- `PHASE_2A_REPO_ARTIFACT_HYGIENE.md`

Comandi consentiti:
- `git status --short --ignored`
- `git ls-files` su path sensibili
- `git rm --cached <path>` o `git rm --cached -r <dir>` per file/dir sensibili già tracciati/staged
- `grep`/`find` per verificare presenza di pattern sensibili senza stampare valori
- `npm run prisma:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run release:archive`
- `unzip -l <archive>` con grep denylist

Comandi vietati:
- Qualsiasi comando DB o Prisma migration: `psql`, `prisma migrate`, `prisma db push`, `npm run db:*`
- `npm run build`, salvo richiesta esplicita separata
- `rm`, `find -delete`, `git clean`, `git reset --hard`, `git checkout --`
- Qualsiasi comando che stampi segreti, connection string complete o contenuto di `.env*`
- Qualsiasi modifica a Vercel, Supabase o Production

Procedura richiesta:
1. Leggi `.gitignore`, `.dockerignore`, `package.json` e lo stato git.
2. Aggiorna ignore/archive in modo che i path sensibili siano esclusi.
3. Se dump/env/cache sono staged o tracked, rimuovili dall'index con `git rm --cached`, senza cancellarli dal disco.
4. Esegui un controllo di secret exposure per nomi file e pattern, ma non stampare valori. Riporta solo path e categorie generiche.
5. Esegui `npm run release:archive`.
6. Verifica l'archive con `unzip -l` e denylist per `.env`, `.env.*`, `.env-backup`, `backups/`, `*.dump`, `.git`, `.next`, `.idea`, `.claude`, `.agents`, `.DS_Store`, `tsconfig.tsbuildinfo`, `node_modules`.
7. Esegui `npm run prisma:validate`, `npm run lint`, `npm run typecheck`, `npm run test`.
8. Scrivi `PHASE_2A_REPO_ARTIFACT_HYGIENE.md`.

Acceptance criteria:
- Nessun `.env*` reale, dump, `.git`, `.next`, IDE dir, agent dir, cache o `.DS_Store` nel release archive.
- `.env.example` resta tracciabile e non contiene segreti.
- I dump e gli env reali non sono staged/tracked.
- `npm run release:archive` è il percorso documentato; nessuno zip manuale.
- `npm run prisma:validate`, `npm run lint`, `npm run typecheck`, `npm run test` passano oppure eventuali failure sono documentate con causa e file.

Risposta finale all'utente:
- Elenca file modificati.
- Elenca file rimossi dall'index, senza segreti.
- Indica il path dell'archive verificato.
- Riporta esito dei test.
- Conferma che non hai eseguito DB/migration/query/env changes e non hai cancellato backup locali.
```

### Files It May Modify

- `.gitignore`
- `.dockerignore`
- `package.json`
- `.env.example`
- `PHASE_2A_REPO_ARTIFACT_HYGIENE.md`

### Allowed Commands

- `git status --short --ignored`
- `git ls-files`
- `git rm --cached` for sensitive files already in index
- `find` and `grep` checks that do not print secret values
- `npm run prisma:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run release:archive`
- `unzip -l <archive>`

### Forbidden Commands

- `psql`
- `npx prisma migrate deploy`
- `npx prisma db push`
- `npm run db:*`
- `npm run build`, unless separately approved
- `rm`, `find -delete`, `git clean`, `git reset --hard`, `git checkout --`
- Any Vercel/Supabase Production change

### Acceptance Criteria

- Release archive contains no real env files, dumps, git metadata, caches, IDE directories, agent directories, `.DS_Store`, `tsconfig.tsbuildinfo`, or `node_modules`.
- `.env.local` may remain locally ignored, but is not tracked and not archived.
- `backups/` and `*.dump` are ignored and not staged.
- Report `PHASE_2A_REPO_ARTIFACT_HYGIENE.md` exists.

### What To Send The User After This Phase

- Files changed.
- Sensitive paths removed from index, listed by path only.
- Verification commands and pass/fail results.
- Archive denylist result.
- Explicit confirmation that no DB, migration, query, env, Supabase, or Vercel Production action was performed.

## Phase 2B — Secret exposure inventory and rotation checklist

### Objective

Create a non-sensitive inventory of secret categories that may need rotation, then define the safe post-cutover rotation order. Do not rotate anything automatically.

### Prompt to Paste Into Codex

```text
Sei GPT-5.5 / Codex agent nel repo `/Users/marian/Sites/Personale/non-lho-comprato`.

Task: esegui Phase 2B — Secret exposure inventory and rotation checklist.

Obiettivo:
- Creare un inventario documentale dei segreti potenzialmente esposti, senza stampare valori.
- Creare `PHASE_2B_SECRET_ROTATION_CHECKLIST.md`.
- Aggiornare eventualmente `PHASE_1E_SUPABASE_V2_CUTOVER_CHECKLIST.md` con un link o una breve sezione che rimanda alla checklist di rotazione.
- Non ruotare nulla automaticamente.

Categorie da includere:
- Vecchia DB password Supabase.
- Nuova DB password Supabase `nlc-v2`.
- Supabase anon public key, se copiata in file non sicuri o archive.
- Supabase service role key, se presente o esposta.
- Vercel OIDC token o token Vercel, se presente in backup/env.
- Google OAuth client secret, se copiato localmente.
- Altri provider eventualmente individuati per nome variabile, senza valori: Sentry, PostHog, OpenAI, Resend o simili.

File che puoi modificare:
- `PHASE_2B_SECRET_ROTATION_CHECKLIST.md`
- `PHASE_1E_SUPABASE_V2_CUTOVER_CHECKLIST.md`, solo per riferimento alla nuova checklist

Comandi consentiti:
- `git status --short --ignored`
- `git ls-files`
- `find` per elencare path potenzialmente sensibili, senza leggere/stampare valori
- `grep -RIl` o equivalente per cercare nomi di variabili e categorie di segreti, stampando solo path e nome categoria, non il valore
- `npm run prisma:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run test`

Comandi vietati:
- Qualsiasi comando DB: `psql`, `npm run db:*`, `prisma migrate`, `prisma db push`
- Qualsiasi comando Vercel/Supabase/Google che ruoti o modifichi segreti
- Lettura o stampa del contenuto completo di `.env*`
- Stampa di connection string complete, password, token, service key o OAuth secret
- `npm run release:archive`, salvo se devi solo verificare un artifact già prodotto in Phase 2A
- `npm run build`, salvo richiesta esplicita separata

Procedura richiesta:
1. Verifica solo i path e i nomi variabile/categoria potenzialmente sensibili.
2. Non stampare righe `.env` complete. Se devi documentare, usa formato `VARIABLE_NAME=<redacted>`.
3. Scrivi `PHASE_2B_SECRET_ROTATION_CHECKLIST.md` con:
   - scope;
   - categorie potenzialmente compromesse;
   - sistemi da aggiornare;
   - ordine consigliato;
   - rollback considerations;
   - cosa non ruotare prima del cutover;
   - owner/manual steps.
4. Se utile, aggiungi in `PHASE_1E_SUPABASE_V2_CUTOVER_CHECKLIST.md` un breve riferimento a `PHASE_2B_SECRET_ROTATION_CHECKLIST.md`.
5. Esegui `npm run prisma:validate`, `npm run lint`, `npm run typecheck`, `npm run test`.

Ordine consigliato obbligatorio nella checklist:
1. Deploy/cutover verificato.
2. Ruotare DB password.
3. Aggiornare Vercel env.
4. Ruotare Google client secret se necessario.
5. Invalidare vecchie env locali.
6. Rigenerare release archive con `npm run release:archive`.

Acceptance criteria:
- `PHASE_2B_SECRET_ROTATION_CHECKLIST.md` esiste ed è chiara.
- Nessun segreto o connection string completa è stampata o salvata.
- Non è stata eseguita alcuna rotazione automatica.
- La checklist distingue tra segreti da ruotare subito dopo cutover e segreti da valutare.

Risposta finale all'utente:
- Elenca file creati/modificati.
- Riporta categorie censite, senza valori.
- Riporta esito verifiche.
- Conferma che non hai ruotato segreti, non hai modificato env reali e non hai eseguito DB/query/migration.
```

### Files It May Modify

- `PHASE_2B_SECRET_ROTATION_CHECKLIST.md`
- `PHASE_1E_SUPABASE_V2_CUTOVER_CHECKLIST.md`

### Allowed Commands

- `git status --short --ignored`
- `git ls-files`
- `find` for path inventory
- `grep -RIl` for variable-name/category inventory without values
- `npm run prisma:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run test`

### Forbidden Commands

- `psql`, `npm run db:*`, Prisma migration commands
- Secret rotation commands or provider dashboard mutations
- Printing `.env*` contents or full connection strings
- `npm run build`, unless separately approved

### Acceptance Criteria

- Secret categories are inventoried without values.
- Rotation order is explicit.
- No secret rotation is performed.
- Report `PHASE_2B_SECRET_ROTATION_CHECKLIST.md` exists.

### What To Send The User After This Phase

- File list.
- Secret categories only, no values.
- Recommended manual rotation order.
- Verification results.
- Confirmation that env, DB, providers, and Production were untouched.

## Phase 2C — Hydration splash fix

### Objective

Fix the dev hydration mismatch around `FlameSplash`, `AppSplash`, `SplashGate`, and `RootLayout` by making the first server/client render stable while preserving the animation after mount.

### Prompt to Paste Into Codex

```text
Sei GPT-5.5 / Codex agent nel repo `/Users/marian/Sites/Personale/non-lho-comprato`.

Task: esegui Phase 2C — Hydration splash fix.

Contesto:
- In dev è apparso hydration mismatch nello splash.
- Stack sospetto: `FlameSplash` -> `AppSplash` -> `SplashGate` -> `RootLayout`.
- File principale sospetto: `src/components/brand/flame-splash.tsx`.
- Causa probabile: render iniziale client diverso dal server per uso di `window`, dimensioni viewport o misure non stabili.

Obiettivo:
- Correggere il mismatch senza cambiare business logic.
- Primo render server/client deve essere stabile.
- Non usare `window`, `Date.now`, `Math.random`, viewport size o randomness durante render iniziale.
- Misurare viewport e `matchMedia` solo dopo mount.
- Preservare animazione e fallback reduced-motion.
- Creare o aggiornare test solo se utile e non fragile.
- Creare `PHASE_2C_HYDRATION_SPLASH_FIX.md`.

Prima di scrivere codice:
- Leggi `node_modules/next/dist/docs/` per le guide Next.js rilevanti se disponibili localmente. Se non esistono, annota nel report che i docs locali non sono disponibili e procedi usando il codice del progetto.
- Leggi `src/components/brand/flame-splash.tsx`, `src/components/splash/app-splash.tsx`, `src/components/splash/splash-gate.tsx`, `app/layout.tsx`, e `src/lib/splash.ts`.

File che puoi modificare:
- `src/components/brand/flame-splash.tsx`
- `src/components/splash/app-splash.tsx`, solo se necessario
- `src/components/splash/splash-gate.tsx`, solo se necessario
- Test collegati allo splash, solo se utili
- `PHASE_2C_HYDRATION_SPLASH_FIX.md`

Comandi consentiti:
- `find node_modules/next/dist/docs -maxdepth 3 -type f` se esiste
- `sed`, `cat`, `grep`, `git diff`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Avvio manuale dev server solo se serve per riprodurre, senza cambiare env o DB

Comandi vietati:
- Qualsiasi comando DB: `psql`, `npm run db:*`, Prisma migration commands
- Qualsiasi modifica a env reali o Vercel/Supabase
- Refactor visivi ampi o cambio business logic
- `rm`, `git reset --hard`, `git checkout --`

Implementazione attesa:
1. Evita initializer `useState` che legge `window` o viewport.
2. Usa uno stato iniziale deterministico, ad esempio `null` o `{ w: 0, h: 0 }`, identico su server e primo client render.
3. Dopo mount, misura `window.innerWidth`/`innerHeight` in `useEffect` o in un hook isomorfo sicuro.
4. Renderizza SVG viewport-dependent solo dopo mount/misura.
5. Mantieni l'overlay splash e la `FlameMark` stabili al primo render.
6. Evita `useLayoutEffect` se causa warning SSR; se serve, usa un wrapper isomorfo o sposta la parte browser-only in `useEffect`.
7. Documenta nel report la causa e il fix.

Acceptance criteria:
- Nessun hydration error su refresh locale.
- `npm run lint` passa.
- `npm run typecheck` passa.
- `npm run test` passa.
- `npm run build` passa.
- `PHASE_2C_HYDRATION_SPLASH_FIX.md` esiste.

Risposta finale all'utente:
- Elenca file modificati.
- Spiega in 2-4 frasi causa e fix.
- Riporta esito `lint`, `typecheck`, `test`, `build`.
- Conferma che non hai eseguito DB/migration/query/env changes e non hai toccato production.
```

### Files It May Modify

- `src/components/brand/flame-splash.tsx`
- `src/components/splash/app-splash.tsx`
- `src/components/splash/splash-gate.tsx`
- Splash-related tests
- `PHASE_2C_HYDRATION_SPLASH_FIX.md`

### Allowed Commands

- Local file reads/searches
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Optional local dev server for manual verification

### Forbidden Commands

- DB commands and migrations
- Env/provider mutations
- Broad UI redesign or business logic changes
- Destructive git/filesystem commands

### Acceptance Criteria

- Refresh no longer reports hydration mismatch.
- Animation still works after mount.
- `lint`, `typecheck`, `test`, and `build` pass.
- Report `PHASE_2C_HYDRATION_SPLASH_FIX.md` exists.

### What To Send The User After This Phase

- Files changed.
- Cause/fix summary.
- Verification command results.
- Confirmation that DB, env, Supabase, Vercel, and Production were untouched.

## Phase 2D — Local nlc-v2 smoke test checklist

### Objective

Create a manual smoke-test checklist for local runtime against `nlc-v2`, without modifying code or querying DB directly.

### Prompt to Paste Into Codex

```text
Sei GPT-5.5 / Codex agent nel repo `/Users/marian/Sites/Personale/non-lho-comprato`.

Task: esegui Phase 2D — Local nlc-v2 smoke test checklist.

Obiettivo:
- Creare documentazione operativa per smoke test locale contro il nuovo Supabase `nlc-v2`.
- Non modificare codice applicativo.
- Non eseguire query DB e non eseguire migration.
- Creare `PHASE_2D_LOCAL_SMOKE_TEST_CHECKLIST.md`.
- Opzionalmente creare `PHASE_2D_LOCAL_SMOKE_TEST_RESULTS.md` come template compilabile pass/fail.

La checklist deve includere:
- Verifica env locale senza stampare valori.
- Login Google.
- Redirect `/auth/callback`.
- Dashboard.
- Entries.
- Stats.
- Habits.
- Goals.
- Workspace members.
- Create/edit/delete entry test.
- Logout/login.
- Verifica che il workspace non appaia vuoto dopo login.
- Verifica che i dati vecchi siano visibili.
- Note per testare utenti/workspace legacy senza nominare segreti.

File che puoi modificare:
- `PHASE_2D_LOCAL_SMOKE_TEST_CHECKLIST.md`
- `PHASE_2D_LOCAL_SMOKE_TEST_RESULTS.md`

Comandi consentiti:
- `git status --short`
- Lettura file docs/report esistenti
- `npm run prisma:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run test`

Comandi vietati:
- `psql`, `npm run db:*`, Prisma migration commands
- Lettura/stampa contenuto `.env.local`
- Modifiche a codice applicativo
- Modifiche a Vercel/Supabase/Production
- `npm run build`, salvo richiesta esplicita separata

Acceptance criteria:
- Checklist pronta per segnare pass/fail.
- Template risultati pronto, se creato.
- Nessun codice modificato, salvo documenti.
- Nessun segreto incluso.

Risposta finale all'utente:
- Elenca documenti creati.
- Riporta esito verifiche eseguite.
- Conferma che non hai modificato codice, env, DB o Production.
```

### Files It May Modify

- `PHASE_2D_LOCAL_SMOKE_TEST_CHECKLIST.md`
- `PHASE_2D_LOCAL_SMOKE_TEST_RESULTS.md`

### Allowed Commands

- `git status --short`
- File reads for docs/report context
- `npm run prisma:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run test`

### Forbidden Commands

- DB commands and migrations
- Reading or printing `.env.local` values
- Application code edits
- Provider mutations
- `npm run build`, unless separately approved

### Acceptance Criteria

- Pass/fail-ready local smoke checklist exists.
- Optional results template exists.
- No code changes.
- No secrets included.

### What To Send The User After This Phase

- Created document list.
- Verification results.
- Confirmation of no code/env/DB/Production changes.

## Phase 2E — Vercel Preview cutover

### Objective

Prepare and execute a Vercel Preview/Staging cutover to `nlc-v2`, not Production, using correct runtime env shape and Supabase Auth redirect configuration.

### Prompt to Paste Into Codex

```text
Sei GPT-5.5 / Codex agent nel repo `/Users/marian/Sites/Personale/non-lho-comprato`.

Task: esegui Phase 2E — Vercel Preview cutover.

Obiettivo:
- Preparare istruzioni e checklist per Vercel Preview/Staging, non Production.
- Eseguire solo azioni Preview se esplicitamente confermate dall'utente durante questa fase.
- Creare `PHASE_2E_VERCEL_PREVIEW_CUTOVER.md`.
- Non toccare Vercel Production.

Env richieste per Preview:
- `NEXT_PUBLIC_SUPABASE_URL`: Project URL base del nuovo progetto, non `/auth/v1/callback`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon public key del nuovo progetto.
- `DATABASE_URL`: Supabase Transaction pooler su porta `6543` con `pgbouncer=true`.
- `DIRECT_URL`: Supabase Session pooler su porta `5432` o maintenance URL approvato.
- `SUPABASE_SERVICE_ROLE_KEY`: solo se il codice la usa davvero; se non usata, non aggiungerla.

Regole segreti:
- Non stampare valori env.
- Non stampare connection string complete.
- Puoi riportare solo variabile, presenza, classe host e porta, ad esempio `DATABASE_URL=<redacted transaction pooler :6543 pgbouncer=true>`.

File che puoi modificare:
- `PHASE_2E_VERCEL_PREVIEW_CUTOVER.md`
- Eventuale doc checklist esistente, solo per link alla Phase 2E

Comandi consentiti:
- `git status --short`
- `npm run prisma:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run release:archive`
- `unzip -l <archive>`
- Comandi Vercel Preview solo se l'utente conferma e solo per Preview/Staging
- Lettura Vercel logs Preview, redigendo eventuali segreti

Comandi vietati:
- Qualsiasi comando o dashboard action su Vercel Production
- `psql`, `npm run db:*`, Prisma migration commands
- Modifica o stampa di env reali in chiaro
- `vercel env pull` se scrive valori in file locali non ignorati
- Cancellazione vecchio Supabase o modifica vecchia Production

Procedura richiesta:
1. Conferma stato repo e verifica che Phase 2A sia completata o documenta blocker.
2. Verifica `npm run release:archive` e archive denylist prima del deploy Preview.
3. Documenta le env Preview richieste e il formato corretto senza valori.
4. Documenta Supabase Auth redirect Preview URL: aggiungere l'URL Preview esatto come redirect consentito nel nuovo progetto Supabase.
5. Se l'utente conferma l'esecuzione, deploya Preview/Staging senza Production.
6. Esegui verifiche Preview manuali/documentate:
   - pagina login;
   - login Google;
   - redirect `/auth/callback`;
   - dashboard;
   - entries e dati storici;
   - stats;
   - habits;
   - goals;
   - workspace members;
   - create/edit/delete entry;
   - logout/login.
7. Controlla Vercel logs Preview e riporta solo errori redatti.
8. Scrivi `PHASE_2E_VERCEL_PREVIEW_CUTOVER.md`.

Acceptance criteria:
- Preview login ok.
- Dati visibili.
- Nessun errore DB/auth nei logs Preview.
- Production non toccata.
- Archive generato con `npm run release:archive`, non zip manuale, e verificato pulito.

Risposta finale all'utente:
- Indica se Preview è stato solo preparato o anche deployato.
- Elenca file creati/modificati.
- Riporta env shape verificata senza valori.
- Riporta esiti Preview e logs.
- Conferma che Production e vecchio Supabase non sono stati toccati.
```

### Files It May Modify

- `PHASE_2E_VERCEL_PREVIEW_CUTOVER.md`
- Existing checklist docs, only for cross-reference

### Allowed Commands

- Local checks and build
- `npm run release:archive`
- Archive verification
- Vercel Preview commands only after explicit user confirmation
- Preview log inspection with redaction

### Forbidden Commands

- Production Vercel changes
- DB commands and migrations
- Printing env values or full connection strings
- Deleting or modifying old Supabase

### Acceptance Criteria

- Preview login works.
- Data is visible.
- No DB/auth errors in Preview logs.
- Production untouched.
- Release archive produced through `npm run release:archive` and verified clean.

### What To Send The User After This Phase

- Prepared/deployed status.
- Preview URL if available.
- Verification results.
- Log summary with redaction.
- Confirmation that Production and old Supabase were untouched.

## Phase 2F — Production cutover runbook

### Objective

Create a production-only runbook to execute after Preview is clean. Do not execute Production cutover automatically.

### Prompt to Paste Into Codex

```text
Sei GPT-5.5 / Codex agent nel repo `/Users/marian/Sites/Personale/non-lho-comprato`.

Task: esegui Phase 2F — Production cutover runbook.

Obiettivo:
- Creare `PHASE_2F_PRODUCTION_CUTOVER_RUNBOOK.md`.
- Production cutover deve essere solo pianificato, non eseguito.
- Il runbook deve partire dal presupposto che Preview sia già verde.
- Non toccare Production, Vercel env, Supabase env o DB in questa fase.

Il runbook deve includere:
- Prerequisiti Preview.
- Salvataggio sicuro delle vecchie env Vercel Production per rollback, senza stamparle in report.
- Backup finale vecchia prod se i dati sono cambiati dopo il dump già usato.
- Decisione esplicita: usare `nlc-v2` già validato oppure rifare restore fresco su `nlc-v2` prima del cutover se vecchia prod ha nuovi dati.
- Aggiornamento Production env:
  - `NEXT_PUBLIC_SUPABASE_URL`: Project URL base nuovo progetto, non callback URL.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon key nuovo progetto.
  - `DATABASE_URL`: Transaction pooler porta `6543` con `pgbouncer=true`.
  - `DIRECT_URL`: Session pooler porta `5432`.
  - `SUPABASE_SERVICE_ROLE_KEY`: solo se usata.
- Redeploy Production.
- Post-deploy checks.
- Rollback plan.
- Secret rotation timing dopo verifica.
- Regola: il vecchio Supabase non va cancellato finché la rollback window non è finita.

File che puoi modificare:
- `PHASE_2F_PRODUCTION_CUTOVER_RUNBOOK.md`
- `PHASE_1E_SUPABASE_V2_CUTOVER_CHECKLIST.md`, solo per link al runbook, se utile

Comandi consentiti:
- Lettura report esistenti
- `git status --short`
- `npm run prisma:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run test`

Comandi vietati:
- Qualsiasi comando Vercel Production
- Qualsiasi modifica env reale
- `psql`, `npm run db:*`, Prisma migration commands
- Backup/restore reale in questa fase
- Secret rotation reale
- Cancellazione vecchio Supabase
- `npm run build`, salvo richiesta esplicita separata

Acceptance criteria:
- Runbook Production pronto e sequenziale.
- Include go/no-go gates, rollback, env shape e post-deploy checks.
- Non esegue cutover automaticamente.
- Non contiene segreti.

Risposta finale all'utente:
- Elenca file creati/modificati.
- Riassumi i go/no-go gates.
- Conferma che Production, DB, env e vecchio Supabase non sono stati toccati.
```

### Files It May Modify

- `PHASE_2F_PRODUCTION_CUTOVER_RUNBOOK.md`
- `PHASE_1E_SUPABASE_V2_CUTOVER_CHECKLIST.md`, only for cross-reference

### Allowed Commands

- Report reads
- `git status --short`
- `npm run prisma:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run test`

### Forbidden Commands

- Production Vercel commands
- Env mutations
- DB commands and migrations
- Real backup/restore commands
- Secret rotation commands
- Old Supabase deletion

### Acceptance Criteria

- Production runbook exists.
- Cutover is not executed.
- Rollback and old-Supabase retention are explicit.
- No secrets included.

### What To Send The User After This Phase

- File list.
- Go/no-go gates.
- Rollback summary.
- Confirmation that Production, env, DB, and old Supabase were untouched.

## Phase 2G — Product-ready gap audit

### Objective

Perform the final readiness audit after Preview readiness work and before broad Production/public rollout. Produce priority gaps and go/no-go recommendation.

### Prompt to Paste Into Codex

```text
Sei GPT-5.5 / Codex agent nel repo `/Users/marian/Sites/Personale/non-lho-comprato`.

Task: esegui Phase 2G — Product-ready gap audit.

Obiettivo:
- Generare `PHASE_2G_PRODUCT_READY_GAP_AUDIT.md`.
- Audit finale post-Preview/readiness, senza fix invasivi.
- Dare percentuali ragionate per:
  - deploy readiness;
  - production beta readiness;
  - public product readiness.
- Dare raccomandazione go/no-go.

Aree da controllare:
- Runtime legacy: `Person`, `Marian`, `Martina`, workspace legacy hardcoded, bridge legacy auth.
- Workspace isolation.
- Schema workspace nullable:
  - `Entry.workspaceId String?`
  - `Habit.workspaceId String?`
  - `Goal.workspaceId String?`
  - `QuickPreset.workspaceId String?`
- Invite security.
- Rate limiting.
- Audit/error logging.
- Privacy/export/delete account.
- PWA/cache/service worker.
- Performance.
- Mobile UX.
- Accessibility.
- Release hygiene and secret rotation status.

File che puoi modificare:
- `PHASE_2G_PRODUCT_READY_GAP_AUDIT.md`

Comandi consentiti:
- File reads and grep/find searches
- `git status --short --ignored`
- `npm run prisma:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`, solo se l'utente vuole readiness completa e accetta il costo

Comandi vietati:
- `psql`, `npm run db:*`, Prisma migration commands
- Code fixes, schema migrations, env changes, provider changes
- Production changes
- Secret printing
- `rm`, `git reset --hard`, `git checkout --`

Procedura richiesta:
1. Leggi i report Phase 1 e Phase 2 disponibili.
2. Cerca riferimenti legacy e hardcoded con grep/find, senza modificare codice.
3. Valuta rischi P0/P1/P2.
4. Scrivi `PHASE_2G_PRODUCT_READY_GAP_AUDIT.md` con:
   - executive summary;
   - percentuali readiness;
   - P0/P1/P2 prioritized list;
   - go/no-go per Preview, Production beta e public launch;
   - next prompts consigliati;
   - testing gaps.
5. Esegui `npm run prisma:validate`, `npm run lint`, `npm run typecheck`, `npm run test`.

Acceptance criteria:
- Audit completo con P0/P1/P2.
- Percentuali incluse.
- Raccomandazione go/no-go chiara.
- Nessun codice/schema/env modificato.

Risposta finale all'utente:
- Elenca file creati/modificati.
- Riporta percentuali readiness.
- Riporta go/no-go sintetico.
- Riporta esito verifiche.
- Conferma che non hai eseguito DB/migration/query/env changes e non hai toccato Production.
```

### Files It May Modify

- `PHASE_2G_PRODUCT_READY_GAP_AUDIT.md`

### Allowed Commands

- File reads and searches
- `git status --short --ignored`
- `npm run prisma:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- Optional `npm run build` only if explicitly accepted for full readiness

### Forbidden Commands

- DB commands and migrations
- Code fixes or schema changes
- Env/provider/Production changes
- Secret printing
- Destructive git/filesystem commands

### Acceptance Criteria

- `PHASE_2G_PRODUCT_READY_GAP_AUDIT.md` exists.
- P0/P1/P2 list is prioritized.
- Readiness percentages are included.
- Go/no-go recommendation is explicit.

### What To Send The User After This Phase

- File list.
- Readiness percentages.
- Go/no-go recommendation.
- Verification results.
- Confirmation that DB, env, providers, and Production were untouched.

## Final Gate Before Any Deploy

Before any Preview or Production deploy, confirm all of the following:

- Phase 2A archive hygiene is complete.
- Release artifact is generated with `npm run release:archive`, not manual zip.
- `unzip -l` denylist check is clean.
- `.env.local` is local-only, ignored, untracked, and absent from archive.
- No dump files are tracked or staged.
- No secrets are printed in reports.
- `NEXT_PUBLIC_SUPABASE_URL` is the project base URL, not an auth callback URL.
- Vercel runtime `DATABASE_URL` uses Transaction pooler `:6543` with `pgbouncer=true`.
- Vercel `DIRECT_URL` uses Session pooler `:5432` or approved maintenance connection.
- Old Supabase remains available until rollback window completion.
- Secret rotation is planned after successful cutover verification.
