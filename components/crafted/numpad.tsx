"use client";

import { CraftedIcon, Mono } from "@/components/crafted";
import { cn } from "@/lib/utils";

const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "del"] as const;

type CraftedNumpadProps = {
  onKey: (key: string) => void;
};

export function CraftedNumpad({ onKey }: CraftedNumpadProps) {
  return (
    <div className="grid grid-cols-3">
      {NUMPAD_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onKey(key === "del" ? "⌫" : key)}
          className={cn(
            "flex h-[50px] items-center justify-center transition-opacity active:opacity-60",
            key === "del" ? "text-muted-foreground" : "text-foreground",
          )}
          aria-label={key === "del" ? "Cancella" : key}
        >
          {key === "del" ? (
            <CraftedIcon name="del" size={22} className="text-muted-foreground" />
          ) : (
            <Mono className="text-[25px] font-medium">{key}</Mono>
          )}
        </button>
      ))}
    </div>
  );
}
