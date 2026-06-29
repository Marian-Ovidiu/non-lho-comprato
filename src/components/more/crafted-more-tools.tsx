"use client";

import { Label } from "@/components/crafted";
import { CurrencySelector } from "@/src/components/currency/currency-selector-lazy";
import { LanguageSelector } from "@/src/components/language/language-selector-lazy";
import { AiAnalysisExportCard } from "@/src/components/more/ai-analysis-export-card-lazy";
import { CraftedMoreRow } from "@/src/components/more/crafted-more-row";
import { PwaInstallSection } from "@/src/components/pwa/install-content-lazy";
import { ThemeSelector } from "@/src/components/theme/theme-selector-lazy";
import { GenerateInviteButton } from "@/src/components/workspace/generate-invite-button-lazy";
import { JoinWorkspaceForm } from "@/src/components/workspace/join-workspace-form-lazy";
import { useTranslations } from "@/src/components/language/language-context";

export function CraftedMoreWorkspaceTools() {
  const t = useTranslations();
  return (
    <>
      <div className="py-4">
        <Label className="mb-1.5 block">Valuta</Label>
        <div className="mt-2 rounded-xl border border-line px-3 py-2.5">
          <CurrencySelector />
        </div>
      </div>
      <div className="py-4">
        <Label className="mb-3 block">{t.workspace.languageAriaLabel}</Label>
        <LanguageSelector />
      </div>
      <div className="py-4">
        <Label className="mb-3 block">Invita</Label>
        <GenerateInviteButton />
      </div>
      <div className="py-4">
        <Label className="mb-3 block">Unisciti</Label>
        <JoinWorkspaceForm />
      </div>
    </>
  );
}

export function CraftedMoreAppTools() {
  const t = useTranslations();

  return (
    <>
      <div className="py-4">
        <Label className="mb-3 block">Tema</Label>
        <ThemeSelector variant="crafted" />
      </div>
      <CraftedMoreRow
        href="/privacy"
        label={t.more.privacyLabel}
        detail={t.more.privacyDetail}
        icon="shield"
      />
      <PwaInstallSection />
      <div className="py-4">
        <Label className="mb-3 block">Export AI</Label>
        <AiAnalysisExportCard />
      </div>
    </>
  );
}
