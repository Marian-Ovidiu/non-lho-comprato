export const SPLASH_BACKGROUND = "#15331e";
export const SPLASH_SEEN_KEY = "nlc-splash-seen";
export const SPLASH_PENDING_CLASS = "nlc-splash-pending";
export const SPLASH_SHELL_ID = "nlc-splash-shell";

export function getSplashBootstrapScript() {
  return `
(function(){
  try {
    if (sessionStorage.getItem(${JSON.stringify(SPLASH_SEEN_KEY)})) return;
    document.documentElement.classList.add(${JSON.stringify(SPLASH_PENDING_CLASS)});
    var shell = document.getElementById(${JSON.stringify(SPLASH_SHELL_ID)});
    if (shell) shell.style.display = "flex";
  } catch (error) {}
})();
`;
}

export function clearSplashBootstrapShell() {
  if (typeof document === "undefined") return;

  document.documentElement.classList.remove(SPLASH_PENDING_CLASS);
  document.getElementById(SPLASH_SHELL_ID)?.remove();
}
