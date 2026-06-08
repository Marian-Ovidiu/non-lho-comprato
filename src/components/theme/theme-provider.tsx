"use client";

import { useEffect, useLayoutEffect } from "react";

import {
  applyStoredTheme,
  applyTheme,
  getSystemTheme,
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/src/lib/theme";

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  useLayoutEffect(() => {
    applyStoredTheme();
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key !== THEME_STORAGE_KEY ||
        (event.newValue !== "light" &&
          event.newValue !== "dark" &&
          event.newValue !== "system")
      ) {
        return;
      }

      applyTheme(resolveTheme(event.newValue as ThemePreference));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (readThemePreference() === "system") {
        applyTheme(getSystemTheme());
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return children;
}
