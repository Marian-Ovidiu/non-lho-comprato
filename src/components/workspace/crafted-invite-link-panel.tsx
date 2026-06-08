"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Share2 } from "lucide-react";

import { Label, Mono } from "@/components/crafted";
import { cn } from "@/lib/utils";

type CraftedInviteLinkPanelProps = {
  inviteUrl: string;
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
};

export function CraftedInviteLinkPanel({
  inviteUrl,
  onReset,
  resetLabel = "Genera nuovo link",
  className,
}: CraftedInviteLinkPanelProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  async function shareLink() {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: "Unisciti al workspace", url: inviteUrl });
    } catch {
      // user cancelled
    }
  }

  return (
    <div className={cn("space-y-4", className)} aria-live="polite">
      <div className="border-y border-line py-3">
        <Label className="mb-2 block">Link pronto</Label>
        <Mono className="block break-all text-[12px] leading-5 text-foreground">
          {inviteUrl}
        </Mono>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="flex h-11 flex-1 items-center justify-center gap-2 border border-line text-[14px] font-semibold text-foreground transition-opacity hover:opacity-80"
        >
          {copied ? (
            <Check className="size-4 text-accent" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? "Copiato" : "Copia"}
        </button>
        {typeof navigator !== "undefined" && "share" in navigator ? (
          <button
            type="button"
            onClick={shareLink}
            className="flex h-11 flex-1 items-center justify-center gap-2 border border-line text-[14px] font-semibold text-foreground transition-opacity hover:opacity-80"
          >
            <Share2 className="size-4" aria-hidden="true" />
            Condividi
          </button>
        ) : null}
      </div>
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="w-full py-2 text-sm text-ink-3 underline-offset-4 hover:underline"
        >
          {resetLabel}
        </button>
      ) : null}
    </div>
  );
}

type CraftedInviteGenerateButtonProps = {
  pending: boolean;
  label?: string;
  pendingLabel?: string;
  onClick: () => void;
  className?: string;
};

export function CraftedInviteGenerateButton({
  pending,
  label = "Genera link invito",
  pendingLabel = "Generazione...",
  onClick,
  className,
}: CraftedInviteGenerateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        "flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-bold text-accent-foreground transition-opacity disabled:opacity-60",
        className,
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {pending ? pendingLabel : label}
    </button>
  );
}
