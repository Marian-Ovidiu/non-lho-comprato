import { cn } from "@/lib/utils";

type SerifProps = {
  children: React.ReactNode;
  className?: string;
};

export function Serif({ children, className }: SerifProps) {
  return (
    <span className={cn("font-serif italic", className)}>{children}</span>
  );
}
