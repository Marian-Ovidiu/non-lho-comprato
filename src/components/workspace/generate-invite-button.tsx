"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Share2 } from "lucide-react";

import { generateOpenInviteAction } from "@/src/actions/workspace";
import { Button } from "@/components/ui/button";

export function GenerateInviteButton() {
  const [pending, setPending] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setPending(true);
    setError(null);
    const result = await generateOpenInviteAction();
    setPending(false);
    if (result.success && result.inviteUrl) {
      setInviteUrl(result.inviteUrl);
      // auto-share or copy on mobile
      if (navigator.share) {
        try {
          await navigator.share({ title: "Unisciti al workspace", url: result.inviteUrl });
        } catch {
          // user cancelled
        }
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.inviteUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }
    } else {
      setError(result.message);
    }
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  async function shareLink() {
    if (!inviteUrl || !navigator.share) return;
    try {
      await navigator.share({ title: "Unisciti al workspace", url: inviteUrl });
    } catch {
      // user cancelled
    }
  }

  if (inviteUrl) {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-muted px-4 py-3">
          <p className="break-all font-num text-[12px] text-foreground">{inviteUrl}</p>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 rounded-2xl px-4"
            onClick={copyLink}
          >
            {copied ? <Check className="mr-1.5 size-3.5 text-accent" aria-hidden="true" /> : <Copy className="mr-1.5 size-3.5" aria-hidden="true" />}
            {copied ? "Copiato" : "Copia link"}
          </Button>
          {typeof navigator !== "undefined" && navigator.share ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 rounded-2xl px-4"
              onClick={shareLink}
            >
              <Share2 className="mr-1.5 size-3.5" aria-hidden="true" />
              Condividi
            </Button>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-9 w-full rounded-2xl text-sm text-muted-foreground"
          onClick={() => { setInviteUrl(null); setError(null); }}
        >
          Genera nuovo link
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="button"
        className="h-10 w-full rounded-2xl px-4"
        onClick={handleGenerate}
        disabled={pending}
      >
        {pending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" /> : null}
        {pending ? "Generazione..." : "Genera link invito"}
      </Button>
    </div>
  );
}
