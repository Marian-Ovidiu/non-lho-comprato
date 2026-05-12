"use client";

import Link from "next/link";
import { ExternalLink, Smartphone } from "lucide-react";

import { LoginPanel } from "@/src/components/auth/login-panel";
import { PwaInstallContent } from "@/src/components/pwa/install-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PublicLanding() {
  return (
    <main className="space-y-6 sm:space-y-8">
      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-text">
          Non l&apos;ho comprato
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Tieni fuori dal portafoglio le spese che non servono.
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-text sm:text-base">
          Accedi con Google per aprire il tuo workspace privato. Da browser puoi
          anche installare l&apos;app come PWA per un accesso piu rapido.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <LoginPanel providers={["google"]} />

        <Card className="border-border shadow-sm">
          <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-background">
                <Smartphone className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-base">Installa l&apos;app</CardTitle>
                <p className="text-sm leading-6 text-muted-text">
                  Aggiungi Non l&apos;ho comprato alla schermata Home.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-5 pt-4 sm:p-6 sm:pt-4">
            <PwaInstallContent />

            <Button asChild variant="outline" className="w-full rounded-2xl">
              <Link href="/login">
                <ExternalLink className="mr-2 size-4" aria-hidden="true" />
                Vai al login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
