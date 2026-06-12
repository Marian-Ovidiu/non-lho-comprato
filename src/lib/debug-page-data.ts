import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedUser, getCurrentWorkspace } from "@/src/lib/auth/session";
import { isSentryEnabled } from "@/src/lib/sentry";

export type DebugSessionData = {
  userId: string;
  email: string | null;
  displayName: string | null;
};

export type DebugWorkspaceData = {
  id: string;
  name: string;
  kind: string;
  role: string | null;
  memberCount: number;
} | null;

export type DebugEnvData = {
  nodeEnv: string;
  vercelEnv: string | null;
  appVersion: string;
  commitSha: string | null;
  databaseConfigured: boolean;
  sentryConfigured: boolean;
  posthogConfigured: boolean;
};

export type DebugFeedbackRow = {
  id: string;
  createdAt: string;
  type: string;
  messageExcerpt: string;
  route: string | null;
  displayMode: string | null;
  viewport: string | null;
  locale: string | null;
  timezone: string | null;
  userEmail: string | null;
  userId: string | null;
  workspaceName: string | null;
  workspaceId: string | null;
};

export type DebugPageData = {
  session: DebugSessionData;
  workspace: DebugWorkspaceData;
  env: DebugEnvData;
  recentFeedback: DebugFeedbackRow[];
};

export async function getDebugPageData(): Promise<DebugPageData> {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const session: DebugSessionData = {
    userId: user.id,
    email: user.email,
    displayName: user.name,
  };

  let workspace: DebugWorkspaceData = null;
  try {
    const ws = await getCurrentWorkspace();
    const [memberCount, membership] = await Promise.all([
      prisma.workspaceMember.count({ where: { workspaceId: ws.id } }),
      prisma.workspaceMember.findFirst({
        where: { workspaceId: ws.id, userId: user.id },
        select: { role: true },
      }),
    ]);
    workspace = {
      id: ws.id,
      name: ws.name,
      kind: ws.kind,
      role: membership?.role ?? null,
      memberCount,
    };
  } catch {
    // workspace context unavailable — leave null
  }

  const env: DebugEnvData = {
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    vercelEnv: process.env.VERCEL_ENV ?? null,
    appVersion: "0.1.0",
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? null,
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    sentryConfigured: isSentryEnabled(),
    posthogConfigured:
      Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) &&
      (process.env.NODE_ENV === "production" ||
        process.env.NEXT_PUBLIC_POSTHOG_ENABLED === "true"),
  };

  const rawFeedback = await prisma.feedback.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      type: true,
      message: true,
      route: true,
      displayMode: true,
      viewport: true,
      locale: true,
      timezone: true,
      userId: true,
      workspaceId: true,
      user: { select: { email: true } },
      workspace: { select: { name: true } },
    },
  });

  const recentFeedback: DebugFeedbackRow[] = rawFeedback.map((f) => ({
    id: f.id,
    createdAt: f.createdAt.toISOString(),
    type: f.type,
    messageExcerpt: f.message.length > 200 ? f.message.slice(0, 200) + "…" : f.message,
    route: f.route,
    displayMode: f.displayMode,
    viewport: f.viewport,
    locale: f.locale,
    timezone: f.timezone,
    userId: f.userId,
    userEmail: f.user?.email ?? null,
    workspaceId: f.workspaceId,
    workspaceName: f.workspace?.name ?? null,
  }));

  return { session, workspace, env, recentFeedback };
}
