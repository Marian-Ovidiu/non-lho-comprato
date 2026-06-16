export const DEFAULT_WORKSPACE_LANGUAGE = "en";

export type SupportedLanguage = {
  code: string;
  name: string;
  nativeName: string;
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "en", name: "English", nativeName: "English" },
];

export function isSupportedLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}
