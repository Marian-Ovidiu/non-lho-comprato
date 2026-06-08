"use client";

import { Label } from "@/components/crafted";
import { AiAnalysisExportCard } from "@/src/components/more/ai-analysis-export-card-lazy";
import { PwaInstallContent } from "@/src/components/pwa/install-content-lazy";
import { ThemeSelector } from "@/src/components/theme/theme-selector-lazy";
import { GenerateInviteButton } from "@/src/components/workspace/generate-invite-button-lazy";
import { JoinWorkspaceForm } from "@/src/components/workspace/join-workspace-form-lazy";

export function CraftedMoreWorkspaceTools() {
  return (
    <div className="space-y-5">
      <div>
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
      <div className="py-4">
        <Label className="mb-3 block">Installa app</Label>
        <PwaInstallContent />
      </div>
      <div className="py-4">
        <Label className="mb-3 block">Export AI</Label>
        <AiAnalysisExportCard />
      </div>
    </div>
  );
}
