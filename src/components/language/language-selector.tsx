"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateWorkspaceLanguageAction } from "@/src/actions/workspace";
import { SUPPORTED_LANGUAGES } from "@/src/lib/workspace-language";
import { useTranslations, useWorkspaceLanguage } from "@/src/components/language/language-context";
import { cn } from "@/lib/utils";

export function LanguageSelector() {
  const t = useTranslations();
  const currentCode = useWorkspaceLanguage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(code: string) {
    if (code === currentCode) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("language", code);
      await updateWorkspaceLanguageAction(formData);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div role="group" aria-label={t.workspace.languageAriaLabel} className="flex gap-5">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const active = lang.code === currentCode;
          return (
            <button
              key={lang.code}
              type="button"
              disabled={pending}
              onClick={() => handleChange(lang.code)}
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
      <p className="text-xs text-ink-3">
        {SUPPORTED_LANGUAGES.find((l) => l.code === currentCode)?.name ?? currentCode}
      </p>
    </div>
  );
}
