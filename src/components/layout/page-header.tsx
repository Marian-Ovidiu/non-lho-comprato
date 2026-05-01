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
    <section className="rounded-3xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50/70 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
            {eyebrow}
          </p>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
              {description}
            </p>
          </div>
        </div>

        {action ? <div className="sm:shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}
