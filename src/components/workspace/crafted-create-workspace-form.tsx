"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { Label as CraftedLabel } from "@/components/crafted";
import { useTranslations } from "@/src/components/language/language-context";
import { createWorkspaceAction, generateOpenInviteAction } from "@/src/actions/workspace";
import {
  CraftedInviteGenerateButton,
  CraftedInviteLinkPanel,
} from "@/src/components/workspace/crafted-invite-link-panel";
import { cn } from "@/lib/utils";

type CreateState = {
  success: boolean;
  message: string;
  workspaceId?: string;
};

const initialState: CreateState = { success: false, message: "" };

export function CraftedCreateWorkspaceForm() {
  const t = useTranslations();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (_prev: CreateState, formData: FormData) => createWorkspaceAction(formData),
    initialState,
  );
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [invitePending, setInvitePending] = useState(false);
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

  if (state.success && state.workspaceId) {
    return (
      <div className="space-y-5">
        <div className="border border-green/30 px-4 py-3 text-sm text-green" role="status">
          <span className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold">{t.workspace.wsCreatedMessage}</span>{" "}
              {t.workspace.wsCreatedInviteHint}
            </span>
          </span>
        </div>

        {inviteUrl ? (
          <CraftedInviteLinkPanel inviteUrl={inviteUrl} />
        ) : (
          <CraftedInviteGenerateButton pending={invitePending} onClick={handleGenerateLink} />
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="border-y border-line py-3">
        <div className="flex items-center justify-between gap-4">
          <input
            ref={nameRef}
            id="ws-name"
            name="name"
            type="text"
            required
            maxLength={80}
            placeholder={t.workspace.wsNamePlaceholder}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3/70"
          />
          <CraftedLabel>{t.workspace.wsNameLabel}</CraftedLabel>
        </div>
      </div>

      {state.message && !state.success ? (
        <p className="border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold transition-opacity disabled:opacity-60",
          pending ? "bg-line text-ink-3" : "bg-accent text-accent-foreground",
        )}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? t.workspace.wsCreatingButton : t.workspace.wsCreateButton}
      </button>
    </form>
  );
}
