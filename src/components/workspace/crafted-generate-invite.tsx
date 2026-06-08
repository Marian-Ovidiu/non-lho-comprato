"use client";

import { useState } from "react";

import { generateOpenInviteAction } from "@/src/actions/workspace";
import {
  CraftedInviteGenerateButton,
  CraftedInviteLinkPanel,
} from "@/src/components/workspace/crafted-invite-link-panel";

export function CraftedGenerateInvite() {
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
          await navigator.share({ title: "Unisciti al workspace", url: result.inviteUrl });
        } catch {
          // user cancelled
        }
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.inviteUrl);
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
