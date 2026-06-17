import Link from "next/link";
import { Plus } from "lucide-react";

import { Serif } from "@/components/crafted";

type CraftedDashboardEmptyStateProps = {
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
};

export function CraftedDashboardEmptyState({
  title,
  description,
  actionLabel,
  actionHref = "/entries/new",
}: CraftedDashboardEmptyStateProps) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-[39] border-t border-line bg-background px-[var(--sp-page-x)] pb-3 pt-3 md:bottom-0 md:pb-5 md:pt-4">
      <div className="mx-auto max-w-5xl space-y-2.5">
        <div>
          <Serif className="text-[17px] leading-snug text-foreground">{title}</Serif>
          <p className="mt-1 text-sm leading-5 text-ink-3">{description}</p>
        </div>
        <Link
          href={actionHref}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--r-cta)] bg-accent text-[15px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
        >
          {actionLabel}
          <Plus className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
