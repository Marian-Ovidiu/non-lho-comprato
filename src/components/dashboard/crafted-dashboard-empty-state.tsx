import Link from "next/link";
import { Plus } from "lucide-react";

import { CraftedIcon, Serif } from "@/components/crafted";

type CraftedDashboardEmptyStateProps = {
  title: string;
  description: string;
  note: string;
  actionLabel: string;
  actionHref?: string;
};

export function CraftedDashboardEmptyState({
  title,
  description,
  note,
  actionLabel,
  actionHref = "/entries/new",
}: CraftedDashboardEmptyStateProps) {
  return (
    <section className="space-y-6 px-5 pb-8 pt-2 text-center">
      <CraftedIcon name="flame" size={36} className="mx-auto text-accent" aria-hidden="true" />
      <div className="space-y-3">
        <Serif className="text-[22px] leading-snug text-muted-foreground">{title}</Serif>
        <p className="mx-auto max-w-sm text-sm leading-6 text-ink-3">{description}</p>
        <p className="text-xs text-ink-3">{note}</p>
      </div>
      <Link
        href={actionHref}
        className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15.5px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
      >
        {actionLabel}
        <Plus className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
