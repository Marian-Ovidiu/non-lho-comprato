import { cn } from "@/lib/utils";

type LabelProps = {
  children: React.ReactNode;
  className?: string;
};

export function Label({ children, className }: LabelProps) {
  return (
    <span
      className={cn(
        "font-num text-[10.5px] font-normal uppercase tracking-[0.14em] text-ink-3",
        className,
      )}
    >
      {children}
    </span>
  );
}
