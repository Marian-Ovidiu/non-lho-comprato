"use client";

import type { CSSProperties } from "react";

import { FLAME_PATH } from "@/src/lib/flame-mark-art";

type FlameMarkProps = {
  size?: number;
  flame?: string;
  gold?: string;
  className?: string;
  style?: CSSProperties;
};

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
