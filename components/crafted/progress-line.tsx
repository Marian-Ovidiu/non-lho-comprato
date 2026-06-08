import { cn } from "@/lib/utils";

type ProgressLineProps = {
  value: number;
  thick?: boolean;
  className?: string;
};

export function ProgressLine({ value, thick = false, className }: ProgressLineProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "relative w-full bg-line",
        thick ? "h-1" : "h-0.5",
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="absolute inset-y-0 left-0 bg-accent"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
