"use client";

import { useActionState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { Label as CraftedLabel } from "@/components/crafted";
import { useTranslations } from "@/src/components/language/language-context";
import { joinByLinkAction } from "@/src/actions/workspace";

type JoinState = {
  success: boolean;
  message: string;
  workspaceName?: string;
};

const initialState: JoinState = { success: false, message: "" };

export function CraftedJoinWorkspaceForm() {
  const t = useTranslations();
  const router = useRouter();
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [state, formAction, pending] = useActionState(
    async (_prev: JoinState, formData: FormData) => joinByLinkAction(formData),
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  if (state.success) {
    return (
      <div
        className="border border-green/30 px-4 py-3 text-sm text-green"
        role="status"
        aria-live="polite"
      >
        <span className="flex items-start gap-2">
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {t.workspace.joinedMessage(state.workspaceName ?? "workspace")}
          </span>
        </span>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="border-y border-line py-3">
        <div className="flex items-center justify-between gap-4">
          <input
            id={inputId}
            name="link"
            type="text"
            placeholder={t.workspace.joinLinkPlaceholder}
            required
            aria-label={t.workspace.joinLinkLabel}
            aria-describedby={state.message && !state.success ? errorId : undefined}
            aria-invalid={Boolean(state.message && !state.success)}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3/70"
          />
          <CraftedLabel>{t.workspace.joinLinkLabel}</CraftedLabel>
        </div>
      </div>
      {state.message && !state.success ? (
        <p id={errorId} className="text-sm text-destructive" role="alert" aria-live="polite">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center gap-2 border border-line text-[14px] font-semibold text-foreground transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? t.workspace.joinVerifyingButton : t.workspace.joinButton}
      </button>
    </form>
  );
}
