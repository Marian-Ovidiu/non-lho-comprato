import Link from "next/link";
import { BarChart3, Layers3, PlusCircle, Repeat2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const actions = [
  {
    href: "/entries/new",
    title: "Nuovo movimento",
    description: "Registra una spesa evitata",
    icon: PlusCircle,
  },
  {
    href: "/presets",
    title: "Preset rapidi",
    description: "Riusa una spesa pronta",
    icon: Layers3,
  },
  {
    href: "/habits",
    title: "Abitudini",
    description: "Controlla le ricorrenze",
    icon: Repeat2,
  },
  {
    href: "/stats",
    title: "Statistiche",
    description: "Apri i grafici",
    icon: BarChart3,
  },
] as const;

export function DashboardQuickActions() {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Azioni rapide</h2>
        <p className="text-sm text-muted-text">
          Scorciatoie immediate per i passaggi che usi di più.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "group flex min-h-28 flex-col justify-between rounded-3xl border border-border bg-surface p-4 shadow-sm transition-colors",
                "hover:border-border/80 hover:bg-surface-muted active:translate-y-px",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
              aria-label={action.title}
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-background transition-colors group-hover:bg-foreground group-hover:text-background dark:bg-surface-muted dark:text-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </span>

              <span className="space-y-1">
                <span className="block text-sm font-semibold text-foreground">
                  {action.title}
                </span>
                <span className="block text-xs leading-5 text-muted-text">
                  {action.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
