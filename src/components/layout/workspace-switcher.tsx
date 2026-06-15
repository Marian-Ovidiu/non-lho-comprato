"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  Loader2,
  LockKeyhole,
  Users2,
} from "lucide-react";

import { switchWorkspaceAction } from "@/src/actions/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { trackPostHogEvent } from "@/src/lib/posthog";
import { useTranslations } from "@/src/components/language/language-context";

type WorkspaceOption = {
  id: string;
  name: string;
  kind: "private" | "shared";
  isShared: boolean;
};

function emitWorkspaceSwitchEvent(
  name: "nlc:workspace-switch-start" | "nlc:workspace-switch-end",
  detail?: { workspaceId: string },
) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function WorkspaceMark({ isShared }: { isShared: boolean }) {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-text">
      {isShared ? (
        <Users2 className="size-3.5" aria-hidden="true" />
      ) : (
        <LockKeyhole className="size-3.5" aria-hidden="true" />
      )}
    </span>
  );
}

function getWorkspaceLabel(workspace: WorkspaceOption, t: ReturnType<typeof useTranslations>) {
  return workspace.isShared ? t.workspaceSwitcher.shared : t.workspaceSwitcher.private;
}

function getWorkspaceSubtitle(workspace: WorkspaceOption, t: ReturnType<typeof useTranslations>) {
  return workspace.isShared ? t.workspaceSwitcher.sharedDesc : t.workspaceSwitcher.privateDesc;
}

function WorkspaceTrigger({
  workspace,
  interactive,
  isSwitching = false,
  t,
}: {
  workspace: WorkspaceOption;
  interactive: boolean;
  isSwitching?: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-2.5 py-2 text-left shadow-sm transition-[transform,background-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] active:scale-[0.99]",
        isSwitching && "opacity-80",
        interactive &&
          "hover:-translate-y-px hover:bg-surface-muted/70 hover:shadow-[0_10px_24px_-18px_rgba(0,0,0,0.55)]",
      )}
    >
      <WorkspaceMark isShared={workspace.isShared} />

      <span className="inline-flex shrink-0 items-center rounded-full border border-border/70 bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-text">
        {getWorkspaceLabel(workspace, t)}
      </span>

      {isSwitching ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-premium-accent/20 bg-premium-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-premium-accent">
          <Loader2
            className="size-3 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          {t.workspaceSwitcher.switching}
        </span>
      ) : null}

      {interactive ? (
        <ChevronDown className="size-3.5 shrink-0 text-muted-text" aria-hidden="true" />
      ) : null}
    </span>
  );
}

export function WorkspaceSwitcher({
  currentWorkspace,
  availableWorkspaces,
}: {
  currentWorkspace: WorkspaceOption;
  availableWorkspaces: WorkspaceOption[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<string | null>(
    null,
  );
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [isRoutePending, startSwitchTransition] = useTransition();
  const switchingWorkspaceIdRef = useRef<string | null>(null);
  const hasMultipleWorkspaces = availableWorkspaces.length > 1;
  const isSwitching = Boolean(switchingWorkspaceId) || isRoutePending;
  const showSwitchingState = Boolean(switchingWorkspaceId) || isRoutePending;

  const returnTo = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const endWorkspaceSwitch = useCallback(() => {
    switchingWorkspaceIdRef.current = null;
    setSwitchingWorkspaceId(null);
    emitWorkspaceSwitchEvent("nlc:workspace-switch-end");
  }, []);

  const beginWorkspaceSwitch = useCallback((workspaceId: string) => {
    if (switchingWorkspaceIdRef.current === workspaceId) {
      return;
    }

    switchingWorkspaceIdRef.current = workspaceId;
    setSwitchingWorkspaceId(workspaceId);
    setSwitchError(null);
    setOpen(false);
    emitWorkspaceSwitchEvent("nlc:workspace-switch-start", { workspaceId });
  }, []);

  useEffect(() => {
    if (!switchingWorkspaceId || currentWorkspace.id !== switchingWorkspaceId) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setSwitchError(null);
      endWorkspaceSwitch();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [currentWorkspace.id, endWorkspaceSwitch, switchingWorkspaceId]);

  async function handleWorkspaceSwitch(
    formData: FormData,
    workspace: WorkspaceOption,
    isCurrent: boolean,
  ) {
    if (isCurrent) {
      return;
    }

    if (
      switchingWorkspaceIdRef.current &&
      switchingWorkspaceIdRef.current !== workspace.id
    ) {
      return;
    }

    beginWorkspaceSwitch(workspace.id);

    trackPostHogEvent("workspace_switched");

    try {
      const result = await switchWorkspaceAction(formData);

      if (!result.success) {
        setSwitchError(t.workspaceSwitcher.switchError);
        endWorkspaceSwitch();
        return;
      }

      startSwitchTransition(() => {
        router.replace(returnTo, { scroll: false });
        router.refresh();
      });
    } catch (error) {
      console.error("Failed to switch workspace:", error);
      setSwitchError(t.workspaceSwitcher.switchError2);
      endWorkspaceSwitch();
    }
  }

  if (!hasMultipleWorkspaces) {
    return (
      <div
        className="w-full min-w-0"
        aria-label={`${t.workspaceSwitcher.activeWorkspace}: ${currentWorkspace.name}`}
      >
        <WorkspaceTrigger workspace={currentWorkspace} interactive={false} t={t} />
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSwitching) {
          setOpen(nextOpen);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full min-w-0 justify-start rounded-full p-0 hover:bg-transparent"
          disabled={isSwitching}
          aria-busy={showSwitchingState}
          aria-label={`${t.workspaceSwitcher.changeWorkspace}: ${currentWorkspace.name}`}
        >
          <WorkspaceTrigger
            workspace={currentWorkspace}
            interactive
            isSwitching={showSwitchingState}
            t={t}
          />
        </Button>
      </DialogTrigger>
      {switchError ? (
        <p
          className="mt-1 text-xs leading-4 text-destructive"
          role="alert"
          aria-live="polite"
        >
          {switchError}
        </p>
      ) : null}

      <DialogContent
        showCloseButton={false}
        className={cn(
          "left-1/2 top-auto bottom-0 w-[calc(100%-0.75rem)] max-w-none -translate-x-1/2 translate-y-0 rounded-t-[1.75rem] rounded-b-none border-border bg-surface p-0 shadow-[0_-28px_80px_rgba(0,0,0,0.28)] data-open:animate-in data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:slide-out-to-bottom-4 sm:top-1/2 sm:bottom-auto sm:w-full sm:max-w-xl sm:-translate-y-1/2 sm:rounded-3xl sm:rounded-b-3xl sm:data-open:zoom-in-95 sm:data-closed:zoom-out-95",
        )}
      >
        <div className="max-h-[88vh] overflow-y-auto overscroll-contain">
          <div className="border-b border-border/70 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-text">
                {t.workspaceSwitcher.activeWorkspace}
              </p>
              <DialogTitle className="text-lg tracking-tight">
                {t.workspaceSwitcher.changeWorkspace}
              </DialogTitle>
              <DialogDescription className="max-w-md text-sm leading-5 text-muted-text">
                {t.workspaceSwitcher.dialogDesc}
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-3 px-4 py-4 sm:px-5">
            <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <WorkspaceMark isShared={currentWorkspace.isShared} />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {currentWorkspace.name}
                  </p>
                  <p className="text-sm leading-5 text-muted-text">
                    {getWorkspaceLabel(currentWorkspace, t)} · {getWorkspaceSubtitle(currentWorkspace, t)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {availableWorkspaces.map((workspace) => {
                const isCurrent = workspace.id === currentWorkspace.id;

                const isSubmitting =
                  isSwitching && switchingWorkspaceId === workspace.id;

                return (
                  <form
                    key={workspace.id}
                    action={(formData) =>
                      handleWorkspaceSwitch(formData, workspace, isCurrent)
                    }
                  >
                    <input type="hidden" name="workspaceId" value={workspace.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />

                    <button
                      type="submit"
                      disabled={
                        isCurrent ||
                        (isSwitching && switchingWorkspaceId !== workspace.id)
                      }
                      aria-busy={isSubmitting}
                      onClick={() => {
                        if (!isCurrent) {
                          beginWorkspaceSwitch(workspace.id);
                        }
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-[transform,background-color,border-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(.2,.8,.2,1)]",
                        "hover:-translate-y-px hover:border-border hover:bg-surface-muted active:translate-y-px active:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
                        isCurrent
                          ? "border-primary/25 bg-primary/8 ring-1 ring-primary/20"
                          : "border-border bg-background",
                        isSubmitting && "opacity-70",
                      )}
                      aria-current={isCurrent ? "true" : undefined}
                    >
                      <WorkspaceMark isShared={workspace.isShared} />

                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {workspace.name}
                        </span>
                        <span className="block text-xs leading-4 text-muted-text">
                          {getWorkspaceLabel(workspace, t)} · {getWorkspaceSubtitle(workspace, t)}
                        </span>
                      </span>

                      <span className="flex shrink-0 items-center gap-1.5 pt-0.5">
                        {isCurrent ? (
                          <Badge
                            variant="outline"
                            className="rounded-full border-primary/20 bg-primary/8 text-[10px] uppercase tracking-[0.18em] text-primary"
                          >
                            {t.workspaceSwitcher.active}
                          </Badge>
                        ) : null}
                        {isSubmitting ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-premium-accent/20 bg-premium-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-premium-accent">
                            <Loader2
                              className="size-3 animate-spin motion-reduce:animate-none"
                              aria-hidden="true"
                            />
                            {t.workspaceSwitcher.switching}
                          </span>
                        ) : isCurrent ? (
                          <Check className="size-4 text-primary" aria-hidden="true" />
                        ) : null}
                      </span>
                    </button>
                  </form>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
