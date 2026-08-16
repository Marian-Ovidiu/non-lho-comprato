"use client";

import { useEffect, useState } from "react";

/**
 * Quanto la tastiera virtuale copre del viewport.
 *
 * Un pannello incollato al bordo basso, quando la tastiera si apre, ci finisce
 * sotto: è il modo classico in cui il pulsante di salvataggio sparisce proprio
 * mentre si scrive. `visualViewport` è l'unica misura che tutti i browser
 * mobili aggiornano davvero; dove non esiste l'offset resta zero e il pannello
 * si comporta come prima.
 *
 * Viveva dentro l'aggiunta rapida. Sta qui perché adesso i pannelli a foglio
 * sono tre, e una misura condivisa scritta in tre posti è una misura che prima
 * o poi si sfasa — è la quinta volta che questo documento lo dice.
 */
export function useKeyboardInset(open: boolean): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport =
      typeof window === "undefined" ? null : window.visualViewport;

    if (!open || !viewport) {
      return;
    }

    const update = () => {
      const overlap = window.innerHeight - viewport.height - viewport.offsetTop;
      setInset(overlap > 24 ? Math.round(overlap) : 0);
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      setInset(0);
    };
  }, [open]);

  return inset;
}
