# Heatmap giornaliera spesa — documentazione e prompt di implementazione

Feature per la pagina `/stats`: griglia stile GitHub (quadretti) con spesa reale giornaliera del **mese corrente** e del **mese precedente**, più confronto giorno-per-giorno.

Esempio atteso: il 7 maggio ho speso €27, il 7 giugno €30 → tooltip e riepilogo mostrano `+€3,00`.

---

## Contesto prodotto

L’utente vuole capire **quando** spende, non solo **quanto** a livello mensile. La heatmap complementa `MonthlySavingsChart` (ultimi 12 mesi) con una vista “adesso”: pattern giornalieri e confronto immediato col mese scorso.

### Decisioni già prese

| Aspetto | Scelta |
|---|---|
| Metrica | `realCost` aggregato per giorno (spesa reale) |
| Timezone | `Europe/Rome` via `getRomeDateKey` |
| Mese di riferimento | Mese calendario corrente a Roma |
| Mese precedente | Mese calendario immediatamente precedente; mostrare la riga solo se esiste almeno un movimento in uno dei due mesi |
| Allineamento | Colonna N = giorno N (7 mag sotto 7 giu) |
| Giorni futuri | Celle disabilitate/vuote nel mese corrente |
| Filtro persona | Rispetta `PersonFilter` già presente in stats |
| Testo UI | Italiano |
| Fetch dati | Server-side; nessun fetch nel client |

### File coinvolti (target)

| File | Ruolo |
|---|---|
| `src/lib/daily-spending-comparison.ts` | Logica pura di aggregazione |
| `src/lib/daily-spending-comparison.test.ts` | Unit test |
| `src/actions/stats.ts` | Wiring in `getStatsPageData` |
| `src/components/stats/daily-spending-heatmap.tsx` | Componente UI |
| `app/stats/page.tsx` | Integrazione pagina |
| `app/stats/loading.tsx` | Skeleton loading |

### Riferimenti nel codebase

- Aggregazione per giorno (streak): `src/actions/streaks.ts` + `getRomeDateKey`
- Grouping giornaliero UI: `src/components/entries/entry-list.tsx`
- Stile card grafici stats: `src/components/stats/monthly-savings-chart.tsx`
- Tooltip Recharts/shadcn: `src/components/stats/category-savings-chart-desktop.tsx`
- Pagina stats: `app/stats/page.tsx`
- Skill stats: `.agents/skills/non-lho-comprato-stats-builder/SKILL.md`

---

## Modello dati

```typescript
type DailySpendingCell = {
  day: number;              // 1–31
  dateKey: string | null;   // "2026-06-07" o null se il giorno non esiste nel mese
  totalRealSpent: number;
  entriesCount: number;
  isFuture: boolean;
  isToday: boolean;
};

type DailySpendingMonthRow = {
  monthKey: string;         // "2026-06"
  label: string;            // "Giu 2026"
  days: DailySpendingCell[];
  totalRealSpent: number;
};

type DailySpendingComparison = {
  currentMonth: DailySpendingMonthRow;
  previousMonth: DailySpendingMonthRow | null;
  maxDailySpent: number;    // scala colori su entrambi i mesi
  monthToDateDelta: number | null; // cumulato fino a oggi vs stesso giorno mese scorso
};
```

Per ogni cella del mese corrente con `dateKey` valido:

```typescript
deltaVsPreviousDay = currentSpent - (previousSpent ?? 0)
```

---

## Prompt 1 — Logica pura di aggregazione

**Skill da usare:** `non-lho-comprato-backend-logic-builder` + `non-lho-comprato-stats-builder`

**Obiettivo:** creare la funzione pura che trasforma le entry in `DailySpendingComparison`.

### Prompt

```
Implementa la logica pura per la heatmap giornaliera spesa in Non l'ho comprato.

Crea `src/lib/daily-spending-comparison.ts` con:

1. Tipi esportati:
   - `DailySpendingCell`
   - `DailySpendingMonthRow`
   - `DailySpendingComparison`
   - `DailySpendingEntry` (input minimo: `{ date: Date; realCost: unknown }`)

2. Funzione principale esportata:
   `buildDailySpendingComparison(
     entries: readonly DailySpendingEntry[],
     now?: Date
   ): DailySpendingComparison`

Requisiti funzionali:
- Usa `getRomeDateKey` da `src/lib/rome-dates.ts` per raggruppare per giorno.
- Somma `realCost` per giorno (gestisci Decimal/string/number come in stats.ts con helper locale o riuso pattern esistente).
- Arrotonda a 2 decimali.
- Il mese corrente è il mese calendario di `now` in timezone Roma.
- Il mese precedente è il mese calendario immediatamente precedente.
- Costruisci un array `days` per ogni mese con tutti i giorni del mese (28–31).
- Per giorni che non esistono in un mese (es. 31 febbraio): `dateKey: null`, spesa 0, non future.
- `isToday`: true se `dateKey === getRomeDateKey(now)`.
- `isFuture`: true solo nel mese corrente, se `dateKey > getRomeDateKey(now)`.
- `maxDailySpent`: massimo tra tutte le celle con spesa > 0 dei due mesi; minimo 1 se tutto zero.
- `monthToDateDelta`: somma spesa mese corrente da giorno 1 fino a oggi incluso, meno stessa somma nel mese precedente fino allo stesso giorno del mese; null se `previousMonth` non esiste o oggi non ha `dateKey` valido.
- `previousMonth`: null se non ci sono movimenti nel mese precedente; altrimenti riga completa (anche giorni a zero).
- Label mese in italiano, stile coerente con stats (`Giu 2026`, prima lettera maiuscola, no punto dopo mese breve).

Non usare Prisma. Non fare fetch. Funzione pura e testabile.

Crea anche `src/lib/daily-spending-comparison.test.ts` con almeno questi casi:
1. Due entry nello stesso giorno → somma corretta.
2. Entry a maggio e giugno → confronto giorno 7 corretto.
3. Giorno futuro nel mese corrente → `isFuture: true`, spesa 0.
4. Febbraio vs mese da 31 giorni → colonna 31 assente in febbraio (`dateKey: null`).
5. Nessuna entry → struttura valida con zeri, `previousMonth: null`.
6. Solo entry mese precedente → `previousMonth` popolato, corrente tutto zero.
7. `monthToDateDelta` corretto con dati parziali nel mese.

Esegui i test e assicurati che passino.
```

### Criteri di accettazione

- [ ] Nessuna dipendenza da Prisma/React
- [ ] Timezone Roma su tutti i raggruppamenti
- [ ] Test verdi per tutti i casi elencati
- [ ] Tipi esportati riutilizzabili da `stats.ts` e dal componente UI

---

## Prompt 2 — Integrazione in `getStatsPageData`

**Skill da usare:** `non-lho-comprato-backend-logic-builder` + `non-lho-comprato-stats-builder`

**Obiettivo:** esporre i dati della heatmap nella pagina stats senza query aggiuntive.

### Prompt

```
Integra `buildDailySpendingComparison` in `src/actions/stats.ts`.

Requisiti:
1. Importa tipi e funzione da `src/lib/daily-spending-comparison.ts`.
2. Aggiungi `dailySpendingComparison: DailySpendingComparison` a `StatsPageData`.
3. In `getStatsPageData`, dopo il fetch delle entry esistenti, chiama:
   `buildDailySpendingComparison(entries)` passando solo `{ date, realCost }`.
4. Non aggiungere query Prisma extra: riusa le entry già caricate.
5. Esporta i tipi necessari per il componente UI (`DailySpendingComparison` almeno).

Opzionale nello stesso PR (solo se piccolo e sicuro):
- Allinea `getMonthKey` in stats.ts al timezone Roma (usa parti da `getRomeDateKey` o helper condiviso) così i grafici mensili restano coerenti con la heatmap.

Verifica che TypeScript compili e che la pagina stats possa destructuring `dailySpendingComparison`.
```

### Criteri di accettazione

- [ ] `getStatsPageData` restituisce `dailySpendingComparison`
- [ ] Nessuna query database aggiuntiva
- [ ] Filtro persona invariato (le entry filtrate alimentano la heatmap)
- [ ] Build TypeScript ok

---

## Prompt 3 — Componente UI heatmap

**Skill da usare:** `non-lho-comprato-ui-builder` + `non-lho-comprato-stats-builder`

**Obiettivo:** card con griglia a quadretti, due righe mese, tooltip confronto.

### Prompt

```
Crea `src/components/stats/daily-spending-heatmap.tsx` per Non l'ho comprato.

Props:
```typescript
type DailySpendingHeatmapProps = {
  data: DailySpendingComparison;
};
```

Requisiti UI:
- `"use client"` solo se serve per tooltip/interazione; i dati arrivano già pronti dal server.
- Stile card coerente con `MonthlySavingsChart`: `rounded-[14px] border border-border bg-surface p-[18px]`.
- Header:
  - Eyebrow: "Confronto giornaliero"
  - Sottotitolo: mese corrente + delta MTD se disponibile (es. "Giugno 2026 · +€30,00 fino al 7 vs maggio")
- Griglia:
  - Se `previousMonth` esiste: due righe (mese precedente sopra, corrente sotto).
  - Etichetta mese a sinistra di ogni riga (abbreviazione 3 lettere: Mag, Giu).
  - Colonne allineate per numero giorno (1…31).
  - Quadretti ~10–12px, `gap-0.5` o `gap-1`, `rounded-[2px]`.
- Colori intensità (5 livelli + zero):
  - Zero spesa: `bg-surface-muted` o equivalente.
  - Con spesa: scala su `maxDailySpent` usando toni neutri/spesa (es. muted-foreground con opacità crescente, o variabile CSS esistente).
  - Oggi: ring/bordo sottile visibile.
  - Futuro: opacità ridotta, non interattivo.
  - Giorno inesistente nel mese (`dateKey: null`): cella vuota/non renderizzata o placeholder invisibile per mantenere allineamento.
- Legenda in fondo: "Meno" → gradiente quadretti → "Più speso".
- Tooltip (Radix/shadcn se disponibile, altrimenti `title` nativo per MVP):
  - Giorno corrente: "7 giu · €30,00"
  - Se previous esiste e ha lo stesso giorno: " · 7 mag · €27,00 · +€3,00"
  - Formato soldi con `formatMoney` e delta con segno (+/-).
- Empty state inline se nessun movimento nei due mesi: messaggio in italiano, stile dashed come altri grafici stats.
- Mobile: griglia scrollabile orizzontalmente (`overflow-x-auto`); etichette giorno ogni 5 colonne sotto la griglia.
- Accessibilità: `aria-label` descrittivo su ogni cella interattiva con testo completo del confronto.
- Tutto il testo visibile in italiano.

Non fetchare dati nel componente. Non usare Recharts per questa feature.
```

### Criteri di accettazione

- [ ] Card visivamente coerente con gli altri grafici stats
- [ ] Due righe allineate per giorno del mese
- [ ] Tooltip mostra confronto giorno-per-giorno
- [ ] Leggibile su mobile con scroll orizzontale
- [ ] Empty state gestito
- [ ] Nessun fetch client-side

---

## Prompt 4 — Integrazione pagina e loading

**Skill da usare:** `non-lho-comprato-ui-builder` + `non-lho-comprato-project-architect`

**Obiettivo:** collegare il componente alla pagina stats e aggiornare lo skeleton.

### Prompt

```
Integra `DailySpendingHeatmap` nella pagina statistiche di Non l'ho comprato.

File: `app/stats/page.tsx`

Requisiti:
1. Destructuring `dailySpendingComparison` da `getStatsPageData`.
2. Posiziona `<DailySpendingHeatmap data={dailySpendingComparison} />` dopo `<StatsOverviewCards />` e prima della sezione grafici (`MonthlySavingsChart`).
3. Mostra la heatmap solo quando la pagina non è in empty state completo (`!isCompletelyEmpty`), come gli altri grafici.
4. Passa `aria-label="Confronto spesa giornaliera"` sulla section wrapper se appropriato.

File: `app/stats/loading.tsx`

Aggiungi uno skeleton per la card heatmap (altezza ~120–160px, stile coerente con skeleton esistenti in `src/components/loading/page-skeletons.tsx` se usati).

Verifica navigazione su `/stats` con e senza dati.
```

### Criteri di accettazione

- [ ] Heatmap visibile nella posizione corretta
- [ ] Non appare nell'empty state completo
- [ ] Loading skeleton presente
- [ ] Nessuna regressione su filtri persona

---

## Prompt 5 — Polish: indicatore delta e riepilogo MTD

**Skill da usare:** `non-lho-comprato-ui-builder` (opzionale, fase 2)

**Obiettivo:** rendere il confronto più leggibile a colpo d'occhio.

### Prompt

```
Migliora `DailySpendingHeatmap` con indicatori visivi del delta giornaliero.

Requisiti:
1. Su ogni cella del mese corrente (non futura) con `previousMonth` presente:
   - Se delta > 0: piccolo indicatore rosso/warning (es. dot in alto a destra o bordo sottile).
   - Se delta < 0: indicatore verde/success.
   - Se delta === 0: nessun indicatore extra.
2. Footer riepilogo sotto la legenda:
   - "Fino al {giorno} {mese}: {totale corrente} vs {totale precedente} ({delta con segno})"
   - Usa `monthToDateDelta` e totali parziali già calcolati lato server, oppure derivati da `data` senza ricalcolo complesso.
3. Mantieni accessibilità: l'indicatore colore non deve essere l'unica informazione (resta nel tooltip/aria-label).

Non cambiare la logica server se non necessario.
```

### Criteri di accettazione

- [ ] Delta visibile senza aprire tooltip
- [ ] Riepilogo MTD in italiano
- [ ] Non peggiora la leggibilità mobile

---

## Prompt 6 — Fix timezone mensile in stats (opzionale)

**Skill da usare:** `non-lho-comprato-backend-logic-builder`

**Obiettivo:** allineare aggregazione mensile esistente al timezone Roma.

### Prompt

```
In `src/actions/stats.ts`, `getMonthKey` usa `date.getFullYear()` / `date.getMonth()` che dipendono dalla timezone del server.

Allinea l'aggregazione mensile al timezone Roma:
1. Crea o riusa un helper `getRomeMonthKey(date: Date): string` che restituisce "YYYY-MM" basato su `getRomeDateKey`.
2. Sostituisci `getMonthKey` con la versione Roma in tutte le aggregazioni mensili di stats.ts.
3. Aggiungi test unitari se modifichi helper condiviso, oppure test in daily-spending-comparison se il helper vive lì.
4. Verifica che `MonthlySavingsChart` e insights mensili restino corretti per entry a cavallo di mezzanotte UTC.

Cambio minimo, nessun refactor non correlato.
```

### Criteri di accettazione

- [ ] Mese calcolato in timezone Roma ovunque in stats
- [ ] Nessuna regressione sui test esistenti

---

## Prompt unico end-to-end (alternativa)

Se preferisci un solo passaggio invece dei prompt sequenziali:

```
Implementa la heatmap giornaliera spesa nella pagina /stats di Non l'ho comprato.

Feature: griglia stile GitHub con quadretti per mese corrente e mese precedente, confronto spesa reale giorno-per-giorno (es. 7 mag €27 vs 7 giu €30).

Segui `.agents/skills/non-lho-comprato-stats-builder/SKILL.md` e questo documento.

Step:
1. `src/lib/daily-spending-comparison.ts` + test
2. Wiring in `getStatsPageData` (`src/actions/stats.ts`)
3. `src/components/stats/daily-spending-heatmap.tsx`
4. Integrazione in `app/stats/page.tsx` e `app/stats/loading.tsx`

Requisiti chiave:
- Metrica: realCost per giorno
- Timezone: Europe/Rome via getRomeDateKey
- Server fetch only, testo italiano, mobile-friendly
- Card coerente con MonthlySavingsChart
- Empty state, tooltip confronto, legenda intensità

Opzionale: fix getMonthKey in stats.ts per timezone Roma.

Al termine: elenca test manuali eseguiti e file modificati.
```

---

## Edge cases da coprire

| Caso | Comportamento atteso |
|---|---|
| 7 mag €27, 7 giu €30 | Tooltip: `+€3,00` |
| 7 mag €27, 7 giu €0 | Tooltip: `-€27,00` |
| 31 mag con spesa, giu ha 30 giorni | Colonna 31 solo su maggio |
| Mese corrente appena iniziato | Solo primi giorni pieni, resto futuro |
| Primo mese di utilizzo | Solo riga corrente, `previousMonth: null` |
| Filtro persona attivo | Numeri coerenti col filtro |
| Entry alle 23:30 UTC | Giorno corretto in timezone Roma |
| Workspace senza movimenti nei 2 mesi | Empty state inline nella card |

---

## Checklist test manuali

1. [ ] `/stats` senza movimenti → empty state pagina, heatmap non visibile
2. [ ] Movimenti solo a maggio → riga maggio in previous, giugno tutto zero
3. [ ] Movimenti su stesso giorno in entrambi i mesi → tooltip confronto corretto
4. [ ] Giorno senza spesa → quadretto vuoto, tooltip €0,00
5. [ ] Oggi evidenziato correttamente
6. [ ] Giorni futuri non cliccabili / attenuati
7. [ ] Filtro persona cambia i numeri
8. [ ] Mobile: scroll orizzontale, nessun overflow che rompe layout
9. [ ] Formato euro italiano ovunque
10. [ ] Loading skeleton visibile durante navigazione

---

## Ordine di esecuzione consigliato

```
Prompt 1 → Prompt 2 → Prompt 3 → Prompt 4 → (Prompt 5 opz.) → (Prompt 6 opz.)
```

Stima: **1 sessione** per Prompt 1–4 (MVP), **+½ sessione** per Prompt 5–6.

---

## Scelte prodotto ancora aperte

Prima di Prompt 5+, confermare con il product owner:

1. **Metrica alternativa:** toggle risparmio vs spesa reale?
2. **Mese precedente:** mostrare sempre la riga calendario (con zeri) o solo se ha dati?
3. **Confronto visivo:** solo tooltip o anche colore verde/rosso sul delta?
4. **Posizione:** confermare slot tra overview e grafici mensili.
