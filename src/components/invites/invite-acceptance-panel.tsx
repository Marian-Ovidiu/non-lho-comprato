"use client";

import { useActionState, useEffect, useRef } from "react";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { acceptWorkspaceInviteAction } from "@/src/actions/invites";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackPostHogEvent } from "@/src/lib/posthog";

type InviteAcceptanceState = {
  success: boolean;
  message: string;
  status?: "accepted" | "already_member";
  errors?: Record<string, string>;
  workspace?: {
    id: string;
    name: string;
    kind: "private" | "shared";
  };
};

type InviteAcceptancePanelProps = {
  token: string;
  workspaceNameHint?: string;
};

const initialState: InviteAcceptanceState = {
  success: false,
  message: "",
};

export function InviteAcceptancePanel({
  token,
  workspaceNameHint,
}: InviteAcceptancePanelProps) {
  const router = useRouter();
  const didTrackStartRef = useRef(false);
  const didTrackSuccessRef = useRef(false);
  const [state, formAction, pending] = useActionState(
    async (_previousState: InviteAcceptanceState, formData: FormData) =>
      acceptWorkspaceInviteAction(formData),
    initialState,
  );

  useEffect(() => {
    if (didTrackStartRef.current) {
      return;
    }

    didTrackStartRef.current = true;
    trackPostHogEvent("invite_accept_started");
  }, []);

  useEffect(() => {
    if (!state.success) {
      didTrackSuccessRef.current = false;
      return;
    }

    if (didTrackSuccessRef.current) {
      return;
    }

    didTrackSuccessRef.current = true;

    if (state.status === "accepted") {
      trackPostHogEvent("invite_accepted");
    }

    const timeout = window.setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [router, state.status, state.success]);

  return (
    <Card className="overflow-hidden border-border/80 bg-surface/80 shadow-sm">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />

          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              {workspaceNameHint ?? "Invito condiviso"}
            </p>
            <p className="text-sm leading-6 text-muted-text">
              Quando accetti, questo spazio diventa disponibile nel tuo account.
            </p>
          </div>

          {state.message ? (
            <div
              className={
                state.success
                  ? "rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm leading-6 text-success"
                  : "rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive"
              }
            >
              {state.message}
            </div>
          ) : null}

          <Button type="submit" className="h-11 w-full rounded-2xl px-5" disabled={pending}>
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="mr-2 size-4" aria-hidden="true" />
            )}
            {pending ? "Accettazione..." : "Accetta invito"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
