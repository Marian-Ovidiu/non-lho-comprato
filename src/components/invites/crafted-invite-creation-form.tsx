"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Share2 } from "lucide-react";

import { Label as CraftedLabel, Mono } from "@/components/crafted";
import { createWorkspaceInviteAction } from "@/src/actions/invites";
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

type CraftedInviteCreationFormProps = {
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

export function CraftedInviteCreationForm({
  currentWorkspace,
}: CraftedInviteCreationFormProps) {
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
  const inviteUrl = state.inviteUrl ?? null;

  useEffect(() => {
    if (!showSuccess || !state.inviteUrl) {
      didTrackSuccessRef.current = false;
      return;
    }

    if (didTrackSuccessRef.current) return;

    didTrackSuccessRef.current = true;
    trackPostHogEvent("invite_created");
  }, [showSuccess, state.inviteUrl]);

  useEffect(() => {
    if (!showSuccess || !inviteUrl) return;

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
        if (cancelled) return;
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
  }, [showSuccess, inviteUrl]);

  async function copyInviteLink() {
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
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareError(
        error instanceof Error
          ? error.message
          : "Non riesco ad aprire la condivisione in questo momento.",
      );
    }
  }

  function createInviteFromCard() {
    if (pending) return;

    setLocalError(null);
    setCopyError(null);
    setShareError(null);
    setCopied(false);

    const email = window.prompt("Inserisci l'email della persona");
    if (email == null) return;

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

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-ink-3">
        {currentWorkspace.isShared
          ? "Crea un link da inviare. Quando accetta, vedrete gli stessi movimenti condivisi."
          : "Stiamo creando uno spazio condiviso. Solo l'email indicata potrà accettare l'invito."}
      </p>

      <button
        type="button"
        onClick={createInviteFromCard}
        disabled={pending}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-[15px] font-bold text-accent-foreground transition-opacity disabled:opacity-60",
        )}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? "Creazione invito..." : "Crea link invito"}
      </button>

      <div className="border-y border-line py-3 opacity-60">
        <CraftedLabel className="mb-1 block">Invio via email</CraftedLabel>
        <p className="text-sm text-ink-3">Presto disponibile.</p>
      </div>

      <form ref={formRef} action={formAction} className="hidden">
        <input ref={emailInputRef} name="email" type="email" tabIndex={-1} />
      </form>

      {localError || state.message ? (
        <div
          className={cn(
            "border px-4 py-3 text-sm",
            state.success
              ? "border-green/30 text-green"
              : "border-destructive/30 text-destructive",
          )}
        >
          {localError ?? state.message}
        </div>
      ) : null}

      {showSuccess && inviteUrl ? (
        <div className="space-y-4">
          <div className="border-y border-line py-3">
            <CraftedLabel className="mb-2 block">Link pronto</CraftedLabel>
            <Mono className="block break-all text-[12px] leading-5">{inviteUrl}</Mono>
            <p className="mt-2 text-xs text-ink-3">
              Solo l&apos;email indicata potrà accettarlo.
            </p>
          </div>

          {copyError ? <p className="text-sm text-destructive">{copyError}</p> : null}
          {shareError ? <p className="text-sm text-destructive">{shareError}</p> : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyInviteLink}
              className="flex h-11 flex-1 items-center justify-center gap-2 border border-line text-[14px] font-semibold"
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
                onClick={shareInviteLink}
                className="flex h-11 flex-1 items-center justify-center gap-2 border border-line text-[14px] font-semibold"
              >
                <Share2 className="size-4" aria-hidden="true" />
                Condividi
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
