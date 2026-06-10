# Product Ready Correction Map — Non l’ho comprato

Audit eseguito sul filesystem corrente in `/Users/marian/Sites/Personale/non-lho-comprato` in data 2026-06-10. Non sono stati eseguiti refactor, fix o test distruttivi. `node_modules` non e presente, quindi non e stato possibile leggere `node_modules/next/dist/docs/` come richiesto da `AGENTS.md` senza installare dipendenze e modificare lo stato locale.

## 1. Executive summary

- Stato attuale stimato: 4/10.
- Andrei in prod? No.
- Motivo: il progetto ha una base solida e molte correzioni gia avviate, ma restano blocker su segreti locali, workspaceId nullable nei dati core, runtime legacy Marian/Martina ancora accoppiato al dominio, assenza di test di isolamento multi-workspace, migrazioni recenti senza preflight/postflight operativo e server actions troppo grandi per essere mantenute in sicurezza.

Top 10 blocker:

1. `.env`, `.env.local`, `.env.merge-source` presenti nel working tree con segreti e URL reali.
2. `workspaceId` ancora nullable su `Entry`, `Habit`, `Goal`, `QuickPreset`.
3. Runtime ancora dipendente da `Person`, `paidBy`, mapping Marian/Martina e sync legacy.
4. Mancano test integration per isolamento workspace e cookie workspace manipolato.
5. Migrazione Category workspace-scoped fragile su dati reali e non accompagnata da preflight/postflight obbligatori.
6. Logica money ancora duplicata tra dominio, action, UI, stats, report ed export.
7. `app/api/exports/ai-analysis/route.ts` non seleziona `mode` e `savingContext`, quindi l'export puo inferire dati diversi dal DB.
8. Server actions principali da 700-1500 righe mischiano validazione, auth, query, dominio, serializzazione e revalidate.
9. Stats/report/dashboard calcolano troppe aggregazioni caricando record in memoria.
10. Mancano rate limiting, audit log, backup/restore runbook e processo release pulito.

Top 10 quick wins:

1. Rimuovere i file `.env*` reali dagli artefatti e rigenerare tutti i segreti esposti.
2. Correggere `.gitignore` con `!.env.example` e verificare che `.env.example` sia tracciato.
3. Aggiungere `.dockerignore` e script `release:archive` basato su `git archive`.
4. Aggiungere job CI con `npm run check` come unico gate ufficiale.
5. Correggere export AI selezionando `mode` e `savingContext`.
6. Aggiungere query preflight/postflight per tutte le migrazioni dati recenti.
7. Aggiungere test unitari di consistenza money per action/preset/export.
8. Aggiungere test integration minimi per accesso cross-workspace negato.
9. Disabilitare in modo esplicito ogni bridge legacy in production e fallire se attivo.
10. Creare issue tecniche per spezzare `entries.ts`, `habits.ts`, `stats.ts`, `reports.ts`, `presets.ts`.

## 2. Verification of known issues

| ID | Problema noto | Stato | Evidenza file | Note |
|---|---|---|---|---|
| K01 | Segreti e `.env*` negli artefatti | Not resolved | `.env`, `.env.local`, `.env.merge-source`, `.gitignore` | I file sensibili sono presenti nel working tree. `.env.example` esiste ma `.gitignore` contiene `.env*`, quindi resta ignorato se non viene aggiunto `!.env.example`. |
| K02 | Repo/artefatti sporchi | Partially resolved | `.git`, `.idea`, `.claude`, `.agents`, `.gitignore` | Non risultano `node_modules`, `.next`, zip annidati o `.DS_Store`; restano directory IDE/agent nel progetto e parti di `.idea`/`.agents` tracciate. Manca processo release pulito. |
| K03 | `Category` global unique non compatibile multi-workspace | Resolved for schema, partially resolved for migration | `prisma/schema.prisma:63`, `prisma/migrations/20260610140000_scope_categories_to_workspace/migration.sql` | Lo schema ora usa `workspaceId` obbligatorio e unique per workspace. La migration e rischiosa su DB reali se ci sono workspace mancanti, duplicati o dati con `workspaceId NULL`. |
| K04 | `workspaceId` opzionali nei dati core | Not resolved | `prisma/schema.prisma:84`, `prisma/schema.prisma:134`, `prisma/schema.prisma:171`, `prisma/schema.prisma:186` | `Entry`, `Habit`, `Goal`, `QuickPreset` restano nullable e con `onDelete: SetNull`. Non e product-ready multi-user. |
| K05 | Policy `onDelete` incoerente | Partially resolved | `prisma/schema.prisma` | `Category` e `WorkspaceMember` usano Cascade/Restrict in modo ragionevole, ma workspace su dati core usa SetNull e puo creare orfani applicativi. |
| K06 | Indici DB incompleti | Partially resolved | `prisma/schema.prisma`, `20260610150000_add_entry_stats_indexes` | Aggiunti indici importanti su Entry e invite token hash. Mancano compositi utili per user scoped query, membership e alcune aggregazioni. |
| K07 | Legacy Marian/Martina nel runtime | Partially resolved | `src/lib/auth/session.ts`, `src/lib/auth/provisioning.ts`, `src/lib/entry-person-sync.ts`, `src/actions/entries.ts`, `src/actions/habits.ts`, `src/actions/goals.ts`, `src/actions/presets.ts` | Alcuni fallback sono feature-flagged, ma `Person`, `paidBy`, mapping legacy e sync entrano ancora nei write path e nelle statistiche. |
| K08 | Entry domain e soldi con doppia fonte di verita | Partially resolved | `src/lib/entry-domain.ts`, `src/features/entries/form-money.ts`, `src/lib/entry-calculations.ts`, `src/components/entries/entry-form-money.ts`, `src/actions/presets.ts` | Esiste dominio centrale testato, ma non e ancora l'unica fonte usata da UI, preset, stats, report ed export. |
| K09 | Workspace isolation | Partially resolved | `src/lib/workspace-context.ts`, `src/lib/auth/session.ts`, `src/actions/*`, `app/api/exports/ai-analysis/route.ts` | La maggior parte delle query e scoped e ci sono helper centrali, ma lo schema permette null, mancano integration test e ci sono fallback legacy/migration. |
| K10 | Server actions troppo grandi | Not resolved | `src/actions/entries.ts`, `src/actions/habits.ts`, `src/actions/stats.ts`, `src/actions/reports.ts`, `src/actions/presets.ts` | File da 733 a 1541 righe con troppe responsabilita. |
| K11 | UI/UX duplicata o transitoria | Partially resolved | `src/components/**`, `components/**` | UI crafted coerente, ma naming transitorio, componenti enormi, wrapper legacy, copy non sempre diretto e accessibilita non verificata. |
| K12 | Performance stats/report/export | Partially resolved | `src/actions/stats.ts`, `src/actions/reports.ts`, `src/actions/dashboard.ts`, `src/actions/goals.ts`, `app/api/exports/ai-analysis/route.ts` | Export e paginazione entries sono migliorati; stats/report/dashboard caricano ancora grandi dataset in memoria. |
| K13 | Test/QA/CI | Partially resolved | `package.json`, `.github/workflows/ci.yml`, `src/**/*.test.ts` | `check` e CI esistono. Mancano test integration, e2e, migration e access-control. Non verificato localmente per assenza di `node_modules`. |
| K14 | Migration safety | Partially resolved | `prisma/migrations/20260610120000_*`, `20260610130000_*`, `20260610140000_*`, `20260610150000_*` | Migrazioni presenti ma non idempotenti, senza preflight/postflight codificato, senza rollback runbook e con rischi dati. |
| K15 | DevOps/product hardening | Partially resolved | `next.config.ts`, `sentry.*.config.ts`, `src/lib/sentry.ts`, `src/lib/posthog.ts`, `.github/workflows/ci.yml` | Observability base presente. Mancano rate limit, audit log, backup, privacy/delete workflow, release artifact pulito. |

## 3. Newly discovered issues

| ID | Area | Gravita | File | Problema | Impatto | Fix |
|---|---|---|---|---|---|---|
| N01 | Env hygiene | High | `.gitignore`, `.env.example` | `.env.example` e ignorato da `.env*`. | Nuovi dev/CI non hanno contratto env tracciato. | Aggiungere `!.env.example`, tracciare template senza segreti. |
| N02 | Export AI | High | `app/api/exports/ai-analysis/route.ts`, `src/lib/ai-export.ts` | La route non seleziona `mode` e `savingContext`. | CSV AI puo esportare valori inferiti e non quelli persistiti. | Includere i campi in `exportSelect` e testare. |
| N03 | DB drift legacy | High | `20260517120000_add_entry_payer_beneficiaries`, `20260517140000_add_entry_beneficiary`, `prisma/schema.prisma` | La colonna SQL legacy `Entry.beneficiaries Person[]` viene mantenuta ma non e nel Prisma schema attuale. | Drift tra schema Prisma e DB, confusione migrazioni, rischio dati legacy invisibili. | Pianificare drop controllato dopo backfill e verifiche. |
| N04 | Release process | Medium | repository root | Manca `.dockerignore` e manca script release pulito. | Alta probabilita di zip con segreti, IDE, cache o agent artifacts. | Usare `git archive`, allowlist e controlli pre-release. |
| N05 | Runtime flags | High | `src/lib/auth/provisioning.ts` | `ENABLE_LEGACY_AUTH_BRIDGE` non e hard-blocked in production nel punto di lettura flag. | Un env sbagliato puo riattivare mapping legacy in prod. | Rendere il flag non attivabile in production o fail-fast. |
| N06 | Logging | Medium | `src/components/auth/login-panel.tsx`, `src/lib/workspace-debug.ts`, `src/actions/**` | Alcuni log possono includere redirect URL, email o error payload dettagliati. | Rischio PII/token in browser console o platform logs. | Logging strutturato e sanitizzato, no URL query, no email salvo debug locale. |
| N07 | DB connection policy | Medium | `src/lib/prisma.ts` | Pool `max: 1` e SSL `rejectUnauthorized: false` sono policy globali. | Bottleneck o postura TLS debole in ambienti non serverless. | Config per ambiente, pool documentato, TLS verificato dove possibile. |
| N08 | README | Low | `README.md` | README e ancora default Next.js. | Onboarding tecnico e deploy non riproducibili. | Scrivere README progetto con setup, env, check, deploy, migrazioni. |
| N09 | BOM/hygiene | Low | `src/actions/entries.ts`, `src/actions/habits.ts`, alcuni wrapper component | Alcuni file hanno BOM UTF-8. | Rumore in diff/tooling. | Normalizzare encoding in fase cleanup. |
| N10 | Dead/transitional UI | Medium | `src/components/presets/preset-form.tsx`, wrapper `src/components/**` | Componenti vecchi e wrapper crafted convivono. | Manutenzione piu costosa e bug duplicati. | Inventory import graph e rimozione componenti non usati. |
| N11 | Error swallowing | Medium | `src/actions/stats.ts`, `src/actions/reports.ts`, `src/actions/entries.ts` | Diverse action catturano errori e ritornano array vuoti o fallback. | Errori DB/access control possono apparire come dati mancanti. | Error boundary/user error espliciti, Sentry event, no silent fallback in prod. |
| N12 | PWA runtime | Low | `public/sw.js`, `app/manifest.ts` | Service worker minimale senza strategia cache/offline. | PWA mobile-first non offre offline reale. | Definire caching esplicito o rimuovere promessa offline dal prodotto. |
| N13 | Privacy/data lifecycle | High | schema/app | Non ci sono audit log, data export/delete account/workspace workflow completi. | Non pronto per utenti reali e richieste privacy. | Aggiungere audit log, export dati utente, delete/anonymize policy. |

## 4. Production blockers

### B01. Segreti presenti nel working tree

- Gravita: Critical.
- File: `.env`, `.env.local`, `.env.merge-source`, `.gitignore`.
- Cosa succede se ignorato: credenziali DB/Supabase/Vercel possono essere incluse in zip o viste da strumenti/agent/log, con rischio compromissione dati.
- Fix minimo: rimuovere i file da ogni artefatto, assicurarsi che non siano tracciati, rigenerare segreti potenzialmente esposti.
- Fix ideale: secret rotation completa, `!.env.example`, secret scanning in CI, release via `git archive`, runbook env.
- Test di accettazione: `find . -maxdepth 4 -name ".env*" -print` mostra solo `.env.example` negli artefatti; `git ls-files .env .env.local .env.merge-source` non ritorna nulla.

### B02. Workspace nullable sui dati core

- Gravita: Critical.
- File: `prisma/schema.prisma:84`, `prisma/schema.prisma:134`, `prisma/schema.prisma:171`, `prisma/schema.prisma:186`.
- Cosa succede se ignorato: entry, habit, goal e preset possono diventare orfani o invisibili; le query scoped non garantiscono consistenza dati.
- Fix minimo: preflight, backfill `workspaceId`, vincoli `NOT NULL` sui dati core.
- Fix ideale: policy dati completa con `onDelete` coerente, FK obbligatorie, migration testata su snapshot reale.
- Test di accettazione: count null pari a zero per tutti i model core e migration applicabile su DB clone.

### B03. Legacy Marian/Martina nel runtime

- Gravita: Critical.
- File: `src/lib/entry-person-sync.ts`, `src/lib/person-filter.ts`, `src/lib/workspace-member-filter.ts`, `src/lib/auth/provisioning.ts`, `src/actions/entries.ts`, `src/actions/habits.ts`, `src/actions/goals.ts`, `src/actions/presets.ts`.
- Cosa succede se ignorato: il modello multi-user resta contaminato da assunzioni personali e i dati nuovi possono essere scritti con semantica legacy.
- Fix minimo: disabilitare bridge legacy in production, isolare script legacy fuori dal runtime, usare membership/userId nei nuovi write path.
- Fix ideale: rimuovere `Person`, `Entry.person`, `Entry.paidBy`, `Goal.person`, `QuickPreset.person` dopo backfill e test.
- Test di accettazione: nessuna create/update runtime usa `Person`; filtri e report usano solo `WorkspaceMember`/`EntryBeneficiary`/`paidByUserId`.

### B04. Access control non provato da test integration

- Gravita: Critical.
- File: `src/lib/workspace-context.ts`, `src/actions/**`, `app/api/exports/ai-analysis/route.ts`.
- Cosa succede se ignorato: regressioni future possono esporre, modificare o esportare dati di altri workspace.
- Fix minimo: test integration con due utenti e due workspace su DB test.
- Fix ideale: repository scoped obbligatori, policy helper unica, tests per ogni aggregate/action/export.
- Test di accettazione: user A non legge, modifica, cancella o esporta dati workspace B; cookie workspace manipolato non bypassa membership.

### B05. Migrazioni dati non accompagnate da safety runbook

- Gravita: High.
- File: `prisma/migrations/20260610120000_add_entry_mode_saving_context/migration.sql`, `20260610130000_harden_workspace_invites/migration.sql`, `20260610140000_scope_categories_to_workspace/migration.sql`.
- Cosa succede se ignorato: deploy su DB reale puo fallire a meta, creare duplicati, perdere mapping categoria o bloccare FK.
- Fix minimo: query preflight/postflight, backup obbligatorio, deploy su clone.
- Fix ideale: script migration safety versionati e rollback documentato per ogni fase.
- Test di accettazione: migration applicata su dump clone con count invarianti e zero mismatch workspace/category.

### B06. Logica soldi non centralizzata

- Gravita: High.
- File: `src/lib/entry-domain.ts`, `src/features/entries/form-money.ts`, `src/lib/entry-calculations.ts`, `src/components/entries/entry-form-money.ts`, `src/actions/presets.ts`, `src/actions/stats.ts`, `src/actions/reports.ts`, `src/lib/ai-export.ts`.
- Cosa succede se ignorato: salvataggi, KPI, report ed export possono mostrare numeri diversi per la stessa entry.
- Fix minimo: tutte le write path usano `calculateEntryMoney`; export seleziona `mode`/`savingContext`; test consistency.
- Fix ideale: schema validation condiviso, value object Money, constraints DB, no calcoli business nei componenti.
- Test di accettazione: casi zero/null/negative/decimal/avoid/spent producono stessi risultati in action, UI serialization, report ed export.

### B07. Server actions monolitiche

- Gravita: High.
- File: `src/actions/entries.ts`, `src/actions/habits.ts`, `src/actions/stats.ts`, `src/actions/reports.ts`, `src/actions/presets.ts`.
- Cosa succede se ignorato: ogni fix sicurezza o dominio rischia regressioni laterali e review lente.
- Fix minimo: aggiungere characterization tests prima del refactor.
- Fix ideale: split feature-based in actions, repositories, schemas, domain, tests.
- Test di accettazione: behavior invariato, coverage su access control e dominio, action sottili e leggibili.

### B08. Performance aggregazioni non scalabile

- Gravita: High.
- File: `src/actions/stats.ts`, `src/actions/reports.ts`, `src/actions/dashboard.ts`, `src/actions/goals.ts`, `src/actions/streaks.ts`.
- Cosa succede se ignorato: dataset reali degradano TTFB, memory e costi DB/app.
- Fix minimo: paginazione/limiti e query aggregate SQL per dashboard/stats principali.
- Fix ideale: materialized summaries o tabelle aggregate per workspace/month quando il volume cresce.
- Test di accettazione: benchmark su dataset sintetico grande entro budget di latenza/memoria definito.

### B09. Rate limiting e audit assenti

- Gravita: High.
- File: `src/actions/workspace.ts`, invite actions, `app/api/exports/ai-analysis/route.ts`, schema Prisma.
- Cosa succede se ignorato: invite brute force, export abuse, cancellazioni/modifiche non tracciate.
- Fix minimo: rate limit su invite/export e audit log per mutazioni critiche.
- Fix ideale: policy centralizzata con audit event per workspace, member, invite, export, delete.
- Test di accettazione: richieste oltre soglia bloccate e audit event scritto per mutazioni sensibili.

### B10. Artifact/release hygiene incompleta

- Gravita: High.
- File: `.gitignore`, repository root, CI.
- Cosa succede se ignorato: si ripete il problema zip con env, IDE, cache, agent files.
- Fix minimo: `git archive` per release, denylist validation.
- Fix ideale: release script idempotente con checksum e manifest artefatto.
- Test di accettazione: archivio contiene solo file tracciati consentiti e nessun `.env*`, `.git`, `.idea`, `.agents`, `.claude`, `.next`, `node_modules`.

## 5. Database correction map

### Stato attuale

- `Category` e ora workspace-scoped nello schema.
- `Entry`, `Habit`, `Goal`, `QuickPreset` sono ancora workspace-scoped solo a livello applicativo perche `workspaceId` e nullable.
- `WorkspaceInvite` e stato irrobustito con token hash, tipo, ruolo, revoca e contatori.
- `EntryBeneficiary` esiste e affianca campi legacy `person`/`paidBy`.
- Lo schema conserva modelli e campi legacy che vanno rimossi solo dopo backfill e validazione.

### Problemi

- `onDelete: SetNull` su `Workspace` verso dati core produce orfani applicativi.
- Migrazione category scope non valida tutti i casi reali prima di imporre `NOT NULL`.
- Colonna SQL legacy `Entry.beneficiaries` puo restare nel DB ma non nello schema Prisma.
- Indici non ancora completi per tutte le query multi-user e reportistiche.
- Mancano check constraints su money domain e status enum business.

### Schema target

- `Entry.workspaceId String`, FK `Workspace` obbligatoria.
- `Habit.workspaceId String`, FK `Workspace` obbligatoria.
- `Goal.workspaceId String`, FK `Workspace` obbligatoria.
- `QuickPreset.workspaceId String`, FK `Workspace` obbligatoria.
- `Category.workspaceId String`, unique `workspaceId+slug` e `workspaceId+name` come gia presente.
- `Entry.createdByUserId` e `Entry.paidByUserId` nullable solo se dati storici non attribuibili; per nuovi record devono essere richiesti dall'app.
- `EntryBeneficiary` diventa fonte primaria dei beneficiari.
- Campi legacy `Person` rimossi dal runtime e poi dal DB.
- `Workspace` delete policy: soft delete o restricted delete in produzione, hard cascade solo in maintenance esplicita.

### Migration plan

1. Backup DB e restore su clone.
2. Preflight null workspace e mismatch categoria.
3. Backfill `workspaceId` per `Entry`, `Habit`, `Goal`, `QuickPreset` usando workspace legacy o regole ownership documentate.
4. Backfill `paidByUserId`, `createdByUserId`, `EntryBeneficiary` da `person`/`paidBy` dove possibile.
5. Imporre `NOT NULL` su `workspaceId` dei dati core.
6. Cambiare `onDelete` da `SetNull` a policy scelta, preferibilmente `Restrict` o soft delete per Workspace.
7. Rimuovere fallback `EntryBeneficiary` missing table dal runtime.
8. Dopo un deploy stabile, droppare colonne legacy non usate.

### Preflight queries

```sql
SELECT COUNT(*) FROM "Entry" WHERE "workspaceId" IS NULL;
SELECT COUNT(*) FROM "Habit" WHERE "workspaceId" IS NULL;
SELECT COUNT(*) FROM "Goal" WHERE "workspaceId" IS NULL;
SELECT COUNT(*) FROM "QuickPreset" WHERE "workspaceId" IS NULL;
SELECT COUNT(*) FROM "Category" WHERE "workspaceId" IS NULL;

SELECT "workspaceId", slug, COUNT(*)
FROM "Category"
GROUP BY "workspaceId", slug
HAVING COUNT(*) > 1;

SELECT "workspaceId", name, COUNT(*)
FROM "Category"
GROUP BY "workspaceId", name
HAVING COUNT(*) > 1;

SELECT COUNT(*)
FROM "Entry" e
JOIN "Category" c ON c.id = e."categoryId"
WHERE e."workspaceId" IS DISTINCT FROM c."workspaceId";

SELECT COUNT(*)
FROM "Habit" h
JOIN "Category" c ON c.id = h."categoryId"
WHERE h."workspaceId" IS DISTINCT FROM c."workspaceId";

SELECT COUNT(*)
FROM "QuickPreset" p
JOIN "Category" c ON c.id = p."categoryId"
WHERE p."workspaceId" IS DISTINCT FROM c."workspaceId";

SELECT COUNT(*)
FROM "EntryBeneficiary" b
JOIN "Entry" e ON e.id = b."entryId"
LEFT JOIN "WorkspaceMember" wm
  ON wm."workspaceId" = e."workspaceId"
 AND wm."userId" = b."userId"
WHERE wm.id IS NULL;

SELECT COUNT(*)
FROM "Entry"
WHERE mode = 'avoided'
  AND ("realCost" <> 0 OR "alternativeCost" <> "savedAmount");

SELECT COUNT(*)
FROM "Entry"
WHERE mode = 'spent'
  AND "savingContext" = 'none'
  AND ("realCost" <> "alternativeCost" OR "savedAmount" <> 0);
```

### Postflight queries

```sql
SELECT COUNT(*) FROM "Entry" WHERE "workspaceId" IS NULL;
SELECT COUNT(*) FROM "Habit" WHERE "workspaceId" IS NULL;
SELECT COUNT(*) FROM "Goal" WHERE "workspaceId" IS NULL;
SELECT COUNT(*) FROM "QuickPreset" WHERE "workspaceId" IS NULL;

SELECT COUNT(*)
FROM "Entry" e
JOIN "Category" c ON c.id = e."categoryId"
WHERE e."workspaceId" <> c."workspaceId";

SELECT COUNT(*)
FROM "WorkspaceMember"
GROUP BY "workspaceId", "userId"
HAVING COUNT(*) > 1;

SELECT COUNT(*)
FROM "WorkspaceInvite"
WHERE "tokenHash" IS NULL OR "expiresAt" < "createdAt";
```

### Indici consigliati

- `Entry(workspaceId, paidByUserId, date)`.
- `Entry(workspaceId, createdByUserId, date)`.
- `EntryBeneficiary(userId, entryId)` o `EntryBeneficiary(userId, shareType)` in base alle query.
- `HabitOccurrence(habitId, date)` gia unique, valutare `HabitOccurrence(date)` per cleanup/report.
- `WorkspaceMember(userId, workspaceId)` come lookup inverso esplicito.
- `Goal(workspaceId, status, targetDate)`.
- `QuickPreset(workspaceId, active, sortOrder)` se cresce il numero di preset.

## 6. Security correction map

### Segreti

- Stato: Not resolved.
- File coinvolti: `.env`, `.env.local`, `.env.merge-source`, `.env.example`, `.gitignore`.
- Rischio: esposizione DB, Supabase, Vercel/OIDC, PostHog/Sentry o URL interni.
- Fix: rimuovere i file reali dagli artefatti, ruotare segreti, tracciare solo `.env.example`, aggiungere secret scanning CI.

Comandi di verifica:

```bash
find . -maxdepth 4 \( -path ./node_modules -o -path ./.next -o -path ./.git \) -prune -o -name ".env*" -print

grep -RInE "DATABASE_URL|DIRECT_URL|SUPABASE|VERCEL|OIDC|TOKEN|SECRET|PASSWORD|SERVICE_ROLE" . \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.merge-source' \
  --exclude='package-lock.json' \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=.git

git ls-files .env .env.local .env.merge-source .env.example
```

### Access control

- Centralizzare ogni query runtime dietro repository workspace-scoped.
- Vietare query `findMany` su dati core senza `workspaceId` o access helper.
- Testare user A vs workspace B su read, write, delete, export.
- Trattare cookie workspace come hint non fidato, mai come autorizzazione.

### Rate limiting

- Applicare rate limit a invite create/accept, export CSV, auth callback error loops e mutazioni ad alta frequenza.
- Usare chiave composta da userId, workspaceId e IP dove disponibile.
- Loggare eventi rate limited senza PII non necessaria.

### Invite system

- Buona base: `tokenHash`, `expiresAt`, `revokedAt`, `maxUses`, `usedCount`.
- Mancano test integration su token revocato, scaduto, multi-use, email-bound e workspace errato.
- Mancano limiti su creazione inviti per workspace/admin.

### Export/API

- `app/api/exports/ai-analysis/route.ts` usa streaming batch e workspace scoping.
- Deve selezionare `mode`/`savingContext`.
- Deve avere rate limit e audit event `export.created`.
- Deve avere test cross-workspace e test CSV schema.

### Logging

- Sentry e PostHog sono configurati con sanitizzazione ragionevole.
- Eliminare log browser di `redirectTo` in `src/components/auth/login-panel.tsx`.
- Rendere `DEBUG_WORKSPACE` non attivabile in production o fortemente sanitizzato.
- Convertire `console.error` runtime in logger centralizzato con redaction.

### Audit log

- Aggiungere modello `AuditEvent` con `workspaceId`, `actorUserId`, `action`, `targetType`, `targetId`, `metadataJson`, `createdAt`.
- Tracciare invite, member role changes, export, delete, migration maintenance e workspace settings.
- Non salvare token, cookie, full URL query o segreti nei metadata.

## 7. Legacy removal map

### Cosa e legacy

- `enum Person` con `MARIAN`, `MARTINA`, `TUTTI`.
- `Entry.person`, `Entry.paidBy`.
- `Goal.person`, `QuickPreset.person`.
- Colonna SQL storica `Entry.beneficiaries Person[]`.
- Costanti `legacy-marian`, `legacy-martina`, `legacy-marian-martina`.
- Feature flags `ENABLE_LEGACY_FALLBACK`, `ENABLE_LEGACY_AUTH_BRIDGE`.
- Helper `syncEntryPersonColumns`, `buildPersonWhere`, mapping legacy member/person.

### Dove vive

- Schema: `prisma/schema.prisma`.
- Auth/provisioning: `src/lib/auth/session.ts`, `src/lib/auth/provisioning.ts`.
- Entry sync/filter: `src/lib/entry-person-sync.ts`, `src/lib/person-filter.ts`, `src/lib/workspace-member-filter.ts`.
- Actions: `src/actions/entries.ts`, `src/actions/habits.ts`, `src/actions/goals.ts`, `src/actions/presets.ts`, `src/actions/stats.ts`.
- UI labels: `src/lib/ui-person.ts`, componenti filter/member.
- Scripts/migrations: `prisma/*.ts`, `scripts/*.ts`.

### Cosa puo restare temporaneamente

- Script di backfill e migration in `scripts/` o `prisma/`, con nome chiaro e non importati dal runtime.
- Lettura legacy solo in migration/backfill, non in action runtime.
- Compat export storico solo se esplicitamente versionato.

### Cosa va rimosso

- Ogni write runtime che imposta `person` o `paidBy`.
- Ogni filtro runtime basato su `Person` come fallback silenzioso.
- Bridge legacy auth in production.
- Colonne e enum legacy dopo backfill validato.

### Sequenza sicura

1. Aggiungere test characterization per dati Marian/Martina esistenti.
2. Backfill `EntryBeneficiary`, `paidByUserId`, `createdByUserId`, goal owner/member e preset owner/member.
3. Rendere nuove write path user/member based.
4. Disabilitare fallback legacy in production con fail-fast.
5. Rimuovere uso runtime di `Person` da actions/stats/reports/UI.
6. Eseguire migration drop legacy solo dopo una release stabile e backup.
7. Rimuovere helper legacy rimasti e testare export/report storici.

## 8. Architecture refactor map

### File grandi

| File | Righe stimate | Responsabilita attuali | Estrazioni consigliate |
|---|---:|---|---|
| `src/actions/entries.ts` | 1541 | CRUD entry, access, money parsing, beneficiaries, serialization, pagination, legacy sync, revalidate | `features/entries/actions`, `repositories`, `domain`, `schemas`, `serializers`, `tests` |
| `src/actions/habits.ts` | 1362 | Habit CRUD, occurrence engine, entry creation, legacy sync, transactions | `features/habits/domain/scheduler`, `repositories`, `actions`, `tests` |
| `src/actions/stats.ts` | 1274 | Aggregazioni, filtri, member stats, habit stats, serialization | `features/stats/repositories`, `aggregators`, `queries`, `tests` |
| `src/actions/reports.ts` | 866 | Monthly reports, previous period, habit stats, entry aggregation | `features/reports/domain`, `repositories`, `actions` |
| `src/actions/presets.ts` | 733 | Preset CRUD, money parse, legacy person mapping, category/member mapping | `features/presets/schemas`, `domain`, `repositories`, `actions` |
| `src/components/entries/quick-add-sheet.tsx` | 1055 | Form state, presets, entry UI, validation, mode UI | Split in form shell, money section, category section, beneficiary section, preset picker |

### Struttura target

```txt
src/features/entries/
  actions/
  components/
  domain/
  repositories/
  schemas/
  tests/
```

Applicare lo stesso pattern a `habits`, `stats`, `reports`, `presets`, `workspaces`.

### Ordine refactor

1. Aggiungere test characterization senza cambiare comportamento.
2. Estrarre funzioni pure senza Prisma.
3. Estrarre repository workspace-scoped.
4. Rendere action sottili e lasciarle come API compatibile.
5. Eliminare fallback legacy dopo test e migration.
6. Spezzare componenti UI solo dopo stabilizzazione dominio/API.

### Test prima/dopo

- Prima: snapshot behavior action principali, money cases, access denied.
- Dopo: unit domain, repository integration, server action integration, e2e happy path.
- Ogni PR refactor deve avere `npm run check` verde.

## 9. Business/domain correction map

### Entry domain target

- Fonte unica: campi base `mode`, `savingContext`, `amountSpent`, `comparisonAmount` rappresentati nel DB come `realCost`, `alternativeCost`, `savedAmount` solo se necessario per compatibilita.
- `savedAmount` deve essere derivato da una funzione unica e verificabile.
- `paidByUserId` identifica chi paga.
- `EntryBeneficiary` identifica chi beneficia, con share esplicito se serve.
- `Category` e sempre del workspace dell'entry.

### Money calculation target

- Un solo modulo pure-domain per parse, normalize, calculate, serialize.
- Decimal/cents handling centralizzato, senza `Number()` sparsi nei report.
- Casi espliciti: importo zero, confronto nullo, confronto minore della spesa, avoided purchase, refund/negative non ammessi se non modellati.
- Property/table tests su combinazioni `mode` x `savingContext`.

### Validation target

- Schema condiviso per form/action/import/export.
- Le action non devono accettare stringhe non validate o NaN.
- Preset e quick add devono riusare la stessa validazione entry.
- Vincoli DB per non negativita dove il dominio lo richiede.

### Export/stats/report consistency

- Export deve usare dati persistiti completi, non inferenze incomplete.
- Stats/report devono usare lo stesso serializer/view model del dominio entry.
- Dashboard KPI deve definire cosa significa risparmio, spesa, evitato, confronto e impatto.
- Aggiungere test che confrontano una entry fixture attraverso action, stats, report, export.

## 10. UI/UX correction map

### Cosa tenere

- Direzione visuale crafted scura/calda con personalita riconoscibile.
- Mobile-first e componenti bottom sheet per quick add.
- Stati principali di dashboard, stats, habits e reports gia orientati al prodotto.
- Uso di Sentry/PostHog con privacy-minded defaults.

### Cosa eliminare

- Componenti vecchi non importati dopo inventory, per esempio `src/components/presets/preset-form.tsx` se confermato dead.
- Wrapper che re-exportano `Crafted*` quando il naming definitivo e stato scelto.
- Copy poetico dove ostacola chiarezza operativa.
- Log console nel client.

### Cosa rinominare

- `crafted-*` deve diventare naming di dominio stabile: `Dashboard`, `EntryList`, `EntryForm`, `HabitCard`, `StatsOverview`.
- Alias transitori devono essere rimossi dopo aggiornamento import.
- Label Marian/Martina devono diventare member/user labels.

### Cosa ridisegnare

- Quick add sheet: spezzare sezioni e rendere flow piu chiaro.
- KPI dashboard: mostrare definizioni pratiche e consistenti con il dominio money.
- Empty states: rendere diretti e orientati all'azione.
- Error states: distinguere errore rete/auth/validazione/accesso.
- Workspace UI: rendere membership, role e inviti comprensibili.

### Accessibilita

- Verificare label, aria-label e role su icon button, segmented controls, sheets e dialog.
- Verificare focus trap e focus return.
- Verificare keyboard navigation per quick add, switcher workspace, filters.
- Verificare contrasto su `text-ink-3`, `muted`, card outline e stati disabled.
- Aggiungere axe/Playwright smoke test sulle pagine core.

## 11. Performance correction map

### Query rischiose

- `src/actions/stats.ts`: piu funzioni caricano tutte le entry scoped in memoria per aggregazioni.
- `src/actions/reports.ts`: report mensile e confronto precedente caricano dataset completi e aggregano in JS.
- `src/actions/dashboard.ts`: balance carica tutte le entry workspace.
- `src/actions/goals.ts`: progress goal calcola su tutte le entry del periodo.
- `src/actions/streaks.ts`: streak calcola caricando entries ordinate.
- `src/actions/habits.ts`: cleanup/finalizzazione occorrenze vecchie puo crescere senza limiti.

### Indici

- Aggiungere compositi user/date su Entry.
- Aggiungere indici su Goal status/targetDate.
- Valutare indici su QuickPreset active/sortOrder.
- Verificare query plan per report mensili su `workspaceId + date`.

### Paginazione

- Entries page ha gia cursor pagination.
- Applicare paginazione o range obbligatorio a reports/stats dove non serve full history.
- Definire limiti massimi export per richiesta o job async per workspace grandi.

### Export

- Streaming batch da 1000 e positivo.
- Correggere select `mode`/`savingContext`.
- Aggiungere rate limit e audit.
- Valutare job async se CSV supera soglia righe/dimensione.

### Aggregazioni

- Spostare KPI principali in SQL aggregate.
- Usare query per month/category/member invece di JS reduce su tutti i record.
- Considerare summary table per workspace/month quando il volume cresce.
- Benchmark target: definire dataset 10k, 100k e 1M entry su clone locale.

## 12. Testing & QA correction map

### Test attuali

- `src/lib/entry-domain.test.ts`.
- `src/features/entries/form-money.test.ts`.
- `src/lib/ai-export.test.ts`.
- `src/features/categories/category-scope.test.ts`.
- `src/features/workspaces/rbac-policy.test.ts`.
- `src/lib/workspace-invites.test.ts`.
- `src/lib/auth/provisioning.test.ts`.
- `src/lib/daily-spending-comparison.test.ts`.
- `src/lib/rome-dates.test.ts`.

### Test mancanti

- Integration Prisma con DB test.
- Access control cross-workspace per tutte le action critiche.
- Export CSV cross-workspace e schema CSV.
- Migration tests su snapshot realistico.
- E2E login/onboarding/workspace switch/quick add/report/export.
- A11y smoke tests.
- Performance smoke tests su dataset sintetico.

### Test matrix

- Unit: domain money, invite policy, RBAC, date logic, category scope.
- Integration: repositories workspace-scoped, server actions CRUD, export route.
- Migration: preflight/postflight su DB clone.
- E2E: first user, second user, invite, workspace switch, entry lifecycle, habit occurrence.
- Security: cookie tampering, non-member access, expired/revoked invite, rate limit.
- UI: mobile viewport, keyboard nav, screen reader labels, error states.

### CI target

- `npm ci`.
- `npm run prisma:validate`.
- `npm run lint`.
- `npm run typecheck`.
- `npm run test`.
- `npm run build`.
- DB integration job con Postgres service quando i test integration verranno aggiunti.

### Comandi obbligatori

```bash
rm -rf node_modules .next
npm ci
npm run check
```

Nota: `npm run check` attualmente include Prisma validate, lint, typecheck, test e build. Non e stato eseguito in questo audit perche `node_modules` e assente e l'installazione modificherebbe il workspace.

## 13. Step-by-step implementation roadmap

### Phase 0 — Stop bleeding

- Obiettivo: bloccare rischi immediati su segreti, artefatti e check di base.
- Task: rimuovere env reali dagli artefatti, ruotare segreti, correggere `.gitignore`, aggiungere `.dockerignore`, aggiungere script release con `git archive`, verificare CI/check.
- File da toccare: `.gitignore`, `.env.example`, `.dockerignore`, `package.json`, `.github/workflows/ci.yml`, documentazione release.
- Dipendenze: accesso ai secret manager Supabase/Vercel/Sentry/PostHog.
- Rischi: rotazione incompleta o interruzione deploy se env mancanti.
- Acceptance criteria: nessun env reale negli archivi, `.env.example` tracciato, `npm run check` verde, release zip pulita.
- Comandi di verifica:

```bash
find . -maxdepth 4 -name ".env*" -print
git ls-files .env .env.local .env.merge-source .env.example
git archive --format=zip --output=/tmp/non-lho-comprato-test.zip HEAD
unzip -l /tmp/non-lho-comprato-test.zip | grep -E "(^|/)\.env|node_modules|\.next|\.git|\.idea|\.agents|\.claude" || true
npm run check
```

### Phase 1 — Migration safety & DB correctness

- Obiettivo: rendere consistenti schema e dati prima di rafforzare access control.
- Task: preflight DB, backfill workspaceId, backfill category ownership, test migration su clone, rendere workspaceId obbligatorio, definire onDelete.
- File da toccare: `prisma/schema.prisma`, `prisma/migrations/**`, nuovi script preflight/postflight, `src/lib/workspace-context.ts` se necessario.
- Dipendenze: backup DB e snapshot realistico.
- Rischi: duplicati category, entry con categoria di workspace diverso, dati legacy senza owner certo.
- Acceptance criteria: null workspace zero, mismatch category zero, migration applicata su clone, rollback documentato.
- Comandi di verifica:

```bash
npm run prisma:validate
npx prisma migrate status
psql "$DATABASE_URL" -f scripts/db/preflight-workspace.sql
psql "$DATABASE_URL" -f scripts/db/postflight-workspace.sql
```

### Phase 2 — Workspace isolation & security

- Obiettivo: garantire che ogni lettura/scrittura/export sia membership-scoped.
- Task: repository scoped, audit query senza workspace, integration tests user A/B, cookie tampering tests, export protected, invite hardening tests.
- File da toccare: `src/actions/**`, `src/lib/workspace-context.ts`, `src/features/workspaces/**`, `app/api/exports/ai-analysis/route.ts`, tests integration.
- Dipendenze: Phase 1 completata o dati core sempre workspace-scoped.
- Rischi: regressioni UX se errori accesso non sono gestiti bene.
- Acceptance criteria: non-member non puo leggere/modificare/esportare, cookie manipolato ignorato, tutte le query core passano da helper/repository scoped.
- Comandi di verifica:

```bash
npm run test -- --test-name-pattern workspace
npm run test -- --test-name-pattern export
npm run check
```

### Phase 3 — Entry domain cleanup

- Obiettivo: una sola fonte di verita per soldi, mode, saving context e beneficiari.
- Task: correggere export select, centralizzare parse/calc, eliminare duplicazioni UI/action, aggiungere consistency tests.
- File da toccare: `src/lib/entry-domain.ts`, `src/features/entries/form-money.ts`, `src/actions/entries.ts`, `src/actions/presets.ts`, `src/actions/stats.ts`, `src/actions/reports.ts`, `src/lib/ai-export.ts`, componenti money UI.
- Dipendenze: test domain esistenti estesi prima delle modifiche.
- Rischi: cambiamento KPI percepiti dagli utenti.
- Acceptance criteria: ogni write path usa lo stesso calcolo, export/stats/report concordano su fixture, niente NaN/negative non ammessi.
- Comandi di verifica:

```bash
npm run test -- --test-name-pattern entry
npm run test -- --test-name-pattern export
npm run check
```

### Phase 4 — Legacy removal

- Obiettivo: rimuovere Marian/Martina dal runtime lasciando solo strumenti migration isolati.
- Task: backfill membership/user fields, rimuovere `syncEntryPersonColumns` dalle write path, sostituire `buildPersonWhere`, rimuovere mapping legacy auth, preparare drop columns.
- File da toccare: `src/lib/auth/provisioning.ts`, `src/lib/entry-person-sync.ts`, `src/lib/person-filter.ts`, `src/lib/workspace-member-filter.ts`, `src/actions/entries.ts`, `src/actions/habits.ts`, `src/actions/goals.ts`, `src/actions/presets.ts`, `prisma/schema.prisma`.
- Dipendenze: Phase 1 e Phase 3.
- Rischi: perdita semantica su dati storici Marian/Martina se backfill incompleto.
- Acceptance criteria: runtime non importa helper legacy, feature flags legacy false e non attivabili in prod, dati storici ancora visualizzati tramite membri reali.
- Comandi di verifica:

```bash
grep -RInE "Marian|Martina|legacy-marian|legacy-martina|Person|paidBy|syncEntryPersonColumns|ENABLE_LEGACY" src prisma scripts --exclude-dir=node_modules
npm run check
```

### Phase 5 — Architecture refactor

- Obiettivo: ridurre rischio manutenzione spezzando action e componenti monolitici.
- Task: creare feature folders, estrarre schemas/domain/repositories, lasciare action compatibili, spezzare quick add.
- File da toccare: `src/actions/entries.ts`, `src/actions/habits.ts`, `src/actions/stats.ts`, `src/actions/reports.ts`, `src/actions/presets.ts`, `src/features/**`, `src/components/entries/quick-add-sheet.tsx`.
- Dipendenze: test characterization delle Phase 2 e 3.
- Rischi: refactor ampio con conflitti e regressioni invisibili.
- Acceptance criteria: file action sotto soglia concordata, behavior invariato, test verdi, import graph pulito.
- Comandi di verifica:

```bash
wc -l src/actions/entries.ts src/actions/habits.ts src/actions/stats.ts src/actions/reports.ts src/actions/presets.ts
npm run check
```

### Phase 6 — UI/UX product polish

- Obiettivo: rendere UI coerente, diretta, accessibile e senza duplicati.
- Task: inventory componenti, rinomina `crafted-*`, rimozione componenti dead, copy pass, empty/loading/error states, a11y pass.
- File da toccare: `src/components/**`, `components/**`, `app/**`, `src/lib/ui-person.ts` se ancora presente.
- Dipendenze: dominio entry e legacy removal completati per non cambiare copy due volte.
- Rischi: regressioni visuali mobile.
- Acceptance criteria: nessun componente dead confermato, naming stabile, axe smoke pass, mobile viewport verificati.
- Comandi di verifica:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

### Phase 7 — Production hardening

- Obiettivo: chiudere requisiti prodotto e operativi per utenti reali.
- Task: audit log, rate limiting, backup/restore runbook, privacy export/delete, monitoring alerts, deploy checklist, incident runbook.
- File da toccare: `prisma/schema.prisma`, security libs, actions critiche, export route, docs ops.
- Dipendenze: access control stabile.
- Rischi: complessita operativa e falsi positivi rate limit.
- Acceptance criteria: audit event su mutazioni critiche, rate limit testato, backup restore provato, checklist deploy eseguibile.
- Comandi di verifica:

```bash
npm run check
psql "$DATABASE_URL" -f scripts/db/backup-restore-smoke.sql
```

## 14. Codex implementation prompts

### Prompt 1. Env hygiene e release artifact

- Titolo: Ripulisci env hygiene e release artifact.
- Modello consigliato: GPT-5.3-Codex.
- Effort consigliato: medium.
- Contesto: il repo contiene `.env`, `.env.local`, `.env.merge-source`; `.env.example` e ignorato da `.env*`; serve artefatto pulito.
- Istruzioni: correggi `.gitignore` per tracciare `.env.example`, crea o aggiorna `.dockerignore`, aggiungi script release basato su `git archive`, documenta verifica artefatto.
- File/aree da modificare: `.gitignore`, `.dockerignore`, `package.json`, `.env.example`, docs release.
- Cosa NON fare: non committare segreti, non modificare codice runtime, non installare nuove feature.
- Acceptance criteria: `.env.example` tracciabile, archive senza `.env*`, `.git`, `.idea`, `.agents`, `.claude`, `.next`, `node_modules`.
- Comandi di verifica: `git status --ignored --short .env .env.local .env.merge-source .env.example`; `npm run check`; comando `git archive` con grep denylist.

### Prompt 2. Preflight/postflight migration workspace

- Titolo: Aggiungi safety checks per workspaceId e category scope.
- Modello consigliato: GPT-5.3-Codex.
- Effort consigliato: high.
- Contesto: `Category` e scoped ma `Entry/Habit/Goal/QuickPreset.workspaceId` sono nullable e la migration category richiede verifica su dati reali.
- Istruzioni: creare script SQL preflight/postflight non distruttivi, documentare esecuzione su clone, non alterare schema in questo prompt.
- File/aree da modificare: `scripts/db/**`, docs migration.
- Cosa NON fare: non applicare migration distruttive, non cambiare `schema.prisma`, non fare backfill.
- Acceptance criteria: script riportano null count, duplicate category, mismatch category/workspace, beneficiary membership mismatch.
- Comandi di verifica: `psql "$DATABASE_URL" -f scripts/db/preflight-workspace.sql`; `npm run check`.

### Prompt 3. Rendere workspaceId obbligatorio nei dati core

- Titolo: Migrazione workspaceId obbligatorio per dati core.
- Modello consigliato: GPT-5.3-Codex.
- Effort consigliato: high.
- Contesto: dopo backup e preflight, i dati core devono essere sempre workspace-scoped.
- Istruzioni: implementa backfill sicuro e migration per `Entry`, `Habit`, `Goal`, `QuickPreset`; aggiorna Prisma schema; aggiungi postflight.
- File/aree da modificare: `prisma/schema.prisma`, `prisma/migrations/**`, `scripts/db/**`, eventuali factory/test.
- Cosa NON fare: non rimuovere campi legacy in questo prompt, non cambiare UI, non assumere workspace unico senza preflight.
- Acceptance criteria: null count zero, Prisma validate, migration su clone completata, query mismatch zero.
- Comandi di verifica: `npm run prisma:validate`; `npx prisma migrate status`; `npm run check`.

### Prompt 4. Test integration workspace isolation

- Titolo: Copertura access control multi-workspace.
- Modello consigliato: GPT-5.3-Codex.
- Effort consigliato: high.
- Contesto: gli helper esistono ma manca prova integration user A/B.
- Istruzioni: aggiungi test integration con due utenti, due workspace, membership differente, cookie manipolato, export CSV protetto.
- File/aree da modificare: test integration, `src/lib/workspace-context.ts` solo se serve, action test helpers.
- Cosa NON fare: non refactorare actions, non cambiare schema, non introdurre mock che bypassano Prisma per i casi critici.
- Acceptance criteria: user A non legge/modifica/cancella/esporta workspace B; cookie workspace non autorizza.
- Comandi di verifica: `npm run test -- --test-name-pattern workspace`; `npm run check`.

### Prompt 5. Correzione export AI mode/savingContext

- Titolo: Allinea export AI al dominio Entry.
- Modello consigliato: GPT-5.3-Codex.
- Effort consigliato: low.
- Contesto: `buildAiExpenseExportRow` supporta `mode` e `savingContext`, ma la route export non li seleziona.
- Istruzioni: includi `mode` e `savingContext` in `exportSelect`, aggiungi test CSV che fallisce se i campi non sono persistiti, verifica streaming invariato.
- File/aree da modificare: `app/api/exports/ai-analysis/route.ts`, `src/lib/ai-export.test.ts` o test route.
- Cosa NON fare: non cambiare formato CSV oltre ai campi gia previsti, non modificare auth.
- Acceptance criteria: CSV esporta mode/context persistiti e test copre avoided/spent senza inferenza errata.
- Comandi di verifica: `npm run test -- --test-name-pattern export`; `npm run check`.

### Prompt 6. Entry money single source of truth

- Titolo: Centralizza calcoli money entry.
- Modello consigliato: GPT-5.3-Codex.
- Effort consigliato: high.
- Contesto: dominio centrale esiste ma UI, preset, stats e report duplicano logica.
- Istruzioni: estendi schema validation condiviso, fai usare `calculateEntryMoney` alle write path, rimuovi duplicazioni immediate, aggiungi test consistency.
- File/aree da modificare: `src/lib/entry-domain.ts`, `src/features/entries/form-money.ts`, `src/actions/entries.ts`, `src/actions/presets.ts`, tests.
- Cosa NON fare: non rimuovere legacy Person, non cambiare UI visuale, non cambiare semantica KPI senza test/documentazione.
- Acceptance criteria: nessun write path calcola savedAmount manualmente; casi NaN/negative/zero/null coperti.
- Comandi di verifica: `npm run test -- --test-name-pattern entry`; `npm run check`.

### Prompt 7. Legacy auth bridge production fail-fast

- Titolo: Blocca legacy bridge in production.
- Modello consigliato: GPT-5.3-Codex.
- Effort consigliato: medium.
- Contesto: `ENABLE_LEGACY_AUTH_BRIDGE` e `ENABLE_LEGACY_FALLBACK` non devono influenzare produzione.
- Istruzioni: rendi i flag legacy non attivabili in production o fallisci con errore chiaro all'avvio; aggiungi test provisioning.
- File/aree da modificare: `src/lib/auth/session.ts`, `src/lib/auth/provisioning.ts`, tests auth.
- Cosa NON fare: non rimuovere ancora mapping legacy dati, non cambiare schema.
- Acceptance criteria: in `NODE_ENV=production` i flag legacy non possono abilitare fallback/bridge; test copre scenario.
- Comandi di verifica: `npm run test -- --test-name-pattern legacy`; `npm run check`.

### Prompt 8. Legacy runtime removal from Entry write path

- Titolo: Rimuovi sync legacy dalle write path Entry.
- Modello consigliato: GPT-5.3-Codex.
- Effort consigliato: high.
- Contesto: `syncEntryPersonColumns` mantiene campi `person/paidBy` in create/update.
- Istruzioni: dopo backfill e test, scrivi entry usando user/member fields; lascia eventuale lettura legacy solo in compatibility layer isolato.
- File/aree da modificare: `src/actions/entries.ts`, `src/lib/entry-person-sync.ts`, `src/lib/workspace-member-filter.ts`, tests.
- Cosa NON fare: non droppare colonne DB, non cambiare UI piu del necessario.
- Acceptance criteria: create/update entry non importa `syncEntryPersonColumns`; tests multi-user e legacy fixtures verdi.
- Comandi di verifica: `grep -RIn "syncEntryPersonColumns" src`; `npm run check`.

### Prompt 9. Refactor entries action in feature modules

- Titolo: Spezza `src/actions/entries.ts` senza cambiare comportamento.
- Modello consigliato: GPT-5.3-Codex.
- Effort consigliato: high.
- Contesto: `entries.ts` ha circa 1541 righe e troppe responsabilita.
- Istruzioni: aggiungi characterization tests, estrai serializers/repositories/schemas/domain in `src/features/entries`, mantieni export pubblici compatibili.
- File/aree da modificare: `src/actions/entries.ts`, `src/features/entries/**`, tests.
- Cosa NON fare: non cambiare schema DB, non cambiare UI, non rimuovere legacy in questo prompt.
- Acceptance criteria: action piu sottile, comportamento invariato, test verdi.
- Comandi di verifica: `wc -l src/actions/entries.ts`; `npm run check`.

### Prompt 10. Refactor habits occurrence engine

- Titolo: Isola dominio recurring habits.
- Modello consigliato: GPT-5.3-Codex.
- Effort consigliato: high.
- Contesto: `habits.ts` mischia CRUD, scheduling, occurrence transitions e entry creation.
- Istruzioni: estrai scheduler/status transitions in funzioni pure e repository; aggiungi tests su pending/skipped/completed/old occurrence.
- File/aree da modificare: `src/actions/habits.ts`, `src/features/habits/**`, tests.
- Cosa NON fare: non cambiare UX habit, non toccare entry money salvo interfaccia esistente.
- Acceptance criteria: transizioni coperte da test, action piu sottile, behavior invariato.
- Comandi di verifica: `npm run test -- --test-name-pattern habit`; `npm run check`.

### Prompt 11. Stats/report SQL aggregation pass

- Titolo: Riduci aggregazioni in memoria per stats/report.
- Modello consigliato: GPT-5.3-Codex.
- Effort consigliato: high.
- Contesto: stats e report caricano troppi record e aggregano in JS.
- Istruzioni: identifica KPI principali, sostituisci con aggregate query workspace/date-scoped, aggiungi benchmark fixture o test su dataset sintetico.
- File/aree da modificare: `src/actions/stats.ts`, `src/actions/reports.ts`, repositories stats/report, tests.
- Cosa NON fare: non cambiare definizione KPI senza test di equivalenza, non fare ottimizzazioni premature su tutte le viste.
- Acceptance criteria: risultati equivalenti su fixture, meno record caricati, query scoping preservato.
- Comandi di verifica: `npm run test -- --test-name-pattern stats`; `npm run check`.

### Prompt 12. UI component cleanup inventory

- Titolo: Inventory e cleanup componenti UI duplicati.
- Modello consigliato: GPT-5.3-Codex.
- Effort consigliato: medium.
- Contesto: componenti `crafted-*`, wrapper e componenti vecchi convivono.
- Istruzioni: genera import graph, rimuovi solo componenti certamente non usati, proponi rename plan per `crafted-*`, non fare redesign.
- File/aree da modificare: `src/components/**`, `components/**`, docs UI cleanup.
- Cosa NON fare: non cambiare visual design, non modificare business logic, non rimuovere file con import dinamici non verificati.
- Acceptance criteria: dead components rimossi o documentati, naming plan chiaro, lint/typecheck verdi.
- Comandi di verifica: `npm run lint`; `npm run typecheck`; `npm run build`.

### Prompt 13. Accessibility smoke tests

- Titolo: Aggiungi smoke test accessibilita pagine core.
- Modello consigliato: GPT-5.3-Codex.
- Effort consigliato: medium.
- Contesto: UI mobile-first custom necessita verifica label, focus e contrasto.
- Istruzioni: aggiungi test a11y/Playwright o equivalente su dashboard, entries quick add, stats, reports, habits, workspace settings.
- File/aree da modificare: test e config e2e/a11y, componenti solo per fix minimi.
- Cosa NON fare: non fare redesign, non introdurre snapshot fragili.
- Acceptance criteria: smoke tests passano, focus trap e label principali verificati.
- Comandi di verifica: comando test a11y scelto; `npm run check`.

### Prompt 14. Rate limit e audit log MVP

- Titolo: Hardening rate limit e audit log MVP.
- Modello consigliato: GPT-5.3-Codex.
- Effort consigliato: high.
- Contesto: invite/export/mutazioni critiche non hanno rate limit o audit trail.
- Istruzioni: aggiungi modello audit, helper log evento, rate limit su invite/export, tests.
- File/aree da modificare: `prisma/schema.prisma`, migrations, security libs, invite actions, export route, tests.
- Cosa NON fare: non loggare segreti/token/cookie, non bloccare flussi normali senza messaggi chiari.
- Acceptance criteria: audit event scritto per invite/export/member changes; rate limit testato; dati sensibili redatti.
- Comandi di verifica: `npm run prisma:validate`; `npm run test -- --test-name-pattern audit`; `npm run check`.
