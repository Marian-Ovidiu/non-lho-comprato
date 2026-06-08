# Implementare lo splash con Codex

Istruzioni per integrare lo splash "Non l'ho comprato" nel codebase Next.js.

---

## Cosa fa

Schermata d'ingresso che copre lo schermo all'avvio mentre l'app carica:
fiamma che si accende dal centro, scintilla oro che luccica, una **cometa oro che
corre lungo il bordo arrotondato del tile rallentando a ogni angolo**, wordmark che
sale, poi fade-out e smonta. Tutto in CSS (nessuna libreria), rispetta
`prefers-reduced-motion`.

---

## Passi

### 1. Aggiungi l'asset del logo
Copia il file del logo (il tile verde con fiamma + € + scintilla) in:
```
public/logo-euro.png
```
> È lo stesso PNG 1254×1254 che hai usato qui. Se cambi nome, aggiorna `src` nel componente.

### 2. Aggiungi il componente
Crea `src/components/splash/app-splash.tsx` con il contenuto del file
`app-splash.tsx` allegato in questa cartella. È un client component (`"use client"`),
usa `next/image` e styled-jsx (già supportato da Next.js, nessuna dipendenza nuova).

### 3. Montalo con un "gate"
Lo splash deve comparire al primo caricamento e sparire quando l'app è pronta.
Crea `src/components/splash/splash-gate.tsx`:

```tsx
"use client";

import { useState } from "react";
import { AppSplash } from "./app-splash";

export function SplashGate({ children }: { children: React.ReactNode }) {
  // Mostra lo splash solo una volta per sessione del tab.
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return true;
    return !sessionStorage.getItem("nlc-splash-seen");
  });

  return (
    <>
      {children}
      {show && (
        <AppSplash
          minDuration={2200}
          onDone={() => {
            sessionStorage.setItem("nlc-splash-seen", "1");
            setShow(false);
          }}
        />
      )}
    </>
  );
}
```

Poi avvolgi i children in `app/layout.tsx` (dentro `<body>`, attorno all'app shell):

```tsx
import { SplashGate } from "@/components/splash/splash-gate";

// ...
<body className={...}>
  <SplashGate>
    {/* AppShell / providers / children esistenti */}
    {children}
  </SplashGate>
</body>
```

### 4. (Opzionale) Legare lo splash al caricamento reale
Se vuoi che lo splash resti finché auth/dati sono pronti invece che a tempo fisso,
passa una condizione invece del solo timer. Esempio con un provider di sessione:

```tsx
// dentro SplashGate, sostituisci minDuration con una logica ready
const ready = useSessionReady(); // hook tuo
// resta visibile finché !ready, con un minimo di ~1.2s per non "lampeggiare"
```
In pratica: tieni `show=true` finché `ready === false`, ma garantisci un minimo
di durata (es. 1200ms) così non sparisce all'istante se i dati arrivano subito.

---

## Dettagli tecnici (per capire/ritoccare)

- **Cometa sul bordo**: due `<rect rx ry pathLength={100}>` sovrapposti dentro un
  `<svg viewBox="0 0 100 100">`. Quello di sotto è la traccia tenue; quello sopra è
  la cometa (`stroke-dasharray: 16 84`, un segmento corto che gira).
- **Rallentamento agli angoli**: l'animazione `border-run` ha keyframe a
  0/25/50/75/100% (i 4 angoli sono equidistanti sul perimetro arrotondato) e ogni
  quarto usa `animation-timing-function: ease-in-out`. Risultato: la velocità va
  quasi a zero in ogni angolo, poi riaccelera sul lato dritto.
- **Tuning rapido**:
  - velocità giro → `animation: border-run 2s ...` (più basso = più veloce)
  - "pausa" più marcata sugli angoli → sostituisci `ease-in-out` con una cubic-bezier
    più aggressiva, es. `cubic-bezier(0.9, 0, 0.1, 1)`
  - lunghezza cometa → primo numero di `stroke-dasharray` (16)
  - colore cometa → `stroke: #d9a651` (oro). Per una scia, vedi nota sotto.
  - durata reveal della fiamma → `ignite 0.9s ...`
- **Coda/scia** (se la vuoi): duplica il `<rect className="comet">` 2–3 volte con
  `stroke-dasharray` via via più corto, opacità decrescente e lo stesso
  `animation` ma con un piccolo `animation-delay` negativo crescente (es. -0.04s,
  -0.08s) per creare l'effetto trail.
- **Radius**: il tile ha `border-radius: 40px` su 168px. Nell'SVG il `rx="23.8"`
  corrisponde (40/168×100 ≈ 23.8). Se cambi la dimensione del tile, ricalcola `rx`
  e mantieni `pathLength={100}` (gli offset dei keyframe restano validi perché
  normalizzati).
- **Colori brand del logo**: verde `#15331e`, crema `#f4f1ea`, oro `#d9a651`.

---

## Prompt pronto per Codex

> Aggiungi una schermata splash all'app Next.js. 
> 1) Crea `src/components/splash/app-splash.tsx` con il codice che ti incollo (è un
>    client component CSS-only con styled-jsx, usa `next/image` e `/logo-euro.png`).
> 2) Crea `src/components/splash/splash-gate.tsx` che mostra `<AppSplash>` una sola
>    volta per sessione del tab (sessionStorage `nlc-splash-seen`) e lo smonta a fine
>    animazione.
> 3) Avvolgi i children dentro `<body>` in `app/layout.tsx` con `<SplashGate>`,
>    senza rompere providers/AppShell esistenti.
> 4) Verifica che builda (`next build`) e che con `prefers-reduced-motion: reduce`
>    lo splash mostri logo+wordmark senza animazioni.
> Non modificare altro. Mostrami il diff prima di applicare.
>
> [qui incolli il contenuto di app-splash.tsx]

---

## Verifica finale
- `next dev`, apri l'app: lo splash deve comparire ~2.2s, la cometa gira e rallenta
  agli angoli, poi fade-out sulla dashboard.
- Ricarica: non deve riapparire nella stessa sessione del tab (sessionStorage).
- DevTools → Rendering → "Emulate prefers-reduced-motion: reduce": logo e wordmark
  visibili, nessuna animazione.
- Mobile viewport (iPhone): tile centrato, nessun overflow orizzontale.
