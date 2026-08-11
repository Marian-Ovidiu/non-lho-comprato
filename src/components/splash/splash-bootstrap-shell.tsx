import {
  MARK_DEPTH_OFFSET,
  MARK_DEPTH_OPACITY,
  MARK_DEPTH_WIDTH,
  MARK_FOREGROUND,
  MARK_LETTER_WIDTH,
  MARK_N_DIAGONAL_PATH,
  MARK_N_STEM_PATH,
  MARK_NL_JOIN_PATH,
  MARK_RING_PATH,
  MARK_RING_WIDTH,
  MARK_ACCENT,
  SPLASH_MARK_SIZE,
} from "@/src/lib/nlc-mark-art";
import { SPLASH_SHELL_ID } from "@/src/lib/splash";

/**
 * First paint before React: deep black, the NLC monogram, and an accent arc
 * orbiting it. Matches NlcSplash so Android/iOS WebViews never flash the app
 * icon PNG.
 */
export function SplashBootstrapShell() {
  return (
    <div id={SPLASH_SHELL_ID} aria-hidden="true" suppressHydrationWarning>
      <div className="nlc-splash-bootstrap-scene">
        <div className="nlc-splash-glow" />
        <div className="nlc-splash-stage">
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
          <svg
            width={SPLASH_MARK_SIZE}
            height={SPLASH_MARK_SIZE}
            viewBox="0 0 100 100"
            fill="none"
            aria-hidden
          >
            <path
              d={MARK_RING_PATH}
              stroke={MARK_ACCENT}
              strokeWidth={MARK_DEPTH_WIDTH}
              strokeLinecap="round"
              opacity={MARK_DEPTH_OPACITY}
              transform={MARK_DEPTH_OFFSET}
            />
            <path
              d={MARK_RING_PATH}
              stroke={MARK_FOREGROUND}
              strokeWidth={MARK_RING_WIDTH}
              strokeLinecap="round"
            />
            <g
              stroke={MARK_FOREGROUND}
              strokeWidth={MARK_LETTER_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={MARK_N_STEM_PATH} />
              <path d={MARK_N_DIAGONAL_PATH} />
              <path d={MARK_NL_JOIN_PATH} />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
