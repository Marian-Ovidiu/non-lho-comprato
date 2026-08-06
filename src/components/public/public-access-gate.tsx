"use client";

import { LoginPanel } from "@/src/components/auth/login-panel";
import { TrustCopy } from "@/src/components/shared/trust-copy";
import { useDisplayMode } from "@/src/hooks/use-display-mode";

import { PublicLanding } from "./public-landing";

function NlcMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" stroke="var(--accent)" strokeWidth="1.6" />
      <path
        d="M7.5 7.5 L16.5 16.5 M16.5 7.5 L7.5 16.5"
        stroke="var(--accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PublicAccessGate() {
  const { isStandalone } = useDisplayMode();

  if (isStandalone) {
    return (
      <main className="flex min-h-[100dvh] flex-col bg-background px-6 pb-8 pt-10">
        <div className="flex items-center gap-2.5">
          <NlcMark />
          <span className="text-[14px] font-semibold tracking-[0.04em]">
            Non l&apos;ho comprato
          </span>
        </div>

        {/* La promessa era "traccia i soldi che non hai speso": in tre mesi di
            uso reale quella funzione vale 19 euro su 320 movimenti. Qui va
            quello che l'app fa davvero bene, cioè tenere insieme le spese di
            due persone. */}
        <div className="mb-8 mt-auto">
          <p className="mb-3.5 font-serif italic text-[18px] text-muted-foreground">
            le spese di due persone,
          </p>
          <h1
            className="font-bold leading-[0.95] tracking-[-0.045em] text-foreground"
            style={{ fontSize: 64 }}
          >
            in <span className="text-accent">un</span>
            <br />
            posto solo.
          </h1>
          <p className="mt-6 max-w-[290px] text-[16px] leading-[1.5] text-muted-foreground">
            Segnate quello che spendete, ognuno dal proprio telefono. Vedrete
            dove finiscono i soldi e chi ha pagato cosa.
          </p>
        </div>

        <LoginPanel compact providers={["google"]} />

        <TrustCopy
          className="mt-5 text-center text-[11px] tracking-[0.05em]"
          style={{ color: "var(--text-3)" }}
        />
      </main>
    );
  }

  return <PublicLanding />;
}
