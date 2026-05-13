"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Copy, Link2, Users2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { createWorkspaceInviteAction } from "@/src/actions/invites";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { trackPostHogEvent } from "@/src/lib/posthog";

type InviteCreationState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
  invitePath?: string;
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

export function InviteCreationForm({
  currentWorkspace,
}: InviteCreationFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (_previousState: InviteCreationState, formData: FormData) =>
      createWorkspaceInviteAction(formData),
    initialState,
  );
  const [origin] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.location.origin,
  );
  const [copied, setCopied] = useState(false);
  const didTrackSuccessRef = useRef(false);

  useEffect(() => {
    if (!state.success) {
      didTrackSuccessRef.current = false;
      return;
    }

    if (didTrackSuccessRef.current) {
      return;
    }

    didTrackSuccessRef.current = true;
    trackPostHogEvent("invite_created");
    router.refresh();
  }, [router, state.success]);

  const fullInviteLink =
    origin && state.success && state.invitePath
      ? `${origin}${state.invitePath}`
      : null;

  async function copyInviteLink() {
    if (!fullInviteLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(fullInviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Intentionally ignored.
    }
  }

  return (
    <Card className="overflow-hidden border-border/80 bg-surface/80 shadow-sm">
      <CardContent className="space-y-5 p-4 sm:p-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-text">
            <Users2 className="size-3.5" aria-hidden="true" />
            {currentWorkspace.isShared ? "Spazio condiviso attivo" : "Stiamo creando uno spazio condiviso"}
          </div>

          <p className="text-sm leading-6 text-muted-text">
            {currentWorkspace.isShared
              ? "Invia un invito a una persona. Quando accetta, vedrete gli stessi movimenti condivisi."
              : "Inserisci un'email e, se vuoi, il nome del nuovo spazio condiviso."}
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          {currentWorkspace.kind === "private" ? (
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Nome spazio condiviso</Label>
              <Input
                id="workspaceName"
                name="workspaceName"
                placeholder={`${currentWorkspace.name} condiviso`}
                autoComplete="off"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email della persona</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nome@esempio.com"
              aria-invalid={Boolean(state.errors?.email)}
            />
            {state.errors?.email ? (
              <p className="text-sm text-destructive">{state.errors.email}</p>
            ) : null}
          </div>

          {state.message ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm leading-6",
                state.success
                  ? "border-success/20 bg-success/10 text-success"
                  : "border-destructive/20 bg-destructive/10 text-destructive",
              )}
            >
              {state.message}
            </div>
          ) : null}

          {state.success && fullInviteLink ? (
            <div className="space-y-3 rounded-3xl border border-border/70 bg-background/70 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Invito pronto da condividere
                </p>
                <p className="text-sm leading-6 text-muted-text">
                  Copia il link e mandalo alla persona che vuoi aggiungere.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-surface px-3 py-2">
                <Link2 className="size-4 shrink-0 text-muted-text" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {fullInviteLink}
                </span>
              </div>

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
              </div>
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-11 w-full rounded-2xl px-5"
            disabled={pending}
          >
            {pending ? "Creo invito..." : "Invita una persona"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
