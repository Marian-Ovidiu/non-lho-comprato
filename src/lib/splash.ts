import { applyStoredTheme } from "@/src/lib/theme";

export const SPLASH_BACKGROUND = "#0a0a09";
export const SPLASH_SEEN_KEY = "nlc-splash-seen";
export const SPLASH_PENDING_CLASS = "nlc-splash-pending";
export const SPLASH_SHELL_ID = "nlc-splash-shell";

export function getSplashBootstrapScript() {
  return `
(function(){
  try {
    if (sessionStorage.getItem(${JSON.stringify(SPLASH_SEEN_KEY)})) return;
    document.documentElement.classList.add(${JSON.stringify(SPLASH_PENDING_CLASS)});
  } catch (error) {}
})();
`;
}

export function clearSplashBootstrapShell() {
  if (typeof document === "undefined") return;

  document.documentElement.classList.remove(SPLASH_PENDING_CLASS);
  document.getElementById(SPLASH_SHELL_ID)?.remove();
  applyStoredTheme();
}
