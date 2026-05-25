import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { EmptyState } from "@/src/components/shared/empty-state";

const presets = [
  { emoji: "☕", name: "Caffè al bar", hint: "~4€", href: "/entries/new?title=Caff%C3%A8+al+bar&alternativeCost=4" },
  { emoji: "🥡", name: "Cena a domicilio", hint: "~18€", href: "/entries/new?title=Cena+a+domicilio&alternativeCost=18" },
  { emoji: "🛍️", name: "Acquisto compulsivo", hint: "tu decidi", href: "/entries/new" },
] as const;

type DashboardEmptyStateProps = {
  description?: string;
  actionLabel?: string;
};

export function DashboardEmptyState({
  description = "Bastano pochi secondi. Il quadro prende forma dal primo segnale.",
  actionLabel = "Aggiungi il primo movimento",
}: DashboardEmptyStateProps = {}) {
  return (
    <div className="space-y-5">
      <EmptyState
        title="La prossima volta che eviti un acquisto, registralo qui."
        description={description}
        actionLabel={actionLabel}
        actionHref="/entries/new"
        accent
        markSize={108}
      />

      <div className="space-y-2.5">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Inizia da qui
        </p>
        <div className="flex flex-col gap-2">
          {presets.map((p) => (
            <Link
              key={p.name}
              href={p.href}
              className="flex items-center gap-3 overflow-hidden rounded-[14px] border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-muted"
            >
              <div
                className="flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted"
                style={{ width: 36, height: 36, fontSize: 18 }}
              >
                {p.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{p.name}</p>
                <p className="font-num text-[11px]" style={{ color: "var(--text-3)" }}>
                  {p.hint}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
