"use client";

import { useEffect, useRef } from "react";

/**
 * La stanza — aura, orb, onde — a livello d'app.
 *
 * Prima viveva dentro il componente della dashboard, ed era il motivo per cui
 * la home aveva luce e tutto il resto era piatto. La stanza però non è un
 * elemento *per pagina*: è un elemento solo, agganciato al viewport, a costo
 * fisso. L'argomento sul costo del backdrop-filter — quello vero — riguarda il
 * *vetro*, che è per-elemento e che infatti resta dov'era; non riguarda la
 * stanza, che è un fondale e ne basta uno.
 *
 * Due manopole, e sono le due obiezioni serie:
 *
 * - `variant`: quanto la stanza è accesa. Piena dietro il vetro della
 *   dashboard (dodici card, scroll lento, testo grande); bassa dietro il testo
 *   fitto di un elenco, dove diventa una velatura del fondo invece che cinque
 *   sfere dietro le parole. Il contrasto AA non è mai in gioco perché le
 *   campiture dell'aura sono a bassa alpha *sopra* `--background`: il fondo
 *   sotto il testo resta quello, appena inclinato di tinta.
 *
 * - `motion`: la parallasse legata allo scroll è accesa solo dove il contenuto
 *   sono card. In una lista il dito lancia e passano duecento righe: a quella
 *   velocità gli orb che scorrono a 0,4x diventano una strisciata. Lì la stanza
 *   sta ferma — c'è, dà profondità, ma non commenta lo scroll.
 */
export function AppRoom({
  variant,
  motion,
}: {
  variant: "full" | "quiet";
  motion: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !motion) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const orbs = Array.from(root.querySelectorAll<HTMLElement>(".nlc-orb"));
    const waves = Array.from(root.querySelectorAll<SVGGElement>(".nlc-wave-layer"));
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollY = window.scrollY;

      for (const orb of orbs) {
        const speed = Number(orb.dataset.sp) || 0;
        const spin = Number(orb.dataset.rot) || 0;
        orb.style.transform = `translate3d(0, ${(scrollY * speed).toFixed(1)}px, 0) rotate(${(scrollY * spin).toFixed(2)}deg)`;
      }
      for (const wave of waves) {
        const speed = Number(wave.dataset.sp) || 0;
        wave.style.transform = `translateX(${(scrollY * speed).toFixed(1)}px)`;
      }
    };

    const onScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [motion]);

  // Quando la parallasse è spenta gli orb devono tornare a casa: il componente
  // non si rimonta cambiando rotta, quindi una trasformata lasciata da una
  // pagina precedente resterebbe congelata sullo schermo.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || motion) {
      return;
    }
    for (const el of root.querySelectorAll<HTMLElement>(".nlc-orb, .nlc-wave-layer")) {
      el.style.transform = "";
    }
  }, [motion]);

  return (
    <div ref={rootRef} aria-hidden="true" className="nlc-room" data-room={variant}>
      <div className="nlc-room-aura" />
      <span className="nlc-orb nlc-orb-1" data-sp="0.20" data-rot="0.018" />
      <span className="nlc-orb nlc-orb-2" data-sp="0.40" data-rot="-0.026" />
      <span className="nlc-orb nlc-orb-3" data-sp="0.13" data-rot="0.034" />
      <span className="nlc-orb nlc-orb-4" data-sp="0.46" data-rot="0.03" />
      <span className="nlc-orb nlc-orb-5" data-sp="0.08" data-rot="-0.014" />
      <div className="nlc-waves">
        <svg viewBox="0 0 1440 220" preserveAspectRatio="none">
          <defs>
            <path
              id="nlc-waveband"
              d="M0,110 C120,48 240,48 360,110 C480,172 600,172 720,110 C840,48 960,48 1080,110 C1200,172 1320,172 1440,110 C1560,48 1680,48 1800,110 C1920,172 2040,172 2160,110 C2280,48 2400,48 2520,110 C2640,172 2760,172 2880,110 L2880,220 L0,220 Z"
            />
          </defs>
          <g className="nlc-wave-layer" data-sp="0.13">
            <use href="#nlc-waveband" transform="translate(0,-30)" fill="rgba(209,249,117,0.09)" />
          </g>
          <g className="nlc-wave-layer" data-sp="-0.24">
            <use href="#nlc-waveband" transform="translate(0,4)" fill="rgba(202,146,246,0.12)" />
          </g>
          <g className="nlc-wave-layer" data-sp="0.36">
            <use href="#nlc-waveband" transform="translate(0,30)" fill="rgba(154,162,94,0.16)" />
          </g>
        </svg>
      </div>
    </div>
  );
}
