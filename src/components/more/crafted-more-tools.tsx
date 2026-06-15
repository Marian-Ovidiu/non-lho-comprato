"use client";

import { Label } from "@/components/crafted";
import { CurrencySelector } from "@/src/components/currency/currency-selector-lazy";
import { AiAnalysisExportCard } from "@/src/components/more/ai-analysis-export-card-lazy";
import { PwaInstallSection } from "@/src/components/pwa/install-content-lazy";
import { ThemeSelector } from "@/src/components/theme/theme-selector-lazy";
import { GenerateInviteButton } from "@/src/components/workspace/generate-invite-button-lazy";
import { JoinWorkspaceForm } from "@/src/components/workspace/join-workspace-form-lazy";

export function CraftedMoreWorkspaceTools() {
  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-3 block">Valuta</Label>
        <CurrencySelector />
      </div>
      <div className="border-t border-line-soft pt-5">
        <Label className="mb-3 block">Invita</Label>
        <GenerateInviteButton />
      </div>
      <div className="border-t border-line-soft pt-5">
        <Label className="mb-3 block">Unisciti</Label>
        <JoinWorkspaceForm />
      </div>
    </div>
  );
}

export function CraftedMoreAppTools() {
  return (
    <div className="divide-y divide-line-soft border-y border-line">
      <div className="py-4">
        <Label className="mb-3 block">Tema</Label>
        <ThemeSelector variant="crafted" />
      </div>
      <PwaInstallSection />
      <div className="py-4">
        <Label className="mb-3 block">Export AI</Label>
        <AiAnalysisExportCard />
      </div>
    </div>
  );
}
