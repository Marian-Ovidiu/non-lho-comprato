"use client";

import { useState, useTransition } from "react";
import { Loader2, UserMinus } from "lucide-react";

import { removeWorkspaceMemberAction } from "@/src/actions/workspace";
import { Button } from "@/components/ui/button";

type RemoveWorkspaceMemberButtonProps = {
  userId: string;
  label: string;
  isCurrentUser?: boolean;
};

export function RemoveWorkspaceMemberButton({
  userId,
  label,
  isCurrentUser = false,
}: RemoveWorkspaceMemberButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    const confirmed = window.confirm(
      isCurrentUser
        ? "Vuoi uscire da questo workspace? I movimenti già creati resteranno nello storico."
        : `Rimuovere ${label} da questo workspace? I movimenti già creati resteranno nello storico.`,
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
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <Button
        type="button"
        variant="outline"
        className="h-10 rounded-2xl px-4 text-destructive hover:text-destructive"
        onClick={handleRemove}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <UserMinus className="mr-1.5 size-3.5" aria-hidden="true" />
        )}
        {isCurrentUser ? "Esci" : "Rimuovi"}
      </Button>
      {message ? (
        <p className="max-w-56 text-xs leading-4 text-destructive">{message}</p>
      ) : null}
    </div>
  );
}
