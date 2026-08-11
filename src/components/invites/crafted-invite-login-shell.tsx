import { Serif } from "@/components/crafted";
import { NlcMark } from "@/src/components/brand/nlc-mark";
import { LoginPanel } from "@/src/components/auth/login-panel";

type CraftedInviteLoginShellProps = {
  redirectPath: string;
  title: string;
  description: string;
  panelTitle: string;
  panelDescription: string;
};

export function CraftedInviteLoginShell({
  redirectPath,
  title,
  description,
  panelTitle,
  panelDescription,
}: CraftedInviteLoginShellProps) {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-background px-6 pb-8 pt-10">
      <div className="flex items-center gap-2">
        <NlcMark size={20} />
        <span className="text-[13px] font-semibold tracking-[0.02em] text-muted-foreground">
          Non l&apos;ho comprato
        </span>
      </div>

      <div className="mb-8 mt-auto">
        <Serif className="text-[clamp(1.5rem,7vw,2rem)] leading-snug text-muted-foreground">
          {title}
        </Serif>
        <p className="mt-4 max-w-[320px] text-sm leading-relaxed text-ink-3">{description}</p>
      </div>

      <LoginPanel
        compact
        providers={["google"]}
        className="w-full"
        redirectPath={redirectPath}
        title={panelTitle}
        description={panelDescription}
      />

      <div className="mt-6 flex justify-center gap-1.5" aria-hidden="true">
        <span className="size-1.5 rounded-full bg-accent/80" />
        <span className="size-1.5 rounded-full bg-accent/45" />
        <span className="size-1.5 rounded-full bg-accent/25" />
      </div>
    </main>
  );
}
