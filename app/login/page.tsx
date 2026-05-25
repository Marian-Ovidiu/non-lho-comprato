import { redirect } from "next/navigation";

import { LoginPanel } from "@/src/components/auth/login-panel";
import { getAuthenticatedUser } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

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

export default async function LoginPage() {
  const authUser = await getAuthenticatedUser();

  if (authUser) {
    redirect("/");
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background px-6 pb-8 pt-10">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <NlcMark />
        <span className="text-[14px] font-semibold tracking-[0.04em]">
          Non l&apos;ho comprato
        </span>
      </div>

      {/* Tagline + heading */}
      <div className="mb-8 mt-auto">
        <p className="mb-3.5 font-serif italic text-[18px] text-muted-foreground">
          traccia i soldi che
        </p>
        <h1
          className="font-bold leading-[0.95] tracking-[-0.045em] text-foreground"
          style={{ fontSize: 64 }}
        >
          <span className="text-accent">non</span> hai
          <br />
          speso.
        </h1>
        <p className="mt-6 max-w-[280px] text-[16px] leading-[1.5] text-muted-foreground">
          Ogni volta che eviti un acquisto, lo registri qui. Vedi il quadro di
          quanto resta nel portafoglio.
        </p>
      </div>

      {/* CTA */}
      <LoginPanel compact providers={["google"]} />

      {/* Trust */}
      <p
        className="mt-5 text-center text-[11px] tracking-[0.05em]"
        style={{ color: "var(--text-3)" }}
      >
        Cifratura end-to-end · Niente pubblicità
      </p>
    </main>
  );
}
