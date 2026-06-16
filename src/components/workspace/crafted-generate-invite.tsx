"use client";

import { useState } from "react";

import { generateOpenInviteAction } from "@/src/actions/workspace";
import { useTranslations } from "@/src/components/language/language-context";
import {
  CraftedInviteGenerateButton,
  CraftedInviteLinkPanel,
} from "@/src/components/workspace/crafted-invite-link-panel";

export function CraftedGenerateInvite() {
  const t = useTranslations();
  const [pending, setPending] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setPending(true);
    setError(null);
    const result = await generateOpenInviteAction();
    setPending(false);
    if (result.success && result.inviteUrl) {
      setInviteUrl(result.inviteUrl);
      if (navigator.share) {
        try {
          await navigator.share({ title: t.workspace.inviteShareTitle, url: result.inviteUrl });
        } catch {
          // user cancelled
        }
      } else if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(result.inviteUrl);
        } catch {
          // Some browsers deny clipboard writes outside an explicit permission grant.
        }
      }
    } else {
      setError(result.message);
    }
  }

  if (inviteUrl) {
    return (
      <CraftedInviteLinkPanel
        inviteUrl={inviteUrl}
        onReset={() => {
          setInviteUrl(null);
          setError(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <CraftedInviteGenerateButton pending={pending} onClick={handleGenerate} />
    </div>
  );
}
