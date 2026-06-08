import { cn } from "@/lib/utils";

type RuleProps = {
  soft?: boolean;
  fullBleed?: boolean;
  className?: string;
};

export function Rule({ soft = false, fullBleed = false, className }: RuleProps) {
  return (
    <div
      role="separator"
      aria-hidden="true"
      className={cn(
        "h-px shrink-0",
        soft ? "bg-line-soft" : "bg-line",
        fullBleed && "-mx-5",
        className,
      )}
    />
  );
}
