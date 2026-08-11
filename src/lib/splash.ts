import { MARK_ACCENT } from "@/src/lib/nlc-mark-art";
import { applyStoredTheme } from "@/src/lib/theme";

/* Il nero della soglia. Era #0a0a09, un nero caldo che veniva dalla palette
   oro: la prima cosa che si vedeva dell'app era ancora la vecchia direzione, e
   all'uscita dello splash il fondo saltava di tinta. Adesso è il nero della
   stanza, cioè --background del tema scuro: entrare nell'app non è più un
   cambio di colore, è solo il marchio che si toglie di mezzo.

   Resta questo e non il #0A0A0A della tavola del marchio proprio per quel
   motivo: la tavola sceglie il nero che sta meglio accanto al monogramma, ma
   qui il vicino non è il monogramma, è la prima schermata dell'app. */
export const SPLASH_BACKGROUND = "#0b1512";
export const SPLASH_START_KEY = "nlc-splash-start";
export const SPLASH_PENDING_CLASS = "nlc-splash-pending";
export const SPLASH_SHELL_ID = "nlc-splash-shell";

/** Inline critical CSS — must paint before globals.css on slow Android WebViews. */
export function getSplashCriticalCss() {
  return `
html.nlc-splash-pending,html.nlc-splash-pending body{background:${SPLASH_BACKGROUND}!important;overflow:hidden}
html.nlc-splash-pending body>:not(#nlc-splash-shell){visibility:hidden}
html.nlc-splash-pending #nlc-splash-shell{display:block!important}
#nlc-splash-shell{position:fixed;inset:0;z-index:9999;display:none;background:${SPLASH_BACKGROUND}}
.nlc-splash-bootstrap-scene{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;overflow:hidden}
.nlc-splash-bootstrap-border{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.nlc-splash-stage{position:relative;display:grid;place-items:center;width:236px;height:236px}
.nlc-splash-stage>*{grid-area:1/1}
.nlc-splash-ring{width:100%;height:100%}
.nlc-splash-ring-track{fill:none;stroke:rgba(255,255,255,.09);stroke-width:1.6}
.nlc-splash-ring-arc{fill:none;stroke:${MARK_ACCENT};stroke-width:1.9;stroke-linecap:round;stroke-dasharray:24 76;transform-origin:50% 50%;filter:drop-shadow(0 0 4px rgba(157,196,95,.7));animation:nlc-splash-orbit 2.4s cubic-bezier(.5,0,.5,1) infinite}
@keyframes nlc-splash-orbit{to{transform:rotate(360deg)}}
@keyframes nlc-splash-glow{0%,100%{opacity:.45}50%{opacity:.8}}
.nlc-splash-glow{position:absolute;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(157,196,95,.13),transparent 62%);animation:nlc-splash-glow 2.6s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.nlc-splash-ring-arc,.nlc-splash-glow{animation:none!important}}
`;
}

export function getSplashBootstrapScript() {
  return `
(function(){
  try {
    sessionStorage.setItem(${JSON.stringify(SPLASH_START_KEY)}, String(Date.now()));
    document.documentElement.classList.add(${JSON.stringify(SPLASH_PENDING_CLASS)});
  } catch (error) {}
})();
`;
}

export function clearSplashBootstrapShell() {
  if (typeof document === "undefined") return;

  // Removing the pending class alone hides #nlc-splash-shell via the critical
  // CSS (`#nlc-splash-shell { display: none }` by default). We must NOT call
  // `.remove()` on the shell node: it is rendered by React (<SplashBootstrapShell />
  // in the layout), and deleting it from outside React corrupts the fiber tree,
  // causing `NotFoundError: Failed to execute 'removeChild'/'insertBefore'` on the
  // next reconciliation — which crashes the whole app on first interaction.
  document.documentElement.classList.remove(SPLASH_PENDING_CLASS);
  sessionStorage.removeItem(SPLASH_START_KEY);
  applyStoredTheme();
}

export function getSplashElapsedMs(): number {
  if (typeof window === "undefined") return 0;

  const startedAt = Number(sessionStorage.getItem(SPLASH_START_KEY));
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return 0;
  }

  return Date.now() - startedAt;
}

export function isInstalledPwa(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // iOS Safari “Add to Home Screen”
    ("standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}
