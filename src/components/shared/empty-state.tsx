import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

function EmptyMark({ size = 88, accent = false }: { size?: number; accent?: boolean }) {
  const color = accent ? "var(--accent)" : "var(--text-3)";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <rect
        x="6" y="6" width="88" height="88" rx="22"
        stroke={color} strokeWidth="1.6" strokeDasharray="3 5" opacity="0.6"
      />
      <path
        d="M32 32 L68 68 M68 32 L32 68"
        stroke={color} strokeWidth="2" strokeLinecap="round"
      />
      {accent ? (
        <circle cx="78" cy="22" r="6" fill="var(--warm)" opacity="0.9" />
      ) : null}
    </svg>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  action?: ReactNode;
  icon?: ReactNode;
  note?: string;
  accent?: boolean;
  markSize?: number;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  action,
  icon,
  note,
  accent = false,
  markSize = 88,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-5 px-4 py-10 text-center">
      <div className="opacity-85">
        {icon ?? <EmptyMark size={markSize} accent={accent} />}
      </div>

      <div className="space-y-2">
        <p className="font-serif italic text-[22px] leading-[1.3] text-foreground">
          {title}
        </p>
        <p className="mx-auto max-w-[280px] text-[13px] leading-[1.55] text-muted-foreground">
          {description}
        </p>
        {note ? (
          <p className="mx-auto max-w-[280px] text-[12px]" style={{ color: "var(--text-3)" }}>
            {note}
          </p>
        ) : null}
      </div>

      {action ? (
        <div className="mt-2">{action}</div>
      ) : actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-2 inline-flex h-[52px] items-center gap-2 rounded-[18px] bg-accent px-[22px] text-[15px] font-bold text-accent-foreground transition-[opacity,transform] duration-150 active:scale-[0.98] active:opacity-90"
        >
          {actionLabel}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
