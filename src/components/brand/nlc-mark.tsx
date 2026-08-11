"use client";

import type { CSSProperties } from "react";

import {
  MARK_ACCENT,
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
} from "@/src/lib/nlc-mark-art";

type NlcMarkProps = {
  size?: number;
  foreground?: string;
  accent?: string;
  /** Sotto i 40px la N e la L si impastano: resta la sola C. */
  simplified?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function NlcMark({
  size = 96,
  foreground = MARK_FOREGROUND,
  accent = MARK_ACCENT,
  simplified = false,
  className,
  style,
}: NlcMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={{ display: "block", ...style }}
      aria-hidden
    >
      {/* La copia verde sfalsata non è un'ombra: è lo spessore del contenitore,
          che si vede solo dove la curva gira. Sta sotto e non tocca le lettere. */}
      <path
        d={MARK_RING_PATH}
        stroke={accent}
        strokeWidth={MARK_DEPTH_WIDTH}
        strokeLinecap="round"
        opacity={MARK_DEPTH_OPACITY}
        transform={MARK_DEPTH_OFFSET}
      />
      <path
        d={MARK_RING_PATH}
        stroke={foreground}
        strokeWidth={MARK_RING_WIDTH}
        strokeLinecap="round"
      />
      {simplified ? null : (
        <g
          stroke={foreground}
          strokeWidth={MARK_LETTER_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={MARK_N_STEM_PATH} />
          <path d={MARK_N_DIAGONAL_PATH} />
          <path d={MARK_NL_JOIN_PATH} />
        </g>
      )}
    </svg>
  );
}
