import {
  FLAME_MARK_FOREGROUND,
  FLAME_MARK_GOLD,
  FLAME_PATH,
  SPLASH_FLAME_SIZE,
} from "@/src/lib/flame-mark-art";
import { SPLASH_SHELL_ID } from "@/src/lib/splash";

/**
 * Static splash shown before React hydrates — same visual as FlameSplash center
 * (warm black + flickering flame), not the app icon PNG.
 */
export function SplashBootstrapShell() {
  return (
    <div id={SPLASH_SHELL_ID} aria-hidden="true" suppressHydrationWarning>
      <div className="nlc-splash-bootstrap-scene">
        <div className="nlc-splash-glow" />
        <svg
          width={SPLASH_FLAME_SIZE}
          height={SPLASH_FLAME_SIZE}
          viewBox="0 0 100 100"
          fill="none"
          className="nlc-splash-flicker"
          aria-hidden
        >
          <path d={FLAME_PATH} fill={FLAME_MARK_FOREGROUND} />
          <text
            x="53"
            y="73"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight={700}
            fontSize={26}
            fill={FLAME_MARK_GOLD}
          >
            €
          </text>
        </svg>
      </div>
    </div>
  );
}
