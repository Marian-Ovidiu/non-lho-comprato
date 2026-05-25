"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { useState } from "react";

import { createWorkspaceAction, generateOpenInviteAction } from "@/src/actions/workspace";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CreateState = {
  success: boolean;
  message: string;
  workspaceId?: string;
};

const initialState: CreateState = { success: false, message: "" };

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (_prev: CreateState, formData: FormData) => createWorkspaceAction(formData),
    initialState,
  );
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [invitePending, setInvitePending] = useState(false);
  const [copied, setCopied] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success && state.workspaceId) {
      router.refresh();
    }
  }, [state.success, state.workspaceId, router]);

  async function handleGenerateLink() {
    setInvitePending(true);
    const result = await generateOpenInviteAction();
    setInvitePending(false);
    if (result.success && result.inviteUrl) {
      setInviteUrl(result.inviteUrl);
    }
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback: select the text
    }
  }

  async function shareLink() {
    if (!inviteUrl || !navigator.share) return;
    try {
      await navigator.share({ title: "Unisciti al workspace", url: inviteUrl });
    } catch {
      // user cancelled or not supported
    }
  }

  if (state.success && state.workspaceId) {
    return (
      <div className="space-y-4">
        <div className="rounded-[14px] border border-accent/20 bg-accent/8 p-5">
          <p className="text-[15px] font-semibold text-foreground">Workspace creato ✓</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Genera un link per invitare persone a unirsi.
          </p>
        </div>

        {inviteUrl ? (
          <div className="space-y-3 rounded-[14px] border border-border bg-surface p-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Link invito
            </p>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface-muted px-4 py-3">
              <p className="break-all font-num text-[12px] text-foreground">{inviteUrl}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] border border-border bg-surface text-[14px] font-semibold text-foreground transition-colors active:bg-surface-muted"
              >
                {copied ? <Check className="size-4 text-accent" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                {copied ? "Copiato" : "Copia"}
              </button>
              {typeof navigator !== "undefined" && navigator.share ? (
                <button
                  type="button"
                  onClick={shareLink}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] border border-border bg-surface text-[14px] font-semibold text-foreground transition-colors active:bg-surface-muted"
                >
                  <Share2 className="size-4" aria-hidden="true" />
                  Condividi
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGenerateLink}
            disabled={invitePending}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] bg-accent text-[15px] font-bold text-accent-foreground transition-[opacity,transform] duration-150 active:scale-[0.98] active:opacity-90 disabled:opacity-60"
          >
            {invitePending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {invitePending ? "Generazione..." : "Genera link invito"}
          </button>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-[14px] border border-border bg-surface p-4">
        <label
          htmlFor="ws-name"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
        >
          Nome workspace
        </label>
        <input
          ref={nameRef}
          id="ws-name"
          name="name"
          type="text"
          required
          maxLength={80}
          placeholder="es. Io e Luca"
          autoComplete="off"
          className="w-full bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground/40"
        />
      </div>

      {state.message && !state.success ? (
        <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] text-[15px] font-bold transition-[opacity,transform] duration-150 active:scale-[0.98] active:opacity-90",
          pending
            ? "bg-surface-muted text-muted-foreground"
            : "bg-accent text-accent-foreground",
        )}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? "Creazione..." : "Crea workspace"}
      </button>
    </form>
  );
}
