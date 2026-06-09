# Funzionalità mancanti o ridotte — UI crafted (V2)

Documento di riferimento per cinque feature che **esistono a livello dati/backend** ma sono assenti o incomplete nella grafica attuale. Nessuna di queste usa dati mock: quando manca la UI, i numeri non vengono inventati — semplicemente non vengono mostrati.

**Contesto:** con il refactor V2 (`crafted-*`) la pagina Statistiche e la lista Movimenti sono state ridisegnate attorno ai **risparmi**. Parte della vista sulle **spese reali** e alcune azioni (elimina movimento) non sono state riportate nel nuovo stile.

---

## 1. Heatmap spese giornaliere

### Cosa fa

Mostra **quando** spendi, non solo quanto a livello mensile. È una griglia stile calendario (due righe: mese corrente e mese precedente) dove ogni cella è un giorno e l’intensità del colore riflette la **spesa reale** (`realCost`) di quel giorno.

L’utente può:

- vedere i giorni “attivi” vs vuoti nel mese in corso;
- confrontare lo stesso giorno del calendario tra mese corrente e precedente (es. 7 mag €27 vs 7 giu €30 → delta +€3);
- capire pattern (weekend, metà mese, picchi isolati);
- leggere un riepilogo cumulato mese-su-mese fino a oggi (`monthToDateDelta`).

La metrica è sempre **speso davvero**, non risparmiato. Timezone: `Europe/Rome`.

### Stato attuale

| Livello | Stato |
|---------|--------|
| Logica aggregazione | ✅ `src/lib/daily-spending-comparison.ts` + test |
| Server / fetch | ✅ `getStatsPageData()` in `src/actions/stats.ts` restituisce `dailySpendingComparison` |
| Pagina stats | ✅ `app/stats/page.tsx` carica i dati |
| Componente UI | ❌ `daily-spending-heatmap.tsx` rimosso nel refactor V2 |
| Uso parziale | ⚠️ Solo il conteggio **“Giorni attivi”** in `crafted-stats.tsx` (`getActiveDays`) |

### Cosa manca

- Ricreare (o ripristinare adattando allo stile crafted) il componente `DailySpendingHeatmap`.
- Integrarlo in `src/components/stats/crafted-stats.tsx` o subito sotto l’hero / prima del `StatTrio`.
- Eventuale skeleton in loading stats.

### File coinvolti

| File | Ruolo |
|------|--------|
| `src/lib/daily-spending-comparison.ts` | Modello `DailySpendingComparison`, celle giorno, `maxDailySpent`, delta |
| `src/actions/stats.ts` | Wiring in `getStatsPageData` |
| `app/stats/page.tsx` | Passa `dailySpendingComparison` a `CraftedStats` |
| `src/components/stats/crafted-stats.tsx` | Oggi usa solo `getActiveDays()` |
| `.agents/skills/.../daily-spending-heatmap.md` | Spec dettagliata + prompt implementazione |
| `git show 5a2a1e9:src/components/stats/daily-spending-heatmap.tsx` | Implementazione precedente da adattare |

### Riferimento storico

Commit `5a2a1e9` (“Heatmap mensile”): componente completo con griglia 31 colonne, tooltip, confronto mese precedente. Rimosso in V2 crafted.

---

## 2. Elimina movimento

### Cosa fa

Permette di **cancellare un movimento** registrato per errore (doppio inserimento, importo sbagliato, test). Dopo l’eliminazione:

- il record sparisce da lista, dashboard, stats e report;
- se il movimento era legato a un’**occorrenza abitudine**, l’occorrenza torna `skipped` (non “completata”);
- le pagine interessate vengono rivalidate (`/`, `/entries`, `/stats`, `/habits`, `/goals`, `/reports/monthly`).

È un’azione distruttiva: in passato c’era conferma implicita tramite bottone dedicato nella card espansa.

### Stato attuale

| Livello | Stato |
|---------|--------|
| Server action | ✅ `deleteEntry(entryId)` in `src/actions/entries.ts` |
| Permessi / workspace | ✅ `requireWorkspaceAccessForRecord` |
| Abitudini collegate | ✅ transazione entry + `habitOccurrence.status = skipped` |
| UI lista movimenti | ❌ `crafted-entry-list.tsx` → solo riga + link modifica |
| UI modifica movimento | ❌ `crafted-entry-edit-form.tsx` → solo salva, nessun elimina |
| Altre entità | ✅ preset, obiettivi, abitudini hanno ancora “Elimina” |

### Cosa manca

- Bottone **Elimina** in almeno uno di:
  - `crafted-entry-edit-form.tsx` (zona pericolosa in fondo al form), oppure
  - `crafted-entry-row.tsx` / menu contestuale in lista;
- Dialog di conferma (come per abitudini in `crafted-habit-card.tsx`);
- Stato loading + messaggio errore/successo;
- `router.refresh()` o rimozione ottimistica dalla lista dopo successo.

### File coinvolti

| File | Ruolo |
|------|--------|
| `src/actions/entries.ts` | `deleteEntry` — già pronta |
| `src/components/entries/crafted-entry-edit-form.tsx` | Candidato principale per il bottone |
| `src/components/entries/crafted-entry-list.tsx` | Alternativa: azione dalla lista |
| `git show 64f5702:src/components/entries/entry-card.tsx` | Vecchia UX: elimina nella card espansa |

---

## 3. Overview spese in Statistiche

### Cosa fa

Riassume il periodo (tutto lo storico del workspace, filtrato per persona se attivo) con **quattro dimensioni** del comportamento economico:

| Metrica | Significato |
|---------|-------------|
| **Speso davvero** (`totalRealSpent`) | Somma di `realCost` — quanto è uscito dal portafoglio |
| **Avresti speso** (`totalAlternativeCost`) | Somma di `alternativeCost` — quanto sarebbe costato la scelta “default” |
| **Tenuto in tasca** (`totalSaved`) | Differenza aggregata — quanto hai evitato di spendere |
| **Efficienza** (`savingRatePercent`) | Rapporto risparmio / avresti speso |
| **Media per scelta** (`averageSavedPerEntry`) | Risparmio medio per movimento |

Aiuta a bilanciare la narrativa “ho risparmiato X” con “ho comunque speso Y”: utile per chi traccia sia la disciplina sia l’uscita reale di denaro.

### Stato attuale

| Livello | Stato |
|---------|--------|
| Calcolo | ✅ in `getStatsPageData()` → `overview: StatsOverview` |
| Tipo | ✅ `src/lib/stats-overview.ts` |
| UI crafted stats | ⚠️ Solo **risparmi**: hero “Tenuti a …”, grafico 12 mesi su `totalSaved`, categorie su `saved` |
| `overview.totalRealSpent` / `totalAlternativeCost` | ❌ non mostrati in `crafted-stats.tsx` |
| Report mensile | ✅ overview spese ancora visibile in `monthly-overview-cards.tsx` / report dedicato |

Il tab **Mese / Anno / Sempre** filtra solo l’hero risparmi (`getPeriodHero` in `crafted-stats-build.ts`), non le card spesa.

### Cosa manca

- Sezione overview nello stile crafted (es. `StatTrio` esteso o seconda riga di KPI) con almeno:
  - Speso davvero
  - Avresti speso  
  - Tenuto in tasca (già in hero, ma senza confronto spesa)
  - opzionale: efficienza % e media per scelta
- Allineamento al tab periodo: per “Mese” usare `monthlyStats` ultimo mese (`totalRealSpent`, `totalAlternativeCost`), per “Anno”/“Sempre” aggregare da `overview` o `monthlyStats`.

### File coinvolti

| File | Ruolo |
|------|--------|
| `src/actions/stats.ts` | Popola `overview` e `monthlyStats[].totalRealSpent` |
| `src/lib/stats-overview.ts` | Tipo dati |
| `src/lib/crafted-stats-build.ts` | `getPeriodHero` — oggi solo `totalSaved` |
| `src/components/stats/crafted-stats.tsx` | Dove aggiungere la UI |
| `git show 64f5702:src/components/stats/stats-overview-cards.tsx` | Vecchie card “Speso davvero”, “Avresti speso”, ecc. |

---

## 4. Top risparmi (“Le scelte più forti”)

### Cosa fa

Elenco dei **singoli movimenti** con il maggior `savedAmount` nel periodo filtrato. Per ogni voce mostra titolo, categoria, data, speso vs avresti speso e risparmio.

Serve a:

- celebrare le decisioni migliori (motivazione);
- ritrovare rapidamente *quali* acquisti hanno fatto la differenza, non solo *quanto* per categoria;
- distinguere un grande risparmio una tantum da tanti piccoli nella stessa categoria.

### Stato attuale

| Livello | Stato |
|---------|--------|
| Calcolo in page load | ✅ `getStatsPageData()` → `topSavings` (max 10, ordinati per `savedAmount` desc) |
| API dedicata | ✅ `getTopSavings(memberUserId?, limit?)` esportata da `stats.ts` |
| Passaggio a UI | ❌ `app/stats/page.tsx` **non** passa `topSavings` a `CraftedStats` |
| UI | ❌ `top-savings-list.tsx` rimosso |

Struttura di ogni item:

```typescript
{
  id, title, categoryName, date,
  realCost, alternativeCost, savedAmount,
  source: "manual" | "habit"
}
```

### Cosa manca

- Passare `topSavings` da `app/stats/page.tsx` a `CraftedStats` (o componente figlio).
- Nuova sezione crafted, es. “Le scelte più forti”, con link opzionale al movimento (`/entries/[id]/edit`).
- Empty state se nessun risparmio positivo.
- Rispettare filtro persona (già applicato nel fetch server).

### File coinvolti

| File | Ruolo |
|------|--------|
| `src/actions/stats.ts` | `topSavings` in `StatsPageData`, loop in `buildEntryStats` |
| `app/stats/page.tsx` | Oggi non estrae `stats.topSavings` |
| `src/components/stats/crafted-stats.tsx` | Destinazione UI |
| `git show 64f5702:src/components/stats/top-savings-list.tsx` | Layout precedente |

---

## 5. Header giorno in Movimenti — mostrare anche “spesi”

### Cosa fa

Nella lista `/entries`, i movimenti sono raggruppati per giorno (Oggi, Ieri, mar 3 giu, …). L’**header di ogni giorno** riassume quel gruppo prima delle singole righe.

**Prima (pre-crafted):** l’header mostrava il totale **speso davvero** del giorno (`totalRealSpent`) insieme al conteggio movimenti, es. *“Oggi · 3 giu — 2 movimenti — €24,00”* (importo = somma `realCost`).

**Ora (crafted):** l’header mostra solo il **risparmio** del giorno in verde, es. *“+12€”* (`totalSaved` = somma `savedAmount`). Le spese reali restano visibili solo aprendo ogni riga (`crafted-entry-row`).

### Perché conta

Dopo il cambio UX “un solo importo principale = quanto hai speso”, la lista movimenti è il posto naturale dove **riconciliare uscita di cassa giornaliera**. Senza il totale speso nell’header, chi guarda la lista per capire “quanto ho messo oggi” deve sommare mentalmente le righe.

### Stato attuale

| Livello | Stato |
|---------|--------|
| Dati in lista | ✅ ogni `EntryItem` ha `realCost` e `savedAmount` |
| Raggruppamento | ✅ `groupEntries()` in `crafted-entry-list.tsx` |
| Aggregato giorno | ⚠️ solo `totalSaved`, manca `totalRealSpent` |
| Footer mese precedente | ⚠️ solo `totalSaved` in `previousMonthSummary` |

### Cosa manca

- Estendere `DayGroup` con `totalRealSpent` (somma `realCost` nel loop di `groupEntries`).
- Aggiornare l’header (righe ~394–398 di `crafted-entry-list.tsx`), es.:
  - **Opzione A:** due valori — speso a destra/sinistra, risparmio in accent;
  - **Opzione B:** una riga compatta — `€24 spesi · +€12 tenuti`;
  - **Opzione C:** ripristinare stile vecchio con conteggio movimenti.
- Valutare lo stesso per il riepilogo `previousMonthSummary` (oggi calcolato server-side — verificare se include anche `totalRealSpent`).

### File coinvolti

| File | Ruolo |
|------|--------|
| `src/components/entries/crafted-entry-list.tsx` | `DayGroup`, `groupEntries`, rendering header |
| `src/components/entries/crafted-entry-row.tsx` | Già mostra importi per singola riga |
| `git show 64f5702:src/components/entries/entry-list.tsx` | Header con `totalRealSpent` |

---

## Riepilogo priorità

| # | Feature | Backend | UI | Impatto utente |
|---|---------|---------|-----|----------------|
| 1 | Heatmap spese | Pronto | Assente | Alto — vista temporale unica |
| 2 | Elimina movimento | Pronto | Assente | Alto — correzione errori |
| 3 | Overview spese stats | Pronto | Parziale | Medio — contesto spesa vs risparmio |
| 4 | Top risparmi | Pronto, non passato | Assente | Medio — motivazione / ritrovabilità |
| 5 | Header giorno spesi | Dati in client | Parziale | Medio — lettura giornaliera lista |

---

## Note

- **Nessun mock** in queste aree: se la UI non c’è, i dati non compaiono; non vengono sostituiti da numeri finti.
- **Filtro persona** su `/stats` si applica già al fetch; le nuove sezioni stats devono riusare gli stessi dati già filtrati.
- **Stile:** nuove UI vanno allineate a `components/crafted` (`Label`, `Mono`, `Serif`, `Rule`, `StatTrio`) come il resto della V2.
- **Documento generato:** giugno 2026, branch post-refactor crafted (`master`).
