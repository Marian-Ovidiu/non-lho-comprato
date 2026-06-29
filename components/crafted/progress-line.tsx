import { cn } from "@/lib/utils";

type ProgressLineProps = {
  value: number;
  thick?: boolean;
  className?: string;
  indicatorClassName?: string;
  animate?: boolean;
};

export function ProgressLine({
  value,
  thick = false,
  className,
  indicatorClassName,
  animate = true,
}: ProgressLineProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-line",
        thick ? "h-1" : "h-[3px]",
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 bg-accent motion-reduce:transform-none",
          animate && "nlc-grow-x",
          indicatorClassName,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
