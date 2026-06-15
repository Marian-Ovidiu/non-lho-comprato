"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { completeWorkspaceSetupAction } from "@/src/actions/workspace";
import { SUPPORTED_CURRENCIES } from "@/src/lib/workspace-currency";
import { SUPPORTED_LANGUAGES } from "@/src/lib/workspace-language";
import { SUPPORTED_TIMEZONES, isSupportedTimezone } from "@/src/lib/workspace-timezone";
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/src/lib/theme";
import { cn } from "@/lib/utils";

type SetupWizardProps = {
  defaultTimezone: string;
  defaultCurrency: string;
  defaultLanguage: string;
};

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: "dark", label: "Scuro" },
  { value: "light", label: "Chiaro" },
  { value: "system", label: "Sistema" },
];

function buildTimezoneOptions(detectedTimezone: string | null) {
  const options = [...SUPPORTED_TIMEZONES];
  if (detectedTimezone && !isSupportedTimezone(detectedTimezone)) {
    options.unshift({ value: detectedTimezone, label: detectedTimezone, group: "Rilevato" });
  }
  return options;
}

function groupTimezones(options: ReturnType<typeof buildTimezoneOptions>) {
  const groups = new Map<string, typeof options>();
  for (const tz of options) {
    const group = groups.get(tz.group) ?? [];
    group.push(tz);
    groups.set(tz.group, group);
  }
  return groups;
}

export function SetupWizard({ defaultTimezone, defaultCurrency, defaultLanguage }: SetupWizardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [timezone, setTimezone] = useState(defaultTimezone);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [language, setLanguage] = useState(defaultLanguage);
  const [theme, setTheme] = useState<ThemePreference>(() => readThemePreference());

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch {
      // ignore if Intl not available
    }
  }, []);

  useEffect(() => {
    applyTheme(resolveTheme(theme));
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const timezoneOptions = buildTimezoneOptions(timezone);
  const groupedTimezones = groupTimezones(timezoneOptions);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("timezone", timezone);
      formData.set("currency", currency);
      formData.set("language", language);

      const result = await completeWorkspaceSetupAction(formData);

      if (!result.success) {
        setError(result.message);
        return;
      }

      router.push("/?welcome=1");
    });
  }

  function handleSkip() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("timezone", defaultTimezone);
      formData.set("currency", defaultCurrency);
      formData.set("language", defaultLanguage);
      await completeWorkspaceSetupAction(formData);
      router.push("/");
    });
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-background">
      <div className="flex min-h-full flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm space-y-8">

          <div className="space-y-2 text-center">
            <p className="text-[13px] font-[450] tracking-widest text-ink-3 uppercase">
              Non l&apos;ho comprato
            </p>
            <h1 className="font-serif text-[1.6rem] leading-snug text-foreground">
              Prima di iniziare
            </h1>
            <p className="text-sm text-muted-text">
              Personalizza il tuo workspace. Puoi cambiare tutto in seguito.
            </p>
          </div>

          <div className="divide-y divide-line-soft border-y border-line">

            {/* Timezone */}
            <div className="py-4">
              <p className="mb-2 text-[13px] font-medium text-ink-3">Fuso orario</p>
              <div className="rounded-xl border border-line px-3 py-2.5">
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={pending}
                  aria-label="Fuso orario"
                  className="w-full bg-transparent text-[15px] text-foreground outline-none disabled:opacity-50"
                >
                  {[...groupedTimezones.entries()].map(([group, zones]) => (
                    <optgroup key={group} label={group}>
                      {zones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {/* Currency */}
            <div className="py-4">
              <p className="mb-2 text-[13px] font-medium text-ink-3">Valuta</p>
              <div className="rounded-xl border border-line px-3 py-2.5">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={pending}
                  aria-label="Valuta"
                  className="w-full bg-transparent text-[15px] text-foreground outline-none disabled:opacity-50"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language */}
            <div className="py-4">
              <p className="mb-3 text-[13px] font-medium text-ink-3">Lingua categorie</p>
              <div role="group" aria-label="Lingua" className="flex gap-5">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const active = lang.code === language;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      disabled={pending}
                      onClick={() => setLanguage(lang.code)}
                      aria-pressed={active}
                      className={cn(
                        "border-b-[1.5px] pb-2 text-[13px] transition-colors disabled:opacity-50",
                        active
                          ? "border-accent font-semibold text-foreground"
                          : "border-transparent font-[450] text-ink-3 hover:text-foreground",
                      )}
                    >
                      {lang.nativeName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme */}
            <div className="py-4">
              <p className="mb-3 text-[13px] font-medium text-ink-3">Tema</p>
              <div role="group" aria-label="Tema" className="flex gap-5">
                {THEME_OPTIONS.map((option) => {
                  const active = option.value === theme;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      aria-pressed={active}
                      className={cn(
                        "border-b-[1.5px] pb-2 text-[13px] transition-colors",
                        active
                          ? "border-accent font-semibold text-foreground"
                          : "border-transparent font-[450] text-ink-3 hover:text-foreground",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="space-y-3">
            {error ? (
              <p className="text-center text-sm text-destructive">{error}</p>
            ) : null}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              className="w-full rounded-2xl bg-accent py-3.5 text-[15px] font-semibold text-background transition-opacity disabled:opacity-60"
            >
              {pending ? "Salvo..." : "Inizia →"}
            </button>

            <button
              type="button"
              onClick={handleSkip}
              disabled={pending}
              className="w-full py-2 text-sm text-ink-3 transition-colors hover:text-foreground disabled:opacity-50"
            >
              Salta per ora
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
