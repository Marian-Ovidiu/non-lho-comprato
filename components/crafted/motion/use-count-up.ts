"use client";

import { useEffect, useRef, useState } from "react";

type UseCountUpOptions = {
  duration?: number;
  precision?: number;
  startOnMount?: boolean;
};

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function roundToPrecision(value: number, precision: number) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useCountUp(
  value: number,
  {
    duration = 760,
    precision = 2,
    startOnMount = true,
  }: UseCountUpOptions = {},
) {
  const [displayValue, setDisplayValue] = useState(() =>
    startOnMount
      ? 0
      : roundToPrecision(Number.isFinite(value) ? value : 0, precision),
  );
  const previousValueRef = useRef(displayValue);

  useEffect(() => {
    if (!Number.isFinite(value)) {
      const frameId = window.requestAnimationFrame(() => {
        setDisplayValue(0);
        previousValueRef.current = 0;
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    if (prefersReducedMotion() || duration <= 0) {
      const nextValue = roundToPrecision(value, precision);
      const frameId = window.requestAnimationFrame(() => {
        setDisplayValue(nextValue);
        previousValueRef.current = nextValue;
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    const from = previousValueRef.current;
    const to = value;

    if (from === to) {
      return;
    }

    const startedAt = performance.now();
    let frameId = 0;

    function tick(now: number) {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      const nextValue = roundToPrecision(from + (to - from) * eased, precision);

      setDisplayValue(nextValue);
      previousValueRef.current = nextValue;

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
        return;
      }

      const finalValue = roundToPrecision(to, precision);
      setDisplayValue(finalValue);
      previousValueRef.current = finalValue;
    }

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [duration, precision, value]);

  return displayValue;
}
