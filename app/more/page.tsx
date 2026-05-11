import Link from "next/link";
import { BarChart3, Repeat2, Sparkles } from "lucide-react";

import { PageHeader } from "@/src/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const secondaryLinks = [
  {
    href: "/habits",
    label: "Abitudini",
    description: "Gestisci le spese che tornano spesso.",
    icon: Repeat2,
  },
  {
    href: "/reports/monthly",
    label: "Report mensile",
    description: "Leggi il riepilogo del mese selezionato.",
    icon: BarChart3,
  },
  {
    href: "/presets",
    label: "Preset rapidi",
    description: "Riapri e riusa le spese più frequenti.",
    icon: Sparkles,
  },
] as const;

export default function MorePage() {
  return (
    <main className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Menu"
        title="Altro"
        description="Scorciatoie per le sezioni meno usate ma sempre disponibili."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {secondaryLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.href} className="border-zinc-200/80 shadow-sm">
              <CardHeader className="space-y-3 p-5 pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-base">{item.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-5 pt-3">
                <p className="text-sm leading-6 text-zinc-600">{item.description}</p>
                <Button asChild className="w-full sm:w-auto">
                  <Link href={item.href}>Apri</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
