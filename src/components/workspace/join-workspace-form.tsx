"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { joinByLinkAction } from "@/src/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type JoinState = {
  success: boolean;
  message: string;
  workspaceName?: string;
};

const initialState: JoinState = { success: false, message: "" };

export function JoinWorkspaceForm() {
  const router = useRouter();
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
      <div className="rounded-2xl border border-accent/20 bg-accent/8 px-4 py-3 text-sm">
        <p className="font-semibold text-foreground">Accesso confermato</p>
        <p className="text-muted-foreground">
          Sei entrato in <strong>{state.workspaceName ?? "workspace"}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <Input
        name="link"
        type="text"
        placeholder="Incolla il link di invito"
        className="h-11 rounded-2xl"
        required
      />
      {state.message && !state.success ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <Button
        type="submit"
        variant="outline"
        className="h-10 w-full rounded-2xl px-4"
        disabled={pending}
      >
        {pending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" /> : null}
        {pending ? "Verifica..." : "Unisciti al workspace"}
      </Button>
    </form>
  );
}
