const HAPTIC_PRESETS = {
  subtle: [6],
  light: [10],
  success: [8, 12, 8],
  strong: [24, 14, 24],
} as const;

export type HapticPreset = keyof typeof HAPTIC_PRESETS;

function isStandaloneDisplayMode() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches
  );
}

function isTouchOrMobileContext() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithMobile = navigator as Navigator & {
    standalone?: boolean;
    userAgentData?: { mobile?: boolean };
  };

  if (navigatorWithMobile.userAgentData?.mobile) {
    return true;
  }

  if (navigatorWithMobile.standalone) {
    return true;
  }

  if (isStandaloneDisplayMode()) {
    return true;
  }

  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const anyCoarsePointer =
    window.matchMedia?.("(any-pointer: coarse)").matches ?? false;

  return (coarsePointer || anyCoarsePointer) && navigator.maxTouchPoints > 0;
}

export function triggerHaptic(preset: HapticPreset = "light") {
  try {
    if (typeof window === "undefined" || typeof navigator.vibrate !== "function") {
      return false;
    }

    if (!isTouchOrMobileContext()) {
      return false;
    }

    return navigator.vibrate(HAPTIC_PRESETS[preset]);
  } catch {
    return false;
  }
}

export { HAPTIC_PRESETS };
