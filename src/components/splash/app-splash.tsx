"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type AppSplashProps = {
  minDuration?: number;
  onDone?: () => void;
};

export function AppSplash({ minDuration = 2200, onDone }: AppSplashProps) {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), minDuration);
    const t2 = setTimeout(() => {
      setGone(true);
      onDone?.();
    }, minDuration + 480);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [minDuration, onDone]);

  if (gone) return null;

  return (
    <div className={`splash ${leaving ? "is-leaving" : ""}`} aria-hidden="true">
      <div className="glow" />

      <div className="mark">
        <svg className="border" viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect
            className="track"
            x="1.4"
            y="1.4"
            width="97.2"
            height="97.2"
            rx="23.8"
            ry="23.8"
            pathLength={100}
          />
          <rect
            className="comet"
            x="1.4"
            y="1.4"
            width="97.2"
            height="97.2"
            rx="23.8"
            ry="23.8"
            pathLength={100}
          />
        </svg>

        <div className="tile">
          <Image
            src="/logo-euro.png"
            alt="Non l'ho comprato"
            fill
            priority
            sizes="180px"
          />
        </div>

        <span className="spark" />
      </div>

      <div className="word">Non l&apos;ho comprato</div>

      <style jsx>{`
        .splash {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 34px;
          opacity: 1;
          transition: opacity 0.45s ease;
        }
        .splash.is-leaving {
          opacity: 0;
        }

        .glow {
          position: absolute;
          top: 44%;
          left: 50%;
          width: 360px;
          height: 360px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(217, 166, 81, 0.16) 0%,
            rgba(21, 51, 30, 0.22) 38%,
            transparent 70%
          );
          filter: blur(8px);
          animation: breathe 2.6s ease-in-out infinite;
        }

        .mark {
          position: relative;
          width: 168px;
          height: 168px;
          opacity: 0;
          transform: scale(0.84);
          animation: pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s forwards;
        }

        .border {
          position: absolute;
          inset: 0;
          overflow: visible;
          opacity: 0;
          animation: fade 0.4s ease 0.55s forwards;
        }
        .track {
          fill: none;
          stroke: #f4f1ea;
          stroke-width: 1.4;
          opacity: 0.12;
        }
        .comet {
          fill: none;
          stroke: #d9a651;
          stroke-width: 2.4;
          stroke-linecap: round;
          stroke-dasharray: 16 84;
          filter: drop-shadow(0 0 6px rgba(217, 166, 81, 0.9));
          animation: border-run 2s linear 0.6s infinite;
        }

        .tile {
          position: absolute;
          inset: 0;
          border-radius: 40px;
          overflow: hidden;
          background: #15331e;
          box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.6),
            0 0 32px rgba(217, 166, 81, 0.16);
          clip-path: circle(8% at 50% 56%);
          animation: ignite 0.9s ease-out 0.15s forwards;
        }

        .spark {
          position: absolute;
          top: 15%;
          left: 50%;
          width: 30px;
          height: 30px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(217, 166, 81, 0.65) 0%,
            transparent 65%
          );
          opacity: 0;
          animation:
            pop-spark 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.95s forwards,
            twinkle 1.8s ease-in-out 1.35s infinite;
        }

        .word {
          font-size: 17px;
          font-weight: 600;
          letter-spacing: 0.01em;
          color: #f4f1ea;
          opacity: 0;
          transform: translateY(14px);
          animation: rise 0.55s ease-out 1.15s forwards;
        }

        @keyframes pop {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes fade {
          to {
            opacity: 1;
          }
        }
        @keyframes ignite {
          to {
            clip-path: circle(95% at 50% 56%);
          }
        }
        @keyframes pop-spark {
          to {
            opacity: 1;
          }
        }
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes rise {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes breathe {
          0%,
          100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes border-run {
          0% {
            stroke-dashoffset: -3.66;
            animation-timing-function: ease-in-out;
          }
          25% {
            stroke-dashoffset: -28.66;
            animation-timing-function: ease-in-out;
          }
          50% {
            stroke-dashoffset: -53.66;
            animation-timing-function: ease-in-out;
          }
          75% {
            stroke-dashoffset: -78.66;
            animation-timing-function: ease-in-out;
          }
          100% {
            stroke-dashoffset: -103.66;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mark,
          .border,
          .tile,
          .spark,
          .word,
          .glow,
          .comet {
            animation: none !important;
          }
          .mark,
          .border,
          .spark,
          .word {
            opacity: 1;
            transform: none;
          }
          .tile {
            clip-path: none;
          }
        }
      `}</style>
    </div>
  );
}
