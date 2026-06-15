"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  deleteAccountAction,
  type DeleteAccountState,
} from "@/src/actions/auth";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/src/components/language/language-context";

const initialState: DeleteAccountState = { success: false, message: "" };

export function DeleteAccountForm() {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(
    deleteAccountAction,
    initialState,
  );
  const [understood, setUnderstood] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const canSubmit = useMemo(
    () => understood && confirmation.trim() === t.account.deleteConfirmPlaceholder && !pending,
    [confirmation, pending, understood, t.account.deleteConfirmPlaceholder],
  );

  return (
    <form action={formAction} className="space-y-5">
      <label className="flex items-start gap-3 border-y border-line py-4 text-sm leading-6">
        <input
          type="checkbox"
          name="understood"
          checked={understood}
          onChange={(event) => setUnderstood(event.target.checked)}
          className="mt-1 size-4 shrink-0 accent-[var(--destructive)]"
        />
        <span>
          {t.account.deleteConfirmHelp}
        </span>
      </label>

      <div className="space-y-2">
        <label htmlFor="delete-confirmation" className="text-sm font-medium">
          {t.account.deleteConfirmLabel}
        </label>
        <input
          id="delete-confirmation"
          name="confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          className="h-12 w-full border border-line bg-surface-muted px-3 text-base outline-none transition-colors placeholder:text-ink-3 focus:border-destructive focus:ring-2 focus:ring-destructive/20"
          placeholder={t.account.deleteConfirmPlaceholder}
        />
      </div>

      {state.message ? (
        <p className="border border-destructive/30 px-4 py-3 text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          "flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold transition-opacity disabled:opacity-50",
          canSubmit
            ? "bg-destructive text-destructive-foreground hover:opacity-90"
            : "bg-line text-ink-3",
        )}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? t.account.deletingButton : t.account.deleteButton}
      </button>
    </form>
  );
}
