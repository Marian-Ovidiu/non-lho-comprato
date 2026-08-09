"use client";

import { Label } from "@/components/crafted";
import { CurrencySelector } from "@/src/components/currency/currency-selector-lazy";
import { LanguageSelector } from "@/src/components/language/language-selector-lazy";
import { AiAnalysisExportCard } from "@/src/components/more/ai-analysis-export-card-lazy";
import { PwaInstallSection } from "@/src/components/pwa/install-content-lazy";
import { ThemeSelector } from "@/src/components/theme/theme-selector-lazy";
import { GenerateInviteButton } from "@/src/components/workspace/generate-invite-button-lazy";
import { JoinWorkspaceForm } from "@/src/components/workspace/join-workspace-form-lazy";
import { useTranslations } from "@/src/components/language/language-context";

function MoreTool({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-4">
      <Label className="mb-3 block text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function CraftedMoreWorkspaceAccessTools() {
  const t = useTranslations();

  return (
    <>
      <MoreTool label={t.more.inviteLabel}>
        <GenerateInviteButton />
      </MoreTool>
      <MoreTool label={t.more.joinLabel}>
        <JoinWorkspaceForm />
      </MoreTool>
    </>
  );
}

export function CraftedMoreWorkspacePreferences() {
  const t = useTranslations();

  return (
    <>
      <MoreTool label={t.workspace.currencyAriaLabel}>
        <div className="rounded-[var(--r-control)] bg-surface-muted px-3.5">
          <CurrencySelector />
        </div>
      </MoreTool>
      <MoreTool label={t.workspace.languageAriaLabel}>
        <LanguageSelector />
      </MoreTool>
    </>
  );
}

export function CraftedMoreAppPreferences() {
  const t = useTranslations();

  return (
    <>
      <MoreTool label={t.more.themeLabel}>
        <ThemeSelector variant="crafted" />
      </MoreTool>
      <PwaInstallSection />
    </>
  );
}

export function CraftedMoreAnalysisExport() {
  return <AiAnalysisExportCard />;
}
