"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Label } from "@/components/crafted";
import { deleteWorkspaceAction, leaveWorkspaceAction } from "@/src/actions/workspace";
import { cn } from "@/lib/utils";

type WorkspaceExitActionsProps = {
  workspaceId: string;
  workspaceName: string;
  canLeave: boolean;
  canDelete: boolean;
  /** Perché l'eliminazione non è disponibile, quando non lo è. */
  deleteBlockedReason: string | null;
};

/**
 * Uscire ed eliminare stanno vicini ma non si somigliano: uscire lascia i
 * movimenti a chi resta, eliminare li porta via. L'eliminazione chiede quindi
 * una conferma esplicita, in due tempi.
 */
export function WorkspaceExitActions({
  workspaceId,
  workspaceName,
  canLeave,
  canDelete,
  deleteBlockedReason,
}: WorkspaceExitActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canLeave && !canDelete) {
    return null;
  }

  function run(action: () => Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      setError(null);
      const result = await action();

      if (!result.success) {
        setError(result.message);
        return;
      }

      router.replace("/more");
      router.refresh();
    });
  }

  return (
    <section className="-mx-4 border-t border-line px-5 py-6 sm:-mx-6 lg:-mx-8">
      <Label className="mb-3 block">Uscire da questo spazio</Label>

      {canLeave ? (
        <>
          <p className="text-[13px] leading-relaxed text-ink-3">
            Esci da «{workspaceName}»: perdi l&apos;accesso, ma i movimenti restano
            a chi rimane.
          </p>
          <button
            type="button"
            onClick={() => run(() => leaveWorkspaceAction(workspaceId))}
            disabled={pending}
            className="nlc-press mt-3 inline-flex min-h-11 items-center gap-2 rounded-[var(--r-control)] border border-line px-4 text-[14px] font-medium text-foreground transition-colors hover:border-foreground/30 disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Esci dallo spazio
          </button>
        </>
      ) : null}

      {canDelete ? (
        <div className={cn(canLeave && "mt-6 border-t border-line-soft pt-5")}>
          <p className="text-[13px] leading-relaxed text-ink-3">
            Elimina «{workspaceName}» e tutto quello che contiene: movimenti,
            categorie e budget. Non si torna indietro.
          </p>
          {confirmingDelete ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => run(() => deleteWorkspaceAction(workspaceId))}
                disabled={pending}
                className="nlc-press inline-flex min-h-11 items-center gap-2 rounded-[var(--r-control)] bg-destructive px-4 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                Sì, elimina definitivamente
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="nlc-press inline-flex min-h-11 items-center rounded-[var(--r-control)] border border-line px-4 text-[14px] font-medium text-ink-3"
              >
                Annulla
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="nlc-press mt-3 inline-flex min-h-11 items-center rounded-[var(--r-control)] border border-destructive/40 px-4 text-[14px] font-medium text-destructive transition-colors hover:bg-destructive/5"
            >
              Elimina lo spazio
            </button>
          )}
        </div>
      ) : deleteBlockedReason ? (
        <p className={cn("text-[12px] leading-relaxed text-ink-3", canLeave && "mt-5")}>
          {deleteBlockedReason}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
