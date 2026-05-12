import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <section className="rounded-3xl border border-border bg-gradient-to-b from-surface to-surface-muted/70 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-text">
            {eyebrow}
          </p>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-text">
              {description}
            </p>
          </div>
        </div>

        {action ? <div className="sm:shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}
