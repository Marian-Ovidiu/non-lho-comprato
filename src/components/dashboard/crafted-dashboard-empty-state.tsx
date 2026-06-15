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
    <div className="fixed inset-x-0 bottom-0 z-[39] border-t border-line bg-background px-[var(--sp-page-x)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-4 md:pb-6">
      <div className="mx-auto max-w-5xl space-y-3">
        <div>
          <Serif className="text-[17px] leading-snug text-foreground">{title}</Serif>
          <p className="mt-1 text-sm leading-5 text-ink-3">{description}</p>
        </div>
        <Link
          href={actionHref}
          className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[var(--r-cta)] bg-accent text-[15px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
        >
          {actionLabel}
          <Plus className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
