"use client";

import { useActionState, useEffect, useRef } from "react";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Serif } from "@/components/crafted";
import { acceptWorkspaceInviteAction } from "@/src/actions/invites";
import { cn } from "@/lib/utils";
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

type CraftedInviteAcceptancePanelProps = {
  token: string;
  workspaceNameHint?: string;
};

const initialState: InviteAcceptanceState = {
  success: false,
  message: "",
};

export function CraftedInviteAcceptancePanel({
  token,
  workspaceNameHint,
}: CraftedInviteAcceptancePanelProps) {
  const router = useRouter();
  const didTrackStartRef = useRef(false);
  const didTrackSuccessRef = useRef(false);
  const [state, formAction, pending] = useActionState(
    async (_previousState: InviteAcceptanceState, formData: FormData) =>
      acceptWorkspaceInviteAction(formData),
    initialState,
  );

  useEffect(() => {
    if (didTrackStartRef.current) return;
    didTrackStartRef.current = true;
    trackPostHogEvent("invite_accept_started");
  }, []);

  useEffect(() => {
    if (!state.success) {
      didTrackSuccessRef.current = false;
      return;
    }

    if (didTrackSuccessRef.current) return;

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
    <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
      <div className="border-y border-line py-4">
        <p className="text-[15px] font-[450]">{workspaceNameHint ?? "Invito condiviso"}</p>
        <Serif className="mt-2 block text-sm text-ink-3">
          Quando accetti, questo spazio diventa disponibile nel tuo account.
        </Serif>
      </div>

      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="token" value={token} />

        {state.message ? (
          <div
            className={cn(
              "border px-4 py-3 text-sm",
              state.success
                ? "border-green/30 text-green"
                : "border-destructive/30 text-destructive",
            )}
            aria-live="polite"
          >
            <span className="flex items-start gap-2">
              {state.success ? <Check className="mt-0.5 size-4 shrink-0" /> : null}
              <span>{state.message}</span>
            </span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-bold text-accent-foreground disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Accettazione..." : "Accetta invito"}
        </button>
      </form>
    </section>
  );
}
