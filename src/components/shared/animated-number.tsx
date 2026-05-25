"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import type { CSSProperties } from "react";

type AnimatedNumberProps = {
  value: number;
  format?: (n: number) => string;
  className?: string;
  style?: CSSProperties;
  duration?: number;
};

export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  className,
  style,
  duration = 0.7,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, format);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [value, motionValue, duration]);

  return (
    <motion.span className={className} style={style}>
      {display}
    </motion.span>
  );
}
