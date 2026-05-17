import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/src/components/layout/app-shell";
import { PostHogNavigationTracker } from "@/src/components/analytics/posthog-navigation-tracker";
import { RegisterSW } from "@/src/components/pwa/register-sw";
import { getThemeBootstrapScript } from "@/src/lib/theme";
import { getAuthenticatedUser } from "@/src/lib/auth/session";
import {
  getCurrentWorkspaceMembers,
  getWorkspaceShellContext,
} from "@/src/lib/workspace-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Non l'ho comprato",
  description: "Traccia quanto spendi e quanto hai evitato di buttare.",
  appleWebApp: {
    capable: true,
    title: "NLC",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authenticatedUser = await getAuthenticatedUser();
  const workspaceShell = authenticatedUser ? await getWorkspaceShellContext() : null;
  const workspaceMembers =
    authenticatedUser && workspaceShell
      ? await getCurrentWorkspaceMembers()
      : [];

  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }} />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <PostHogNavigationTracker userId={authenticatedUser?.id ?? null} />
        {authenticatedUser && workspaceShell ? (
          <AppShell
            workspace={workspaceShell.currentWorkspace}
            availableWorkspaces={workspaceShell.availableWorkspaces}
            workspaceMembers={workspaceMembers}
            currentUserId={authenticatedUser.id}
            auth={{
              isAuthenticated: true,
              userLabel: authenticatedUser.name ?? authenticatedUser.email ?? null,
            }}
          >
            {children}
          </AppShell>
        ) : (
          children
        )}
        <RegisterSW />
      </body>
    </html>
  );
}
