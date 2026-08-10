import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { CraftedIcon, Eyebrow, type CraftedIconName } from "@/components/crafted";
import { cn } from "@/lib/utils";

type CraftedMoreRowProps = {
  href?: string;
  label: string;
  detail?: string;
  icon: CraftedIconName;
  /** Voce annunciata ma non ancora aperta: si vede, non si tocca. */
  comingSoon?: string;
  children?: React.ReactNode;
};

export function CraftedMoreRow({
  href,
  label,
  detail,
  icon,
  comingSoon,
  children,
}: CraftedMoreRowProps) {
  const content = (
    <>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground",
          comingSoon && "opacity-60",
        )}
      >
        <CraftedIcon name={icon} size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "text-[15px] font-medium leading-5 tracking-[-0.01em]",
              comingSoon && "text-muted-foreground",
            )}
          >
            {label}
          </p>
          {comingSoon ? (
            <span className="rounded-[var(--r-chip)] border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-ink-3">
              {comingSoon}
            </span>
          ) : null}
        </div>
        {detail ? (
          <p className="mt-0.5 text-[12px] leading-[17px] text-muted-foreground">
            {detail}
          </p>
        ) : null}
        {children}
      </div>
      {href ? (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="nlc-press -mx-2 flex min-h-16 items-center gap-3 px-2 py-2.5 outline-none transition-colors hover:bg-surface-muted/45 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex min-h-16 items-center gap-3 py-2.5">{content}</div>;
}

type CraftedMoreSectionProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function CraftedMoreSection({ title, children, className }: CraftedMoreSectionProps) {
  return (
    <section className={cn("px-[var(--sp-page-x)] pt-7", className)}>
      <h2>
        <Eyebrow>{title}</Eyebrow>
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
