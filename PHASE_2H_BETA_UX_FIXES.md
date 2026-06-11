# Phase 2H - Beta UX fixes

## Problemi risolti

### 1. Workspace switcher

Prima:
- Il loader dipendeva da `useTransition` e poteva non comparire in modo affidabile subito dopo il tap/click.
- Il dialog veniva chiuso durante il cambio, ma il feedback poteva sparire troppo presto o non partire.
- Un secondo click poteva essere tentato mentre il cambio era gia in corso.

Dopo:
- Lo stato visuale di cambio parte immediatamente impostando `switchingWorkspaceId` prima della server action.
- Il trigger e le opzioni sono disabilitati durante il cambio.
- L'opzione cliccata mostra `aria-busy` e spinner.
- L'overlay/loader globale continua a essere pilotato dagli eventi `nlc:workspace-switch-start/end`.
- L'evento di fine viene emesso quando il workspace corrente aggiornato corrisponde a quello richiesto, non subito dopo `router.refresh()`.
- In caso di fallimento della server action o eccezione, viene mostrato un messaggio inline non invasivo.

### 2. Bottom nav mobile

Prima:
- Il `Link` della voce occupava sostanzialmente solo il testo.
- Il tap sull'area visiva della voce poteva non navigare.

Dopo:
- Ogni voce e un `Link` che occupa tutta la propria area flessibile.
- Target minimo aumentato con `min-h-12`, padding e `touch-manipulation`.
- Active state mantenuto con `aria-current="page"`.
- Focus state mantenuto con `focus-visible:ring`.
- Nessun nesting invalido tra link/button.

### 3. Stats heatmap

Prima:
- La heatmap mostrava due righe mensili.
- Le celle erano molto piccole.
- Il dettaglio era basato su `title`, quindi poco affidabile su mobile/touch.

Dopo:
- La heatmap e una sola griglia del mese corrente.
- Ogni quadrato rappresenta un giorno reale del mese corrente.
- Le celle sono piu grandi, in una griglia mobile-first a 7 colonne.
- Hover, focus e tap selezionano un giorno e mostrano un pannello dati accessibile.
- Il pannello mostra data corrente, speso davvero, dato del mese precedente se disponibile, differenza assoluta, differenza percentuale quando calcolabile e messaggi espliciti per assenza dati o giorno inesistente.
- I giorni futuri sono resi piu neutri e il pannello evita confronti fuorvianti.

## File modificati

- `src/components/layout/workspace-switcher.tsx`
- `src/components/layout/crafted-bottom-bar.tsx`
- `src/components/stats/crafted-daily-spending-heatmap.tsx`
- `PHASE_2H_BETA_UX_FIXES.md`

## Note edge case

- Se il giorno corrispondente del mese precedente non esiste, per esempio 31 marzo vs febbraio, il pannello indica esplicitamente che il giorno non esiste.
- Se il giorno precedente esiste ma non ha movimenti, il pannello mostra `Nessun dato` e non calcola differenza/percentuale.
- Se il giorno corrente e futuro, la cella resta consultabile ma visualmente attenuata; il pannello segnala che il totale non e ancora consolidato.
- Se il mese precedente non ha alcun dato, il componente calcola comunque la data corrispondente lato client e mostra un messaggio coerente di assenza dati.
- La documentazione locale Next richiesta da `AGENTS.md` non era leggibile perche `node_modules/next/dist/docs` e `node_modules/next` non sono presenti in questa working copy. Non sono state introdotte nuove API Next.

## Comandi eseguiti

Ricerca e lettura:
- `git status --short`
- `find node_modules/next/dist/docs -maxdepth 3 -type f`
- `find src -type f ... | grep ...`
- `grep -RInE "workspace|Workspace|bottom|Bottom|nav|Nav|heatmap|Heatmap|stats|Stats" ...`
- `sed -n ... src/components/layout/workspace-switcher.tsx`
- `sed -n ... src/components/layout/crafted-bottom-bar.tsx`
- `sed -n ... src/components/layout/mobile-tab-bar.tsx`
- `sed -n ... src/components/stats/crafted-stats.tsx`
- `sed -n ... src/components/stats/crafted-daily-spending-heatmap.tsx`
- `sed -n ... src/lib/daily-spending-comparison.ts`
- `sed -n ... app/stats/page.tsx`
- `sed -n ... src/actions/stats.ts`
- `sed -n ... src/lib/daily-spending-comparison.test.ts`
- `cat package.json`
- `cat tsconfig.json`
- `git diff -- src/components/layout/workspace-switcher.tsx src/components/layout/crafted-bottom-bar.tsx src/components/stats/crafted-daily-spending-heatmap.tsx`
- `git diff --stat`
- `git diff --check`

Validazione richiesta:
- `npm run prisma:validate` - non eseguito realmente: `prisma: command not found`
- `npm run lint` - non eseguito realmente: `eslint: command not found`
- `npm run typecheck` - non eseguito realmente: `tsc: command not found`
- `npm run test` - non eseguito realmente: `tsx: command not found`
- `npm run build` - non eseguito realmente: `next: command not found`

## Limiti rimasti

- Le validazioni npm non possono essere confermate in questa working copy per assenza dei binari locali in `node_modules/.bin`.
- Non ho eseguito `npm install` perche non era tra i comandi consentiti della fase.
- Non sono state fatte modifiche a DB, Prisma schema, migration, env, Supabase, Vercel o configurazione di produzione.
