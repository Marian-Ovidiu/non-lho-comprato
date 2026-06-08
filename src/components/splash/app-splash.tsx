"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import {
  clearSplashBootstrapShell,
  SPLASH_BACKGROUND,
  SPLASH_SEEN_KEY,
} from "@/src/lib/splash";

type AppSplashProps = {
  minDuration?: number;
  onDone?: () => void;
};

export function AppSplash({ minDuration = 2700, onDone }: AppSplashProps) {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    clearSplashBootstrapShell();
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), minDuration);
    const t2 = setTimeout(() => {
      setGone(true);
      onDone?.();
    }, minDuration + 520);

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
          background: ${SPLASH_BACKGROUND};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 34px;
          opacity: 1;
          transition: opacity 0.52s ease;
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
            rgba(217, 166, 81, 0.14) 0%,
            rgba(21, 51, 30, 0.18) 38%,
            transparent 70%
          );
          filter: blur(8px);
          opacity: 0;
          animation: breathe 2.6s ease-in-out 0.35s infinite,
            fade-in 0.6s ease 0.35s forwards;
        }

        .mark {
          position: relative;
          width: 168px;
          height: 168px;
          opacity: 1;
          transform: scale(1);
        }

        .border {
          position: absolute;
          inset: 0;
          overflow: visible;
          opacity: 0;
          animation: fade 0.5s ease 0.45s forwards;
        }

        .comet {
          fill: none;
          stroke: #d9a651;
          stroke-width: 2.4;
          stroke-linecap: round;
          stroke-dasharray: 16 84;
          filter: drop-shadow(0 0 6px rgba(217, 166, 81, 0.9));
          animation: border-run 2s linear 0.55s infinite;
        }

        .tile {
          position: absolute;
          inset: 0;
          border-radius: 40px;
          overflow: hidden;
          background: ${SPLASH_BACKGROUND};
          box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.45),
            0 0 32px rgba(217, 166, 81, 0.12);
        }

        .tile :global(img) {
          object-fit: cover;
          transform: scale(1.08);
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
            pop-spark 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.85s forwards,
            twinkle 1.8s ease-in-out 1.25s infinite;
        }

        .word {
          font-size: 17px;
          font-weight: 600;
          letter-spacing: 0.01em;
          color: #f4f1ea;
          opacity: 0;
          transform: translateY(14px);
          animation: rise 0.55s ease-out 0.95s forwards;
        }

        @keyframes fade-in {
          to {
            opacity: 1;
          }
        }
        @keyframes fade {
          to {
            opacity: 1;
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
          .border,
          .spark,
          .word,
          .glow,
          .comet {
            animation: none !important;
          }
          .border,
          .spark,
          .word,
          .glow {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
