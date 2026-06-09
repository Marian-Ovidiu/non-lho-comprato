"use client";

import type { CSSProperties } from "react";

type FlameMarkProps = {
  size?: number;
  flame?: string;
  gold?: string;
  className?: string;
  style?: CSSProperties;
};

const FLAME_PATH =
  "M50 16 C 47 27, 41 31, 38.5 40 C 35.5 50, 33 57, 37 68 C 41 80, 60 84, 68 74 " +
  "C 74 66.5, 72.5 57, 68 50 C 65 45.5, 61 43, 59.5 37.5 C 61 44, 58.5 49, 53.5 48 " +
  "C 48.5 47, 49.5 38.5, 52.5 32 C 54.3 28, 54 21, 50 16 Z";

export function FlameMark({
  size = 96,
  flame = "var(--foreground, #f4f1ea)",
  gold = "var(--accent, #d9a651)",
  className,
  style,
}: FlameMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={{ display: "block", overflow: "visible", ...style }}
      aria-hidden
    >
      <path d={FLAME_PATH} fill={flame} />
      <text
        x="53"
        y="73"
        textAnchor="middle"
        fontFamily="var(--font-geist-sans, system-ui), sans-serif"
        fontWeight={700}
        fontSize={26}
        fill={gold}
      >
        €
      </text>
    </svg>
  );
}
