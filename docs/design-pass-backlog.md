# Design pass (fase 20) — backlog

Input per il passaggio di design. La parte oggettiva (accessibilità WCAG AA) è
già stata sistemata il 2026-07-05: da 361 nodi in violazione a 0 su tutte le
14 pagine, con guard permanente in `e2e/a11y.spec.ts`. Qui resta la parte di
giudizio visivo/di prodotto.

## Fatto (baseline oggettiva)

- `--ink-3` (testo terziario) portato da `#7a7368` a `#8c8478` nei temi scuri:
  era la causa di ~340 violazioni di contrasto. Stessa tonalità calda, ratio
  ≥ 4.5:1 su tutti e tre gli sfondi (`#0e0d0b`, `#1b1815`, `#221d13`).
- `--destructive` da `#c75a4a` a `#c85d4d` e bottoni testuali "Elimina" a
  piena opacità (prima `/70`–`/80`, ratio fino a 2.8).
- `ProgressLine`: decorativa (`aria-hidden`) di default, `label` opzionale per
  esporla come progressbar; prima era `role="progressbar"` senza nome.
- Regioni scrollabili (checkbox categorie budget, selettore categorie report)
  raggiungibili da tastiera (`tabIndex` + `role`/`aria-label`).

## Da decidere nel design pass

1. **Gerarchia dei toni ridotta**: con ink-3 più chiaro, la distanza visiva
   tra testo secondario (`--muted-text #b8b0a2`) e terziario si è ridotta.
   Valutare se ricalibrare la scala dei grigi caldi nel suo insieme.
2. **Iniziali mesi del grafico stats**: i mesi inattivi usano `text-ink-3`
   pieno; se si vuole più fade servono varianti che restino ≥ 4.5:1 o un
   trattamento `aria-hidden` + label alternativa.
3. **Stringhe hardcoded nelle pagine crafted** (residuo fase 8c): i CONTENUTI
   server (budget-alerts, insight stats, recap report) sono tradotti; restano
   le label componente sparse nelle pagine crafted non-goals ("In coda",
   "Prossimo pagamento", "Filtri", "Persona", "Periodo", "rispetto al mese
   scorso:" nel report detail, etichette mesi del picker stats
   getStatsMonthLabel it-IT, hero di /more, ecc.).
4. **Input importi nei form entry**: la mask forza la virgola
   (`entry-form-money.ts`) — per l'inglese serve il separatore per locale.
5. **Chevron/affordance**: righe che sembrano cliccabili ma non lo sono state
   ripulite su goals; verificare lo stesso pattern su altre liste.
6. **Screenshot di riferimento**: rigenerabili con lo scanner axe (vedi
   `e2e/a11y.spec.ts` per il setup di autenticazione e viewport 390×844).

## Vincoli noti

- CSP con `unsafe-inline` finché Next non supporta nonce + PPR (motivazione
  in `next.config.ts`).
- Il tema scuro è il default di prodotto; il tema chiaro ha già ink-3
  conforme (`#756d62`, ratio ≥ 4.5 sui fondi chiari).
