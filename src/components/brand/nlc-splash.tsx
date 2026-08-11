"use client";

import { NlcMark } from "@/src/components/brand/nlc-mark";
import { SPLASH_BACKGROUND } from "@/src/lib/splash";
import { SPLASH_MARK_SIZE } from "@/src/lib/nlc-mark-art";

type NlcSplashProps = {
  onDone?: () => void;
};

/* La versione React della soglia. Ripete esattamente la scena del guscio che
   ha già dipinto il primo fotogramma: se le due differissero, al momento in cui
   React prende il controllo si vedrebbe un salto.

   L'arco che gira è tutto in CSS (vedi getSplashCriticalCss). La versione
   precedente inseguiva quattordici punti lungo il bordo dello schermo con un
   requestAnimationFrame che rimisurava la finestra a ogni resize: qui il
   movimento è una rotazione attorno a un centro, e il centro non dipende da
   quanto è grande lo schermo. */
export function NlcSplash({ onDone }: NlcSplashProps) {
  return (
    <div
      onClick={onDone}
      className="flex size-full items-center justify-center overflow-hidden"
      style={{ background: SPLASH_BACKGROUND }}
    >
      <div className="nlc-splash-glow absolute" />

      <div className="nlc-splash-stage relative z-[1]">
        <svg
          className="nlc-splash-ring"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden
        >
          <circle className="nlc-splash-ring-track" cx="50" cy="50" r="47" />
          <circle
            className="nlc-splash-ring-arc"
            cx="50"
            cy="50"
            r="47"
            pathLength={100}
          />
        </svg>

        <NlcMark size={SPLASH_MARK_SIZE} />
      </div>
    </div>
  );
}
