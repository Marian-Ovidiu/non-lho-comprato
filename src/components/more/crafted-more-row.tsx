import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { CraftedIcon, type CraftedIconName } from "@/components/crafted";
import { cn } from "@/lib/utils";

type CraftedMoreRowProps = {
  href?: string;
  label: string;
  detail?: string;
  icon: CraftedIconName;
  external?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
};

export function CraftedMoreRow({
  href,
  label,
  detail,
  icon,
  children,
}: CraftedMoreRowProps) {
  const content = (
    <>
      <CraftedIcon name={icon} size={18} className="shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-[450]">{label}</p>
        {detail ? <p className="mt-0.5 text-xs text-ink-3">{detail}</p> : null}
        {children}
      </div>
      {href ? (
        <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3.5 py-3.5 transition-opacity hover:opacity-80"
      >
        {content}
      </Link>
    );
  }

  return <div className="py-3.5">{content}</div>;
}

type CraftedMoreSectionProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function CraftedMoreSection({ title, children, className }: CraftedMoreSectionProps) {
  return (
    <section className={cn("px-5", className)}>
      <p className="pb-1 pt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
        {title}
      </p>
      <div>{children}</div>
    </section>
  );
}
