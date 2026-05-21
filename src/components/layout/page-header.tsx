import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { spacing } from "@/src/lib/spacing";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  context?: string;
  action?: ReactNode;
  backHref?: string;
  chips?: Array<{
    label: string;
    tone?: "default" | "success" | "premium";
  }>;
};

export function PageHeader({
  eyebrow,
  title,
  context,
  action,
  backHref,
  chips,
}: PageHeaderProps) {
  return (
    <section className={spacing.headerShell}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-0.5">
            {eyebrow ? (
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-text">
                {eyebrow}
              </p>
            ) : null}
            {backHref ? (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-[1.2rem] font-semibold tracking-tight text-foreground transition-colors hover:text-foreground/90 sm:text-[1.35rem]"
              >
                <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
                <span>{title}</span>
              </Link>
            ) : (
              <h1 className="text-[1.2rem] font-semibold tracking-tight text-foreground sm:text-[1.35rem]">
                {title}
              </h1>
            )}
            {context ? (
              <p className="max-w-2xl text-sm leading-5 text-muted-text">
                {context}
              </p>
            ) : null}
          </div>

          {action ? <div className="sm:shrink-0">{action}</div> : null}
        </div>

        {chips && chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span
                key={chip.label}
                className={
                  chip.tone === "success"
                    ? "inline-flex items-center rounded-full border border-success/20 bg-success-bg px-3 py-1 text-xs font-medium text-success"
                    : chip.tone === "premium"
                      ? "inline-flex items-center rounded-full border border-premium-accent/30 bg-premium-accent/10 px-3 py-1 text-xs font-medium text-premium-accent"
                      : "inline-flex items-center rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-medium text-muted-text"
                }
              >
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
