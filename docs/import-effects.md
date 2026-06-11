# Codex — Import del layer "Premium motion & micro-feedback"

> **Obiettivo.** Portare nel codebase reale (Next.js App Router + Tailwind v4 + shadcn) tutte le
> animazioni del prototipo `NLC Premium.html`: press-state ovunque, numeri che contano, **odometro**
> sugli hero, reveal/stagger al posto degli scheletri, add ottimistico, toast con Annulla,
> pull-to-refresh a fiamma, celebrazioni sobrie. **Senza** cambiare grafica crafted, dati o Server Actions.
>
> **Regola d'oro dell'import pulito:** *riusa ciò che esiste già, non duplicarlo.* Il codebase ha
> già haptics, celebrazione streak e primitive crafted. Questo doc ti dice cosa riusare e cosa
> creare ex-novo. Leggi la **Sezione 0** prima di scrivere una riga.

---

## 0. Cosa ESISTE GIÀ — riusare, non ricreare

| Già nel codebase | Dove | Usalo per |
|---|---|---|
| `triggerHaptic(preset)` | `src/lib/haptics.ts` — preset: `subtle \| light \| success \| strong` | **TUTTE** le vibrazioni. ❌ Non creare un nuovo modulo haptics. |
| `useStreakCelebrationTrigger()` + `streak-celebration-overlay.tsx` | `src/hooks/`, `src/components/dashboard/` | La celebrazione streak **esiste**. Aggancia lì il burst di particelle (Sez. 2.6), non un secondo sistema. |
| Primitive crafted | `components/crafted/` → `Rule, Label, Mono, Serif, CraftedIcon, StatTrio, ProgressLine, CraftedNumpad` | Base tipografica/icone. Le nuove primitive motion **vivono accanto** e le avvolgono. |
| Token colore + font | `app/globals.css` `@theme inline` → `--accent #d9a651`, `--line`, `--ink-3`, `--green`, `--font-geist-mono`, `--font-instrument-serif` | Usa **questi** nelle animazioni. ❌ Non hardcodare gli hex. |
| `tw-animate-css` | importato in `globals.css` | Hai già keyframe utility tipo `animate-in/out`. Riusa dove combaciano (la sheet già usa `data-open:slide-in-from-bottom-4`). |

**Convenzioni del codebase da rispettare:**
- Componenti interattivi = `"use client"`. Le pagine in `app/**/page.tsx` restano Server Components.
- Niente stili inline per colori/spaziature: usa classi Tailwind con i token (`text-accent`, `border-line`, `text-ink-3`, `font-mono`).
- I `crafted-*.tsx` sono il sistema **definitivo**; modifica quelli, non i vecchi `*.tsx` non-crafted.

---

## 1. Token & keyframe → `app/globals.css`

Aggiungi in fondo a `globals.css` (dopo i blocchi `:root`/`.dark`). Sono CSS custom properties +
keyframe puri: nessuna dipendenza nuova. Tutto è già a prova di `prefers-reduced-motion`.

```css
/* ════════ Premium motion — durations & easing ════════ */
:root {
  --t-instant: 110ms;  --t-fast: 190ms;  --t-base: 320ms;
  --t-slow: 460ms;     --t-count: 760ms; --stagger: 46ms;
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-inout:  cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.42, 0.5, 1);
  --ease-snap:   cubic-bezier(0.4, 0, 0.2, 1);
  --press-scale: 0.965;
}

/* press feedback (utility, applied via .nlc-press) */
.nlc-press { transition: transform var(--t-instant) var(--ease-snap), opacity var(--t-instant) var(--ease-snap); -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.nlc-press:active { transform: scale(var(--press-scale)); opacity: .8; }

/* reveal / stagger (replaces skeletons on warm navigations) */
.nlc-reveal { opacity: 0; transform: translateY(10px); }
.nlc-reveal.is-in { opacity: 1; transform: none; transition: opacity var(--t-base) var(--ease-out), transform var(--t-base) var(--ease-out); }

/* number pop on change */
@keyframes nlc-pop { 0%{transform:scale(1)} 38%{transform:scale(1.07)} 100%{transform:scale(1)} }
.nlc-pop { animation: nlc-pop var(--t-fast) var(--ease-spring); }

/* odometer shine + floating delta (the signature "wow") */
@keyframes nlc-shine { from{transform:translateX(-130%) skewX(-16deg)} to{transform:translateX(240%) skewX(-16deg)} }
.nlc-odo-shine { position:absolute; top:-6%; bottom:-6%; width:36%; left:0; background:linear-gradient(90deg,transparent,rgba(255,239,200,.6),transparent); mix-blend-mode:plus-lighter; pointer-events:none; opacity:0; }
.nlc-odo-shine.go { animation: nlc-shine 760ms var(--ease-out) both; }
@keyframes nlc-float-up { 0%{opacity:0;transform:translateY(8px) scale(.86)} 16%{opacity:1;transform:none} 100%{opacity:0;transform:translateY(-30px)} }
.nlc-odo-delta { position:absolute; left:2px; top:-10px; white-space:nowrap; animation: nlc-float-up 1150ms var(--ease-out) both; }

/* grow bars (progress / chart columns) */
@keyframes nlc-grow-x { from{transform:scaleX(0)} to{transform:scaleX(1)} }
@keyframes nlc-grow-y { from{transform:scaleY(0)} to{transform:scaleY(1)} }
.nlc-grow-x { transform-origin:left center; animation: nlc-grow-x var(--t-slow) var(--ease-out) both; }
.nlc-grow-y { transform-origin:bottom center; animation: nlc-grow-y var(--t-slow) var(--ease-out) both; }

/* optimistic row insert + highlight wash */
@keyframes nlc-row-in { from{opacity:0;transform:translateY(-8px);max-height:0} to{opacity:1;transform:none;max-height:140px} }
@keyframes nlc-flash  { 0%{background:rgba(217,166,81,.16)} 100%{background:transparent} }
.nlc-row-in { animation: nlc-row-in var(--t-slow) var(--ease-out) both; overflow:hidden; }
.nlc-flash  { animation: nlc-flash 1.4s var(--ease-out) both; }

/* check draw on habit "Evitata" */
@keyframes nlc-draw { to{stroke-dashoffset:0} }
.nlc-check-draw { stroke-dasharray:30; stroke-dashoffset:30; animation: nlc-draw var(--t-base) var(--ease-out) forwards; }

/* celebration particle */
.nlc-spark { position:absolute; width:7px; height:7px; border-radius:2px; background:var(--accent); pointer-events:none; will-change:transform,opacity; }

/* HONOUR reduced motion — content always visible, loops/transforms off */
@media (prefers-reduced-motion: reduce) {
  .nlc-reveal { opacity:1 !important; transform:none !important; }
  .nlc-odo-shine.go, .nlc-odo-delta, .nlc-pop, .nlc-grow-x, .nlc-grow-y, .nlc-row-in, .nlc-flash, .nlc-check-draw { animation:none !important; }
  .nlc-press { transition:none; }
}
```

> ⚠️ **Tailwind v4:** queste sono utility CSS "plain", non `@apply`. Vanno bene così in `globals.css`.
> Non serve estendere il theme. Se preferisci, puoi avvolgerle in `@layer utilities { … }`.

---

## 2. Nuove primitive → `components/crafted/motion/`

Crea la cartella `components/crafted/motion/` e aggiungi questi file. Tutti `"use client"`.
Esportali da un `components/crafted/motion/index.ts`. **Riferimento di comportamento:** i file del
prototipo (`nlc-kit.jsx`, `nlc-fx.jsx`) — riproducine la logica, ma con TSX tipizzato + classi Tailwind.

### 2.1 `Pressable.tsx`
Wrapper tap universale. NON reimplementa l'haptics: chiama `triggerHaptic`.
```tsx
"use client";
import { triggerHaptic, type HapticPreset } from "@/src/lib/haptics";
import { cn } from "@/lib/utils";

export function Pressable<T extends keyof JSX.IntrinsicElements = "button">(
  { as, haptic = "subtle", className, onClick, children, ...rest }:
  { as?: T; haptic?: HapticPreset | null } & React.ComponentProps<T>
) {
  const Tag = (as ?? "button") as any;
  return (
    <Tag className={cn("nlc-press", className)}
      onClick={(e: any) => { if (haptic) triggerHaptic(haptic); onClick?.(e); }} {...rest}>
      {children}
    </Tag>
  );
}
```
> Usa `.nlc-press` (CSS `:active`) per lo scale, così funziona anche senza JS e con tastiera.

### 2.2 `useCountUp.ts` + `CraftedAmount.tsx`
Hook rAF con ease-out cubic; rispetta reduced-motion (salta all'arrivo). `CraftedAmount` divide
intero/decimali/€ come l'attuale `Mono` hero. Vedi `useCountUp`/`Amount` nel prototipo `nlc-kit.jsx`.
Formattazione IT: `Intl.NumberFormat("it-IT", { minimumFractionDigits: 2 })` (già usata in `crafted-money.ts` → riusa `formatCraftedCompact` dove serve).

### 2.3 `CraftedOdometer.tsx` ⭐ (l'effetto firma)
Cifre che rotolano (colonne 0–9 traslate), bagliore `.nlc-odo-shine`, delta `.nlc-odo-delta`.
Codice di riferimento completo: funzione `Odometer` in `nlc-kit.jsx`. Adatta:
- colori → `text-foreground` / `text-accent` (no hex);
- font → `font-mono` (già mappato a `--font-geist-mono`).
  **Dove:** SOLO gli hero importi (un numero per schermata): vedi Sez. 3.

### 2.4 `Reveal.tsx` / `Stagger.tsx`
`Stagger` aggiunge `.is-in` ai figli `.nlc-reveal` con delay incrementale (`--stagger`). Reduced-motion
li rende subito visibili (già nel CSS). Riferimento: `Stagger`/`RevealItem` in `nlc-kit.jsx`.

### 2.5 `GrowBar.tsx` / aggiorna `ProgressLine`
Barre/colonne che crescono on-mount via `.nlc-grow-x` / `.nlc-grow-y` (CSS puro — **non** rAF, che
si mette in pausa fuori focus). `ProgressLine` esiste già in `components/crafted/`: aggiungi solo la
classe `nlc-grow-x` al riempimento interno e fagli riposare alla larghezza naturale (`width: pct%`).

### 2.6 `ToastProvider.tsx` + `useToast()`
Provider montato una volta nello shell; `push({ text, sub?, tone?, icon?, action? })`. L'azione
serve per **Annulla/Elimina**. Riferimento: `ToastProvider`/`ToastCard` in `nlc-fx.jsx`. Stile con
token: `bg-surface/85 backdrop-blur border-line`, tono ok=`text-success`, err=`text-destructive`,
celebrate=`text-accent`.

### 2.7 `PullToRefresh.tsx`
Indicatore fiamma (`CraftedIcon name="flame"`), ingaggia solo a `scrollTop 0`, `onRefresh` ritorna
Promise. Riferimento: `PullToRefresh` in `nlc-fx.jsx`. In produzione `onRefresh = () => router.refresh()`.

### 2.8 `celebration.ts` (burst particelle) — aggancio alla celebrazione ESISTENTE
Funzione imperativa `celebrate({x?, y?, count?})` che spruzza `.nlc-spark` d'oro. **Non** creare un
nuovo overlay/trigger: chiamala **dentro** `streak-celebration-overlay.tsx` (e su 4/4 abitudini),
così resta UNA sola sorgente di celebrazione. Default intensità **media** (16); sobria 0; festosa 30.
Riferimento: `CelebrationHost`/`celebrate` in `nlc-fx.jsx`.

---

## 3. Wiring — file per file (mappa esatta)

> Ordine = dal più sicuro al più invasivo. Commit a ogni riga.

| # | File reale | Modifica |
|---|---|---|
| 1 | **globals.css** | Incolla Sez. 1. Verifica build, nessun cambiamento visivo. |
| 2 | `src/components/entries/crafted-entry-row.tsx` | Avvolgi la riga in `<Pressable as="div">` (o aggiungi `className="nlc-press"` al `Link`). |
| 3 | `src/components/layout/crafted-bottom-bar.tsx` | `nlc-press` sulle voci; dot oro che scorre sotto la tab attiva (`.tab-dot` → `transition: left var(--t-base) var(--ease-spring)`). |
| 4 | `components/crafted/numpad.tsx` (`CraftedNumpad`) | `nlc-press` su ogni tasto; haptic `subtle` al tap (già hai `triggerHaptic`). |
| 5 | `src/components/dashboard/crafted-dashboard.tsx` | Hero "tenuti questo mese" → `<CraftedOdometer value={…}/>`. Trio (`StatTrio`) → valori con `useCountUp`. Avvolgi le sezioni in `<Stagger>`. |
| 6 | `src/components/stats/crafted-stats.tsx` | Hero → `CraftedOdometer`; colonne grafico → `GrowBar` (`.nlc-grow-y`); barre categoria → `ProgressLine` con `.nlc-grow-x`. |
| 7 | `src/components/goals/crafted-goals.tsx` | Barre obiettivo → `ProgressLine` animata; hero "vicina" → `CraftedOdometer`. |
| 8 | `src/components/dashboard/couple-balance-card.tsx` | Hero coppia → `CraftedOdometer`. |
| 9 | **ToastProvider** in `src/components/layout/app-shell.tsx` | Monta `<ToastProvider>` attorno al contenuto. |
| 10 | `src/components/entries/quick-add-sheet.tsx` | Dopo `createEntry` ok → `push()` toast "Tenuto · Annulla". Vedi Sez. 4 per l'ottimistico. |
| 11 | `src/components/entries/crafted-entry-list.tsx` | Riga appena creata → classi `nlc-row-in nlc-flash` (per ~1.5s). |
| 12 | `src/components/habits/crafted-habit-occurrence-actions.tsx` | Sostituisci lo `<Loader2 spin>` di "Evitata" con il check disegnato (`.nlc-check-draw`); haptic `success`; su 4/4 → `celebrate()`. |
| 13 | `app/**/loading.tsx` + `crafted-page-skeletons.tsx` | Vedi Sez. 5 (strategia scheletri). |
| 14 | `src/components/layout/app-shell.tsx` o liste | Avvolgi l'area scroll in `<PullToRefresh onRefresh={() => router.refresh()}>`. |

---

## 4. Add ottimistico — il punto delicato (leggi prima di toccare)

Oggi: `QuickAddSheet` chiama `createEntry` via `useActionState`, poi `router.refresh()`. La lista
(`CraftedEntryList`) è un **componente separato** con stato proprio. Quindi un inserimento
"ottimistico" vero richiede una di queste due strade — scegline UNA:

- **(A) Pragmatica (consigliata per import pulito):** lascia il flusso attuale (`router.refresh()`),
  ma quando la lista si ri-renderizza, marca la riga più recente con `nlc-row-in nlc-flash` se la
  sua `createdAt` è < 2s fa. Effetto "appena inserito" senza rifattorizzare lo stato. Zero rischi.
- **(B) Ottimistico reale:** solleva lo stato entries con `useOptimistic` (React 19) in un provider
  comune a sheet+lista, fai il prepend immediato, e concilia con il risultato del Server Action; il
  toast "Annulla" rimuove l'ottimistico. Più potente ma tocca l'architettura — fallo come step a sé,
  **dopo** che tutto il resto è in produzione.

> Per la prima PR usa **(A)**. Non bloccare l'import sul refactor dello stato.

---

## 5. Scheletri — ridurre, non strappare (onesto)

I `loading.tsx` sono i **fallback Suspense** mentre i Server Components fanno fetch: non puoi
eliminarli, sennò vedi pagina vuota al primo ingresso. Strategia:

1. **Tieni** lo skeleton come fallback del *primo* ingresso a freddo (no cache).
2. **Ammorbidisci il passaggio** skeleton→contenuto avvolgendo il contenuto caricato in `<Stagger>`
   (entra in cascata invece di "sbattere" dentro).
3. **Declassa** `src/components/layout/page-loader.tsx`: usalo solo dove non c'è nulla in cache;
   nelle navigazioni con dati già noti, niente loader.
4. **Alleggerisci** `crafted-page-skeletons.tsx`: meno blocchi shimmer, più vicini alla forma reale,
   così il cross-fade è impercettibile.

Risultato percepito: lo scheletro si vede solo al cold-start, le navigazioni successive sono fluide.

---

## 6. Trappole specifiche di questo stack (per evitare "intoppi")

- **iOS PWA:** `navigator.vibrate` è no-op su Safari/iOS — `triggerHaptic` già lo gestisce e ritorna
  `false`. Non legare logica al suo ritorno.
- **rAF in background:** per le barre/colonne usa le animazioni CSS (`.nlc-grow-*`), **non**
  `requestAnimationFrame` con doppio `rAF` — viene messo in pausa quando il tab/iframe non è attivo
  e le barre restano a 0. (Lezione appresa nel prototipo.)
- **RSC boundary:** `ToastProvider`, `PullseRefresh`, ogni primitiva con hook = `"use client"`. Le
  pagine `page.tsx` restano server: monta i client component dentro, non convertirle.
- **Token, non hex:** usa `text-accent` / `var(--accent)`; il tema è dark-first ma passa da CSS vars,
  quindi un domani il light theme "funziona gratis".
- **`prefers-reduced-motion`:** testa con il setting attivo a OGNI step — il contenuto deve restare
  pienamente leggibile (il CSS della Sez. 1 lo garantisce, ma verifica i nuovi componenti).
- **Una celebrazione sola:** il burst particelle va dentro `useStreakCelebrationTrigger` /
  `streak-celebration-overlay`, non in parallelo. Evita doppioni di overlay.
- **Un "wow" per schermata:** l'odometro va solo sull'hero. Sul trio/righe usa il `useCountUp`
  semplice (niente shine/delta), altrimenti l'effetto si svaluta.

---

## 7. Ordine di PR consigliato (ognuna autonoma e mergeable)

1. **PR-1 — Fondamenta:** Sez. 1 (CSS) + `Pressable` applicato a righe/tab/numpad/bottom-bar.
   *(Da sola alza già molto la sensazione "premium", rischio ~0.)*
2. **PR-2 — Numeri:** `useCountUp` + `CraftedAmount` + **`CraftedOdometer`** sugli hero (dashboard,
   stats, goals, coppia).
3. **PR-3 — Reveal:** `Stagger` sulle pagine + `GrowBar`/`ProgressLine` animate + alleggerimento
   scheletri (Sez. 5).
4. **PR-4 — Feedback azioni:** `ToastProvider` + toast con Annulla su quick-add; check disegnato +
   haptic `success` sulle abitudini.
5. **PR-5 — Gesti:** `PullToRefresh` sullo shell.
6. **PR-6 — Celebrazione:** burst particelle agganciato a streak + 4/4 abitudini.
7. **PR-7 (opzionale) — Ottimistico reale:** strada (B) della Sez. 4 con `useOptimistic`.

A ogni PR: `pnpm build` (o equivalente) verde, e check manuale con reduced-motion ON/OFF.

---

## 8. File di riferimento (nel progetto design, NON da copiare 1:1)

- `nlc-motion.css` — sorgente dei token/keyframe (la Sez. 1 ne è l'estratto adattato).
- `nlc-kit.jsx` — `Pressable`, `useCountUp`, `CraftedAmount`/`Amount`, **`Odometer`**, `Stagger`, `ProgressBar`, `GrowBar`.
- `nlc-fx.jsx` — `ToastProvider`/`useToast`, `PullToRefresh`, `CelebrationHost`/`celebrate`.
- `nlc-app-premium.jsx` — logica `addEntry` ottimistica, `toggleHabit`, tab-bar dot, sheet numpad.
- `nlc-screen-*.jsx` — composizione per schermata (dashboard, movimenti, stats, goals, habits, coppia).

> Questi sono React+Babel da anteprima: leggili come **specifica di comportamento**. In produzione
> = client component tipizzati, classi Tailwind con i token, e aggancio alle Server Actions esistenti.
