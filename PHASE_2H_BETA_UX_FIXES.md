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

Dopo:
- Resta una sola heatmap del mese corrente.
- Ogni quadratino rappresenta un giorno reale del mese corrente.
- La griglia usa quadratini piu grandi e una larghezza minima mobile per mantenere leggibilita.
- Hover/focus/tap aprono un popover contestuale vicino al quadratino selezionato.
- Il popover e `fixed`, quindi non viene tagliato dal contenitore scrollabile.
- Il popover mostra data corrente, speso davvero, dato del giorno corrispondente del mese precedente, differenza assoluta, differenza percentuale se calcolabile e messaggi espliciti per giorno mancante, assenza dati o giorno futuro.
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

## File modificati

- `src/components/layout/workspace-switcher.tsx`
- `src/components/layout/crafted-bottom-bar.tsx`
- `src/components/stats/crafted-daily-spending-heatmap.tsx`
- `src/components/goals/crafted-goals.tsx`
- `PHASE_2H_BETA_UX_FIXES.md`

## Note edge case

- Workspace switcher: se viene tentato un secondo cambio mentre uno e in corso, viene ignorato salvo sia la stessa voce gia pending.
- Workspace switcher: se la server action fallisce, lo stato pending viene chiuso e resta un messaggio inline.
- Heatmap: se il giorno corrispondente del mese precedente non esiste, per esempio 31 marzo vs febbraio, il popover lo dice esplicitamente.
- Heatmap: se il giorno precedente esiste ma non ha movimenti, il popover mostra `Nessun dato` e non calcola differenza/percentuale.
- Heatmap: i giorni futuri sono attenuati e il popover segnala che il totale non e consolidato.
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
- `git diff --check`
- `git diff -- ...`

Validazione:
- `npm run prisma:validate` - passa
- `npm run lint` - passa
- `npm run typecheck` - passa
- `npm run test` - passa, 73/73
- `npm run build` - passa

## Limiti rimasti

- Nessun cambio DB/schema/migration/env/Supabase/Vercel/production config.
- Il controllo manuale mobile reale resta consigliato per valutare feeling del popover heatmap e del gesture target della bottom nav su device fisico.
