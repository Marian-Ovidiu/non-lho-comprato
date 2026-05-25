import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type ChipTone = "default" | "accent" | "success" | "warm" | "premium";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  serifWord?: string;
  context?: string;
  action?: ReactNode;
  backHref?: string;
  chips?: Array<{
    label: string;
    tone?: ChipTone;
  }>;
};

function chipClass(tone?: ChipTone): string {
  if (tone === "accent" || tone === "success") {
    return "inline-flex items-center rounded-full bg-accent px-[10px] py-[5px] text-xs font-medium text-accent-foreground";
  }
  if (tone === "warm" || tone === "premium") {
    return "inline-flex items-center rounded-full border border-warm/70 px-[10px] py-[5px] text-xs font-medium text-warm";
  }
  return "inline-flex items-center rounded-full border border-border-strong px-[10px] py-[5px] text-xs font-medium text-muted-foreground";
}

export function PageHeader({
  eyebrow,
  title,
  serifWord,
  context,
  action,
  backHref,
  chips,
}: PageHeaderProps) {
  const hasChips = chips && chips.length > 0;

  return (
    <section className="px-1 pb-1 pt-3">
      <div className="flex flex-col gap-2.5">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}

        <div className={`flex items-end gap-4${!hasChips && action ? " justify-between" : ""}`}>
          <div className="min-w-0">
            {backHref ? (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-[1.15rem] font-semibold tracking-tight text-foreground transition-colors hover:text-foreground/80"
              >
                <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
                <span>{title}</span>
                {serifWord ? (
                  <span className="font-serif font-normal italic text-muted-foreground">
                    {serifWord}
                  </span>
                ) : null}
              </Link>
            ) : (
              <h1 className="text-[2.25rem] font-bold leading-none tracking-[-0.025em] text-foreground">
                {title}
                {serifWord ? (
                  <span className="ml-2 font-normal font-serif italic text-muted-foreground">
                    {serifWord}
                  </span>
                ) : null}
              </h1>
            )}
            {context ? (
              <p className="mt-1.5 max-w-2xl text-sm leading-5 text-muted-foreground">
                {context}
              </p>
            ) : null}
          </div>

          {!hasChips && action ? (
            <div className="shrink-0">{action}</div>
          ) : null}
        </div>

        {hasChips ? (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <span key={chip.label} className={chipClass(chip.tone)}>
                {chip.label}
              </span>
            ))}
            {action ? <div className="ml-auto shrink-0">{action}</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
