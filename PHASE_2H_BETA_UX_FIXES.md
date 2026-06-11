# Phase 2H - Beta UX fixes

## Problemi risolti

### 1. Workspace switcher

Prima:
- Il feedback poteva dipendere troppo dal submit della form e dal refresh route.
- In alcuni tap/click il dialog si chiudeva ma il loader non diventava visibile abbastanza presto.
- L'utente poteva non capire se il click fosse stato preso.

Dopo:
- Il pending visuale parte gia al click sulla voce workspace, prima della server action.
- Una ref interna evita doppi submit e stati concorrenti.
- L'opzione cliccata resta identificata con `aria-busy`, spinner e testo `Cambio spazio...`.
- Il trigger nello shell mostra stato pending anche durante `router.replace()` / `router.refresh()`.
- In caso di errore viene mostrato un messaggio inline non invasivo e lo stato pending viene chiuso.

### 2. Bottom nav mobile

Prima:
- La superficie percepita della voce sembrava una card, ma il tap risultava affidabile solo sul testo.

Dopo:
- Ogni voce e un `Link` semanticamente corretto con area esplicita `h-14`, `flex-1` e `basis-0`.
- Lo span interno non intercetta pointer event, quindi l'anchor resta il target unico.
- Active state, `aria-current`, haptic e `focus-visible` sono mantenuti.
- Non ci sono link annidati in button o button annidati in link.

### 3. Stats heatmap

Prima:
- La heatmap era poco leggibile e il dettaglio era presentato come pannello sotto la griglia.
- I quadratini erano troppo piccoli per tap comodi su mobile.
- La mappa era legata al mese corrente, senza poter scegliere un mese diverso.

Dopo:
- Resta una sola heatmap del mese selezionato.
- Ogni quadratino rappresenta un giorno reale del mese selezionato.
- La griglia usa quadratini piu grandi e una larghezza minima mobile per mantenere leggibilita.
- Hover/focus/tap aprono un tooltip compatto vicino al quadratino selezionato.
- Il popover e `fixed`, quindi non viene tagliato dal contenitore scrollabile.
- Il tooltip mostra data corrente, speso davvero, dato del giorno corrispondente del mese precedente, differenza assoluta, differenza percentuale se calcolabile e messaggi espliciti per giorno mancante, assenza dati o giorno futuro.
- Clic fuori o `Escape` chiudono il popover.

### 4. Eliminazione obiettivi completati

Prima:
- Gli obiettivi in sezione `Raggiunte` non esponevano alcuna azione.
- Gli obiettivi attivi/in pausa erano eliminabili, quelli completati no.

Dopo:
- Ogni obiettivo completato mostra l'azione `Elimina`.
- Viene riusata la server action esistente `deleteGoal`.
- La conferma distruttiva esistente rimane invariata.
- Non viene mostrata l'azione `Riattiva` sugli obiettivi completati, per evitare un comportamento ambiguo.

### 5. Filtro periodo stats

Prima:
- I tab `Mese`, `Anno`, `Sempre` erano stato locale del componente.
- Il tab `Mese` mostrava solo il mese considerato corrente/latest e non permetteva di scegliere un mese storico.
- Refresh, cambio persona o link diretto non preservavano il periodo selezionato.

Dopo:
- `/stats` legge `period` e `month` dai query param.
- Il default resta il mese corrente.
- Il selettore mese permette di switchare mese/anno disponibili, includendo sempre il mese corrente anche se senza movimenti.
- `Mese`, `Anno` e `Sempre` aggiornano i dati server-rendered senza cambiare backend/API pubbliche.
- Il filtro persona preserva `period` e `month`.
- Overview, categorie, top savings e insight vengono derivati dal periodo selezionato; il grafico mensile resta storico per contesto.

## File modificati

- `app/stats/page.tsx`
- `src/actions/stats.ts`
- `src/components/layout/workspace-switcher.tsx`
- `src/components/layout/crafted-bottom-bar.tsx`
- `src/components/stats/crafted-stats.tsx`
- `src/components/stats/crafted-stats-period-filter.tsx`
- `src/components/stats/crafted-person-filter.tsx`
- `src/components/stats/crafted-daily-spending-heatmap.tsx`
- `src/components/goals/crafted-goals.tsx`
- `src/lib/crafted-stats-build.ts`
- `src/lib/daily-spending-comparison.ts`
- `src/lib/daily-spending-comparison.test.ts`
- `src/lib/stats-period.ts`
- `PHASE_2H_BETA_UX_FIXES.md`

## Note edge case

- Workspace switcher: se viene tentato un secondo cambio mentre uno e in corso, viene ignorato salvo sia la stessa voce gia pending.
- Workspace switcher: se la server action fallisce, lo stato pending viene chiuso e resta un messaggio inline.
- Heatmap: se il giorno corrispondente del mese precedente non esiste, per esempio 31 marzo vs febbraio, il popover lo dice esplicitamente.
- Heatmap: se il giorno precedente esiste ma non ha movimenti, il popover mostra `Nessun dato` e non calcola differenza/percentuale.
- Heatmap: i giorni futuri sono attenuati e il popover segnala che il totale non e consolidato.
- Heatmap: per un mese storico il confronto progressivo diventa confronto totale mese vs mese precedente.
- Filtro stats: `Anno` usa l'anno del mese selezionato; per vedere un altro anno si seleziona prima un mese di quell'anno e poi `Anno`.
- Filtro stats: `Sempre` ignora il mese per i totali, mentre il mese resta disponibile come riferimento quando si torna a `Mese`.
- Filtro stats: se il mese selezionato non ha dati ma esistono dati in altri mesi, la pagina mostra statistiche a zero invece di andare nello stato vuoto globale.
- Goals: l'eliminazione dei completati usa lo stesso percorso autorizzativo degli altri goal.

## Comandi eseguiti

Ricerca e lettura:
- `git status --short`
- `sed -n ... .agents/skills/non-lho-comprato-ui-builder/SKILL.md`
- `sed -n ... .agents/skills/non-lho-comprato-stats-builder/SKILL.md`
- `sed -n ... .agents/skills/non-lho-comprato-backend-logic-builder/SKILL.md`
- `sed -n ... src/components/layout/workspace-switcher.tsx`
- `sed -n ... src/components/layout/crafted-bottom-bar.tsx`
- `sed -n ... src/components/stats/crafted-daily-spending-heatmap.tsx`
- `sed -n ... src/components/goals/crafted-goals.tsx`
- `sed -n ... src/actions/goals.ts`
- `sed -n ... src/lib/crafted-goals-build.ts`
- `sed -n ... app/stats/page.tsx`
- `sed -n ... src/actions/stats.ts`
- `sed -n ... src/components/stats/crafted-stats.tsx`
- `sed -n ... src/lib/daily-spending-comparison.ts`
- `sed -n ... src/lib/crafted-stats-build.ts`
- `sed -n ... node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`
- `sed -n ... node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`
- `sed -n ... node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md`
- `git diff --check`
- `git diff --cached --check`
- `git diff -- ...`

Validazione:
- `npm run prisma:validate` - passa
- `npm run lint` - passa
- `npm run typecheck` - passa
- `npm run test` - passa, 74/74
- `npm run build` - passa

## Limiti rimasti

- Nessun cambio DB/schema/migration/env/Supabase/Vercel/production config.
- Il controllo manuale mobile reale resta consigliato per valutare feeling del tooltip heatmap, selettore mese e gesture target della bottom nav su device fisico.
