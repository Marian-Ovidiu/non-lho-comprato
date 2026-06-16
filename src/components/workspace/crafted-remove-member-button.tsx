"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { removeWorkspaceMemberAction } from "@/src/actions/workspace";
import { useTranslations } from "@/src/components/language/language-context";

type CraftedRemoveMemberButtonProps = {
  userId: string;
  label: string;
  isCurrentUser?: boolean;
};

export function CraftedRemoveMemberButton({
  userId,
  label,
  isCurrentUser = false,
}: CraftedRemoveMemberButtonProps) {
  const t = useTranslations();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    const confirmed = window.confirm(
      isCurrentUser
        ? t.workspace.removeSelfConfirm
        : t.workspace.removeMemberConfirm(label),
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await removeWorkspaceMemberAction(userId);
      setMessage(result.success ? null : result.message);
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <button
        type="button"
        onClick={handleRemove}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 text-[13px] text-destructive underline-offset-4 transition-opacity hover:underline disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : null}
        {isCurrentUser ? t.workspace.removeLeaveButton : t.workspace.removeMemberButton}
      </button>
      {message ? (
        <p className="max-w-56 text-xs leading-4 text-destructive">{message}</p>
      ) : null}
    </div>
  );
}
