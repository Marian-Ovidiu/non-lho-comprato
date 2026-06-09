import { applyStoredTheme } from "@/src/lib/theme";

export const SPLASH_BACKGROUND = "#0a0a09";
export const SPLASH_SEEN_KEY = "nlc-splash-seen";
export const SPLASH_START_KEY = "nlc-splash-start";
export const SPLASH_PENDING_CLASS = "nlc-splash-pending";
export const SPLASH_SHELL_ID = "nlc-splash-shell";

export function getSplashBootstrapScript() {
  return `
(function(){
  try {
    if (sessionStorage.getItem(${JSON.stringify(SPLASH_SEEN_KEY)})) return;
    sessionStorage.setItem(${JSON.stringify(SPLASH_START_KEY)}, String(Date.now()));
    document.documentElement.classList.add(${JSON.stringify(SPLASH_PENDING_CLASS)});
  } catch (error) {}
})();
`;
}

export function clearSplashBootstrapShell() {
  if (typeof document === "undefined") return;

  document.documentElement.classList.remove(SPLASH_PENDING_CLASS);
  document.getElementById(SPLASH_SHELL_ID)?.remove();
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
