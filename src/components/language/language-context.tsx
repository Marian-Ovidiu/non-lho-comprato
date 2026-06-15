"use client";

import { createContext, useContext } from "react";

import { getLocalizedCategoryName } from "@/src/lib/category-locale";
import { getTranslations, type Translations } from "@/src/lib/i18n";

const LanguageContext = createContext("it");

export function LanguageProvider({
  language,
  children,
}: {
  language: string;
  children: React.ReactNode;
}) {
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useWorkspaceLanguage(): string {
  return useContext(LanguageContext);
}

export function useTranslations(): Translations {
  const language = useWorkspaceLanguage();
  return getTranslations(language);
}

export function useLocalizedCategoryName(
  slug: string | null | undefined,
  fallback: string,
): string {
  const language = useWorkspaceLanguage();
  return getLocalizedCategoryName(slug, language) ?? fallback;
}
