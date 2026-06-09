import { applyStoredTheme } from "@/src/lib/theme";

export const SPLASH_BACKGROUND = "#0a0a09";
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
.nlc-splash-bootstrap-comet{fill:none;stroke:#d9a651;stroke-width:2;stroke-linecap:round;stroke-dasharray:14 86;filter:drop-shadow(0 0 5px rgba(217,166,81,.85));animation:nlc-splash-comet 2.2s linear infinite}
@keyframes nlc-splash-comet{to{stroke-dashoffset:-100}}
@keyframes nlc-splash-flicker{0%,100%{transform:scaleY(1) scaleX(1) rotate(0deg)}20%{transform:scaleY(1.04) scaleX(.985) rotate(-1.1deg)}45%{transform:scaleY(.975) scaleX(1.015) rotate(.9deg)}70%{transform:scaleY(1.025) scaleX(.99) rotate(-.6deg)}85%{transform:scaleY(.99) scaleX(1.008) rotate(.4deg)}}
@keyframes nlc-splash-glow{0%,100%{opacity:.5}50%{opacity:.85}}
.nlc-splash-flicker{transform-box:fill-box;transform-origin:50% 92%;animation:nlc-splash-flicker 2.6s ease-in-out infinite}
.nlc-splash-glow{position:absolute;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(217,166,81,.13),transparent 62%);animation:nlc-splash-glow 2.6s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.nlc-splash-bootstrap-comet,.nlc-splash-flicker,.nlc-splash-glow{animation:none!important}}
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
