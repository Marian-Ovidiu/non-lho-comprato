import type { Translations } from "./types";
import { it } from "./it";
import { en } from "./en";

const dictionaries: Record<string, Translations> = { it, en };

export function getTranslations(language: string): Translations {
  return dictionaries[language] ?? it;
}

export function languageToLocale(language: string): string {
  const locales: Record<string, string> = {
    it: "it-IT",
    en: "en-GB",
  };
  return locales[language] ?? "it-IT";
}

export type { Translations };
