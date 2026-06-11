"use client";

import Link from "next/link";
import { useState } from "react";

import { Mono, Rule } from "@/components/crafted";
import {
  DEFAULT_QUICK_ADD_PRESETS,
  readHiddenDefaultPresetIds,
  writeHiddenDefaultPresetIds,
} from "@/src/lib/quick-add-presets";

function formatDefaultAmount(amount: number) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 2,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function CraftedDefaultPresetList() {
  const [hiddenIds, setHiddenIds] = useState<string[]>(() =>
    readHiddenDefaultPresetIds(),
  );

  function hideDefaultPreset(id: string) {
    setHiddenIds((current) => {
      const next = Array.from(new Set([...current, id]));
      writeHiddenDefaultPresetIds(next);
      return next;
    });
  }

  function restoreDefaultPreset(id: string) {
    setHiddenIds((current) => {
      const next = current.filter((item) => item !== id);
      writeHiddenDefaultPresetIds(next);
      return next;
    });
  }

  return (
    <div>
      {DEFAULT_QUICK_ADD_PRESETS.map((preset, index) => {
        const isHidden = hiddenIds.includes(preset.id);

        return (
          <div key={preset.id}>
            <div className="py-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-[450]">
                    <span aria-hidden="true">{preset.emoji}</span> {preset.title}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-3">
                    {preset.rangeLabel} · {isHidden ? "Nascosto dalla quick add" : "Visibile nella quick add"}
                  </p>
                </div>
                <Mono className="shrink-0 text-sm font-medium whitespace-nowrap">
                  {formatDefaultAmount(preset.amount)}€
                </Mono>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/presets?defaultPreset=${encodeURIComponent(preset.id)}`}
                  className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold"
                >
                  Modifica
                </Link>
                {isHidden ? (
                  <button
                    type="button"
                    onClick={() => restoreDefaultPreset(preset.id)}
                    className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold"
                  >
                    Ripristina
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => hideDefaultPreset(preset.id)}
                    className="text-[12px] text-destructive/70 hover:text-destructive"
                  >
                    Elimina
                  </button>
                )}
              </div>
            </div>
            {index < DEFAULT_QUICK_ADD_PRESETS.length - 1 ? <Rule soft /> : null}
          </div>
        );
      })}
    </div>
  );
}
