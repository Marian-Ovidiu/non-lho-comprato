"use client";

import { useEffect, useMemo, useState } from "react";
import { Monitor, MoonStar, SunMedium } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  applyTheme,
  getSystemTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/src/lib/theme";

const options: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Monitor;
}> = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Chiaro", icon: SunMedium },
  { value: "dark", label: "Scuro", icon: MoonStar },
];

export function ThemeSelector() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") {
      return "system";
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
      ? storedTheme
      : "system";
  });
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() =>
    getSystemTheme(),
  );

  useEffect(() => {
    const resolvedTheme = resolveTheme(preference);
    applyTheme(resolvedTheme);
    if (window.localStorage.getItem(THEME_STORAGE_KEY) !== preference) {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  }, [preference]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === THEME_STORAGE_KEY &&
        (event.newValue === "light" ||
          event.newValue === "dark" ||
          event.newValue === "system")
      ) {
        const nextPreference = event.newValue as ThemePreference;
        setPreference((current) =>
          current === nextPreference ? current : nextPreference,
        );
        applyTheme(resolveTheme(event.newValue));
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (preference !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const nextTheme = media.matches ? "dark" : "light";
      setSystemTheme(nextTheme);
      applyTheme(nextTheme);
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value === preference)?.label ?? "Sistema";
  }, [preference]);

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label="Tema"
        className="grid grid-cols-3 rounded-2xl border border-border bg-surface p-1 shadow-sm"
      >
        {options.map((option) => {
          const Icon = option.icon;
          const active = preference === option.value;

          return (
            <Button
              key={option.value}
              type="button"
              variant={active ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-10 rounded-xl px-2 text-xs font-medium",
                active
                  ? "bg-accent text-background hover:bg-accent/90"
                  : "text-muted-text hover:text-foreground",
              )}
              onClick={() => setPreference(option.value)}
              aria-pressed={active}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              <span className="leading-none">{option.label}</span>
            </Button>
          );
        })}
      </div>

      <p className="text-xs leading-5 text-muted-text">
        Selezione attuale: {selectedLabel}
        {preference === "system"
          ? ` (${systemTheme === "dark" ? "Scuro" : "Chiaro"} di sistema)`
          : ""}
      </p>
    </div>
  );
}

export { ThemeSelector as ThemeToggle };
