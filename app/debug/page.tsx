import { notFound } from "next/navigation";

import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { getDebugPageData } from "@/src/lib/debug-page-data";
import { CraftedSubpageHeader } from "@/src/components/layout/crafted-subpage-header";
import { DebugBrowserInfo, DebugTable } from "@/src/components/debug/debug-browser-info";
import { Label, Rule, Mono } from "@/components/crafted";


const DEVELOPER_EMAIL = "h.marian914@gmail.com";

function DebugSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <Label className="block">{title}</Label>
      {children}
    </section>
  );
}

function BoolBadge({ value }: { value: boolean }) {
  return (
    <span
      className={
        value
          ? "font-mono text-xs text-green-500"
          : "font-mono text-xs text-muted-foreground"
      }
    >
      {value ? "sì" : "no"}
    </span>
  );
}

function FeedbackTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    bug: "Problema",
    suggestion: "Consiglio",
    confusion: "Confusione",
    other: "Altro",
  };
  return <span>{labels[type] ?? type}</span>;
}

export default async function DebugPage() {
  const user = await getAuthenticatedUser();

  if (!user || user.email !== DEVELOPER_EMAIL) {
    notFound();
  }

  const data = await getDebugPageData();

  return (
    <main className="space-y-8 pb-10">
      <CraftedSubpageHeader
        backHref="/more"
        backLabel="Altro"
        title="Debug app"
        context="Questa pagina è privata e non mostra segreti o dati finanziari grezzi."
      />

      <Rule />

      {/* 1. Sessione */}
      <DebugSection title="Sessione">
        <DebugTable
          rows={[
            ["User ID", data.session.userId],
            ["Email", data.session.email ?? "—"],
            ["Nome", data.session.displayName ?? "—"],
          ]}
        />
      </DebugSection>

      {/* 2. Workspace */}
      <DebugSection title="Workspace">
        {data.workspace ? (
          <DebugTable
            rows={[
              ["Workspace ID", data.workspace.id],
              ["Nome", data.workspace.name],
              ["Tipo", data.workspace.kind],
              ["Ruolo", data.workspace.role ?? "—"],
              ["Membri", String(data.workspace.memberCount)],
            ]}
          />
        ) : (
          <p className="text-xs text-muted-foreground">Workspace non disponibile.</p>
        )}
      </DebugSection>

      {/* 3. Ambiente */}
      <DebugSection title="Ambiente">
        <div className="divide-y divide-line-soft overflow-hidden rounded-lg border border-line">
          {[
            ["NODE_ENV", data.env.nodeEnv],
            ["Vercel env", data.env.vercelEnv ?? "—"],
            ["App version", data.env.appVersion],
            ["Commit SHA", data.env.commitSha ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex min-h-10 items-start gap-3 px-3 py-2.5">
              <span className="w-36 shrink-0 text-xs font-medium text-muted-foreground">
                {label}
              </span>
              <span className="font-mono text-xs text-foreground">{value}</span>
            </div>
          ))}
          <div className="flex min-h-10 items-center gap-3 px-3 py-2.5">
            <span className="w-36 shrink-0 text-xs font-medium text-muted-foreground">
              Database
            </span>
            <BoolBadge value={data.env.databaseConfigured} />
          </div>
          <div className="flex min-h-10 items-center gap-3 px-3 py-2.5">
            <span className="w-36 shrink-0 text-xs font-medium text-muted-foreground">
              Sentry
            </span>
            <BoolBadge value={data.env.sentryConfigured} />
          </div>
          <div className="flex min-h-10 items-center gap-3 px-3 py-2.5">
            <span className="w-36 shrink-0 text-xs font-medium text-muted-foreground">
              PostHog
            </span>
            <BoolBadge value={data.env.posthogConfigured} />
          </div>
        </div>
      </DebugSection>

      {/* 4. Browser/PWA */}
      <DebugSection title="Browser / PWA">
        <DebugBrowserInfo />
      </DebugSection>

      {/* 5. Feedback recenti */}
      <DebugSection title="Feedback recenti">
        {data.recentFeedback.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nessun feedback ancora.</p>
        ) : (
          <div className="space-y-3">
            {data.recentFeedback.map((fb) => (
              <div
                key={fb.id}
                className="space-y-1.5 rounded-lg border border-line p-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-foreground">
                    <FeedbackTypeLabel type={fb.type} />
                  </span>
                  <Mono className="text-ink-3">
                    {new Date(fb.createdAt).toLocaleString("it-IT", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </Mono>
                  {fb.userEmail ? (
                    <span className="text-muted-foreground">{fb.userEmail}</span>
                  ) : fb.userId ? (
                    <Mono className="text-muted-foreground">{fb.userId.slice(0, 8)}</Mono>
                  ) : null}
                  {fb.workspaceName ? (
                    <span className="text-muted-foreground">· {fb.workspaceName}</span>
                  ) : null}
                </div>
                <p className="text-sm text-foreground">{fb.messageExcerpt}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  {fb.route ? <span>{fb.route}</span> : null}
                  {fb.displayMode ? <span>{fb.displayMode}</span> : null}
                  {fb.viewport ? <span>{fb.viewport}</span> : null}
                  {fb.locale ? <span>{fb.locale}</span> : null}
                  {fb.timezone ? <span>{fb.timezone}</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </DebugSection>

      {/* 6. Note sicurezza */}
      <DebugSection title="Note sicurezza">
        <div className="rounded-lg border border-line bg-surface-muted/40 px-3 py-3 text-xs text-muted-foreground">
          <p>
            Questa pagina è protetta lato server e restituisce{" "}
            <Mono>404</Mono> a tutti gli utenti non autorizzati.
          </p>
          <p className="mt-1.5">
            I dati mostrati non includono: importi finanziari, titoli di voci,
            note, beneficiari, dettagli di spesa, segreti di configurazione,
            token di sessione o contenuto di localStorage.
          </p>
          <p className="mt-1.5">
            Accesso consentito solo all&apos;account: <Mono>{DEVELOPER_EMAIL}</Mono>
          </p>
        </div>
      </DebugSection>
    </main>
  );
}
