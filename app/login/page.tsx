import { redirect } from "next/navigation";

import { CraftedIcon } from "@/components/crafted";
import { LoginPanel } from "@/src/components/auth/login-panel";
import { TrustCopy } from "@/src/components/shared/trust-copy";
import { getAuthenticatedUser } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const authUser = await getAuthenticatedUser();

  if (authUser) {
    redirect("/");
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background px-6 pb-8 pt-10">
      <div className="flex items-center gap-2">
        <CraftedIcon name="flame" size={18} className="text-accent" />
        <span className="text-[13px] font-semibold tracking-[0.02em] text-muted-foreground">
          Non l&apos;ho comprato
        </span>
      </div>

      <div className="mb-8 mt-auto">
        <p className="mb-3.5 font-serif text-[18px] text-muted-foreground">
          traccia i soldi che
        </p>
        <h1 className="text-[clamp(3rem,14vw,4rem)] font-bold leading-[0.95] tracking-[-0.045em]">
          <span className="text-accent">non</span> hai
          <br />
          speso.
        </h1>
        <p className="mt-6 max-w-[280px] text-base leading-relaxed text-muted-foreground">
          Ogni volta che eviti un acquisto, lo registri qui. Vedi il quadro di quanto resta
          nel portafoglio.
        </p>
      </div>

      <LoginPanel compact providers={["google"]} />

      <div className="mt-6 flex justify-center gap-1.5" aria-hidden="true">
        <span className="size-1.5 rounded-full bg-accent/80" />
        <span className="size-1.5 rounded-full bg-accent/45" />
        <span className="size-1.5 rounded-full bg-accent/25" />
      </div>

      <TrustCopy className="mt-5 text-center text-[11px] tracking-[0.05em] text-ink-3" />
    </main>
  );
}
