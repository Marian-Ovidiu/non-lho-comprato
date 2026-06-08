import { cn } from "@/lib/utils";

import { Label } from "./label";
import { Mono } from "./mono";

export type StatTrioItem = {
  label: string;
  value: React.ReactNode;
  suffix?: string;
};

type StatTrioProps = {
  items: StatTrioItem[];
  className?: string;
};

export function StatTrio({ items, className }: StatTrioProps) {
  return (
    <div className={cn("flex border-y border-line", className)}>
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "min-w-0 flex-1 px-5 py-3.5",
            index < items.length - 1 && "border-r border-line",
          )}
        >
          <Label className="mb-2 block">{item.label}</Label>
          <Mono className="text-[21px] font-medium leading-none">
            {item.value}
            {item.suffix ? (
              <span className="text-xs text-ink-3">{item.suffix}</span>
            ) : null}
          </Mono>
        </div>
      ))}
    </div>
  );
}
