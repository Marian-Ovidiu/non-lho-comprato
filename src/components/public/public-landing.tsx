"use client";

import { Target, TrendingUp, Users } from "lucide-react";

import { LoginPanel } from "@/src/components/auth/login-panel";
import { PwaInstallContent } from "@/src/components/pwa/install-button";

const landingBenefits = [
  {
    icon: TrendingUp,
    title: "Vedi quanto risparmi davvero",
    description: "Ogni rinuncia tracciata diventa un numero chiaro, non una sensazione.",
  },
  {
    icon: Users,
    title: "Condividi le spese in coppia",
    description: "Tieni allineato il quadro comune senza perdere il dettaglio dei singoli movimenti.",
  },
  {
    icon: Target,
    title: "Resta vicino ai tuoi obiettivi",
    description: "Trasforma il risparmio in un traguardo leggibile e semplice da seguire.",
  },
] as const;

export function PublicLanding() {
  return (
    <main className="space-y-8 sm:space-y-10">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-start">
        <div className="space-y-6">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-text">
            Non l&apos;ho comprato
          </p>

          <div className="space-y-4">
            <h1 className="max-w-2xl font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Scopri quanto risparmi davvero.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-text sm:text-base">
              Ogni caffè evitato, delivery saltata o spesa intelligente diventa
              risparmio visibile.
            </p>
          </div>

          <div className="grid gap-3 sm:max-w-2xl sm:grid-cols-[minmax(0,1.05fr)_minmax(16rem,0.95fr)]">
            <LoginPanel compact providers={["google"]} />

            <div className="rounded-2xl border border-border/80 bg-surface/70 p-4 shadow-sm">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-text">
                  PWA
                </p>
                <p className="text-sm leading-6 text-foreground">
                  Aggiungi l&apos;app alla schermata Home per aprirla in un
                  gesto.
                </p>
              </div>

              <div className="mt-3">
                <PwaInstallContent />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border/80 bg-surface/70 p-5 shadow-sm">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-text">
              In pratica
            </p>
            <p className="text-sm leading-6 text-foreground">
              Uno spazio pulito per vedere cosa hai evitato, cosa hai condiviso
              e dove stai andando.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-text">
          Tre cose subito chiare
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {landingBenefits.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-border/80 bg-surface/60 p-4 shadow-sm"
            >
              <Icon className="size-4 text-muted-text" aria-hidden="true" />
              <h2 className="mt-3 text-sm font-medium text-foreground">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-text">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
