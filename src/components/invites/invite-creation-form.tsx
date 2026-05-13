"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Link2, Share2, Users2 } from "lucide-react";

import { createWorkspaceInviteAction } from "@/src/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { trackPostHogEvent } from "@/src/lib/posthog";

type InviteCreationState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
  invitePath?: string;
  inviteUrl?: string;
  workspace?: {
    id: string;
    name: string;
    kind: "private" | "shared";
  };
  createdSharedWorkspace?: boolean;
};

type InviteCreationFormProps = {
  currentWorkspace: {
    id: string;
    name: string;
    kind: "private" | "shared";
    isShared: boolean;
  };
};

const initialState: InviteCreationState = {
  success: false,
  message: "",
  errors: {},
};

const INVITE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function InviteCreationForm({
  currentWorkspace,
}: InviteCreationFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const didTrackSuccessRef = useRef(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(
    async (_previousState: InviteCreationState, formData: FormData) =>
      createWorkspaceInviteAction(formData),
    initialState,
  );

  const showSuccess = state.success && Boolean(state.inviteUrl) && !pending;

  useEffect(() => {
    if (!showSuccess || !state.inviteUrl) {
      didTrackSuccessRef.current = false;
      return;
    }

    if (didTrackSuccessRef.current) {
      return;
    }

    didTrackSuccessRef.current = true;
    trackPostHogEvent("invite_created");
  }, [showSuccess, state.inviteUrl]);

  useEffect(() => {
    const inviteUrl = state.inviteUrl;

    if (!showSuccess || !inviteUrl) {
      return;
    }

    let cancelled = false;

    const deliverInviteLink = async () => {
      try {
        if (navigator.share) {
          await navigator.share({
            title: "Invito condiviso",
            text: "Copia il link e invialo alla persona.",
            url: inviteUrl,
          });
          if (!cancelled) {
            setCopied(false);
            setCopyError(null);
            setShareError(null);
          }
          return;
        }

        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(inviteUrl);
          if (!cancelled) {
            setCopied(true);
            setCopyError(null);
            setShareError(null);
            window.setTimeout(() => setCopied(false), 1500);
          }
          return;
        }

        throw new Error("Condivisione non disponibile su questo dispositivo.");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCopied(false);
        setShareError(
          error instanceof Error
            ? error.message
            : "Non riesco a condividere il link in questo momento.",
        );
      }
    };

    void deliverInviteLink();

    return () => {
      cancelled = true;
    };
  }, [showSuccess, state.inviteUrl]);

  async function copyInviteLink() {
    const inviteUrl = state.inviteUrl;

    if (!inviteUrl) {
      setCopyError("Il link non è ancora disponibile.");
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API non disponibile.");
      }

      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setCopyError(null);
      setShareError(null);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      setCopied(false);
      setCopyError(
        error instanceof Error
          ? error.message
          : "Non riesco a copiare il link in questo momento.",
      );
    }
  }

  async function shareInviteLink() {
    const inviteUrl = state.inviteUrl;

    if (!inviteUrl) {
      setShareError("Il link non è ancora disponibile.");
      return;
    }

    try {
      if (!navigator.share) {
        throw new Error("Condivisione non disponibile su questo dispositivo.");
      }

      await navigator.share({
        title: "Invito condiviso",
        text: "Copia il link e invialo alla persona.",
        url: inviteUrl,
      });
      setShareError(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setShareError(
        error instanceof Error
          ? error.message
          : "Non riesco ad aprire la condivisione in questo momento.",
      );
    }
  }

  function createInviteFromCard() {
    if (pending) {
      return;
    }

    setLocalError(null);
    setCopyError(null);
    setShareError(null);
    setCopied(false);

    const email = window.prompt("Inserisci l'email della persona");
    if (email == null) {
      return;
    }

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setLocalError("Inserisci un indirizzo email valido.");
      return;
    }

    if (!INVITE_EMAIL_PATTERN.test(normalizedEmail)) {
      setLocalError("Inserisci un indirizzo email valido.");
      return;
    }

    const form = formRef.current;
    const emailInput = emailInputRef.current;
    if (!form || !emailInput) {
      setLocalError("Non riesco ad avviare l'invito adesso.");
      return;
    }

    emailInput.value = normalizedEmail;
    form.requestSubmit();
  }

  const inviteUrl = state.inviteUrl ?? null;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-text">
          <Users2 className="size-3.5" aria-hidden="true" />
          {currentWorkspace.isShared
            ? "Spazio condiviso attivo"
            : "Stiamo creando uno spazio condiviso"}
        </div>

        <p className="text-sm leading-6 text-muted-text">
          {currentWorkspace.isShared
            ? "Clicca il link per creare un invito. Quando accetta, vedrete gli stessi movimenti condivisi."
            : "Solo l'email indicata potrà accettare l'invito."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={createInviteFromCard}
          disabled={pending}
          className={cn(
            "rounded-3xl border p-4 text-left shadow-sm transition-[transform,border-color,background-color,box-shadow,opacity] duration-200",
            "border-primary/25 bg-primary/8 ring-1 ring-primary/15 hover:-translate-y-px hover:bg-primary/10",
            pending && "cursor-not-allowed opacity-70 hover:translate-y-0",
          )}
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-text">
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Link2 className="size-3.5" aria-hidden="true" />
              )}
              Link invito
            </div>
            <p className="text-sm leading-6 text-foreground">
              Crea un link da copiare e inviare alla persona.
            </p>
          </div>
        </button>

        <div className="rounded-3xl border border-dashed border-border/70 bg-background/50 p-4 opacity-70">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface px-3 py-1.5 text-xs font-medium text-muted-text">
              <Users2 className="size-3.5" aria-hidden="true" />
              Invio via email
            </div>
            <p className="text-sm leading-6 text-muted-text">
              Presto disponibile.
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-2xl"
              disabled
            >
              Presto disponibile
            </Button>
          </div>
        </div>
      </div>

      <form ref={formRef} action={formAction} className="hidden">
        <Input ref={emailInputRef} name="email" type="email" tabIndex={-1} />
      </form>

      {localError || state.message ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm leading-6",
            state.success
              ? "border-success/20 bg-success/10 text-success"
              : "border-destructive/20 bg-destructive/10 text-destructive",
          )}
        >
          {localError ?? state.message}
        </div>
      ) : null}

      {showSuccess && inviteUrl ? (
        <div className="space-y-3 rounded-3xl border border-border/70 bg-background/70 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Link pronto</p>
            <p className="text-sm leading-6 text-muted-text">
              Copia il link e invialo alla persona. Solo l&apos;email indicata potrà accettarlo.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-url">Link invito</Label>
            <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-surface px-3 py-2">
              <Link2 className="size-4 shrink-0 text-muted-text" aria-hidden="true" />
              <input
                id="invite-url"
                readOnly
                value={inviteUrl}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-none ring-0"
              />
            </div>
          </div>

          {copyError ? (
            <p className="text-sm leading-5 text-destructive">{copyError}</p>
          ) : null}
          {shareError ? (
            <p className="text-sm leading-5 text-destructive">{shareError}</p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-2xl px-4 sm:w-auto"
              onClick={copyInviteLink}
            >
              {copied ? (
                <Check className="mr-2 size-4" aria-hidden="true" />
              ) : (
                <Copy className="mr-2 size-4" aria-hidden="true" />
              )}
              {copied ? "Copiato" : "Copia link"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-2xl px-4 sm:w-auto"
              onClick={shareInviteLink}
            >
              <Share2 className="mr-2 size-4" aria-hidden="true" />
              Condividi
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
