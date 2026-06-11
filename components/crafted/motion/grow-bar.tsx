"use client";

import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

type GrowBarProps = {
  orientation?: "x" | "y";
  className?: string;
  barClassName?: string;
  style?: CSSProperties;
  title?: string;
};

export function GrowBar({
  orientation = "y",
  className,
  barClassName,
  style,
  title,
}: GrowBarProps) {
  return (
    <div className={className} title={title}>
      <div
        className={cn(
          orientation === "y" ? "nlc-grow-y" : "nlc-grow-x",
          barClassName,
        )}
        style={style}
      />
    </div>
  );
}
