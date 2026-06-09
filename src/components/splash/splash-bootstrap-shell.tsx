import {
  FLAME_MARK_FOREGROUND,
  FLAME_MARK_GOLD,
  FLAME_PATH,
  SPLASH_FLAME_SIZE,
} from "@/src/lib/flame-mark-art";
import { SPLASH_SHELL_ID } from "@/src/lib/splash";

/**
 * First paint before React: warm black + flickering flame + comet on the border.
 * Matches FlameSplash so Android/iOS WebViews never flash the app icon PNG.
 */
export function SplashBootstrapShell() {
  return (
    <div id={SPLASH_SHELL_ID} aria-hidden="true" suppressHydrationWarning>
      <div className="nlc-splash-bootstrap-scene">
        <svg
          className="nlc-splash-bootstrap-border"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <rect
            className="nlc-splash-bootstrap-comet"
            x="1.2"
            y="1.2"
            width="97.6"
            height="97.6"
            rx="4.4"
            ry="4.4"
            pathLength={100}
          />
        </svg>
        <div className="nlc-splash-glow" />
        <svg
          width={SPLASH_FLAME_SIZE}
          height={SPLASH_FLAME_SIZE}
          viewBox="0 0 100 100"
          fill="none"
          className="nlc-splash-flicker relative z-[1]"
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
