"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { FlameMark } from "@/src/components/brand/flame-mark";

const GOLD = "var(--accent, #d9a651)";

type FlameSplashProps = {
  onDone?: () => void;
};

function readViewport() {
  return {
    w: window.innerWidth,
    h: window.innerHeight,
  };
}

export function FlameSplash({ onDone }: FlameSplashProps) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const dotsRef = useRef<(SVGCircleElement | null)[]>([]);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    setDims(readViewport());
  }, []);

  useEffect(() => {
    const measure = () => setDims(readViewport());
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useLayoutEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const path = pathRef.current;
    if (!path || prefersReduced || !dims.w) return;

    const L = path.getTotalLength();
    const x = 10;
    const y = 10;
    const w = dims.w - 20;
    const h = dims.h - 20;
    const r = 44;
    const arc = (Math.PI / 2) * r;
    const top = w - 2 * r;
    const side = h - 2 * r;
    const corners = [
      top + arc / 2,
      top + arc + side + arc / 2,
      top + arc + side + arc + top + arc / 2,
      top + arc + side + arc + top + arc + side + arc / 2,
    ];
    const easeInOut = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const LAP = 4.2;
    const N = 14;
    let raf = 0;
    let t0 = 0;

    const frame = (now: number) => {
      if (!t0) t0 = now;
      const t = (now - t0) / 1000;
      const phase = (t / LAP) % 1;
      const seg = Math.floor(phase * 4);
      const local = phase * 4 - seg;
      const a = corners[seg];
      let b = corners[(seg + 1) % 4];
      if (b <= a) b += L;
      const head = (a + (b - a) * easeInOut(local)) % L;

      for (let i = 0; i < N; i++) {
        const ln = (((head - i * 6) % L) + L) % L;
        const p = path.getPointAtLength(ln);
        const dot = dotsRef.current[i];
        if (!dot) continue;
        const k = 1 - i / N;
        dot.setAttribute("cx", String(p.x));
        dot.setAttribute("cy", String(p.y));
        dot.setAttribute("r", (0.4 + 2.6 * k).toFixed(2));
        dot.setAttribute("opacity", (k * k).toFixed(3));
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [dims]);

  const { w, h } = dims;
  const x = 10;
  const y = 10;
  const bw = w - 20;
  const bh = h - 20;
  const r = 44;
  const d =
    `M ${x + r} ${y} H ${x + bw - r} A ${r} ${r} 0 0 1 ${x + bw} ${y + r} ` +
    `V ${y + bh - r} A ${r} ${r} 0 0 1 ${x + bw - r} ${y + bh} ` +
    `H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + bh - r} V ${y + r} ` +
    `A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;

  return (
    <div
      onClick={onDone}
      className="flex size-full items-center justify-center overflow-hidden bg-[#0a0a09]"
    >
      <div className="nlc-splash-glow absolute size-[300px] rounded-full" />

      <FlameMark size={210} className="nlc-splash-flicker relative z-[1]" />

      {w > 0 ? (
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          className="pointer-events-none absolute inset-0"
        >
          <path d={d} fill="none" stroke="rgba(244,241,234,0.06)" strokeWidth={1.5} />
          <path ref={pathRef} d={d} fill="none" stroke="none" />
          <g style={{ filter: "drop-shadow(0 0 5px rgba(217,166,81,.9))" }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <circle
                key={i}
                ref={(el) => {
                  dotsRef.current[i] = el;
                }}
                fill={GOLD}
                cx={-10}
                cy={-10}
                r={2}
              />
            ))}
          </g>
        </svg>
      ) : null}
    </div>
  );
}
