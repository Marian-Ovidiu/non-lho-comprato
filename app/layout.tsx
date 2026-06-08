import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

import { AppShell } from "@/src/components/layout/app-shell";
import { PostHogNavigationTracker } from "@/src/components/analytics/posthog-navigation-tracker";
import { RegisterSW } from "@/src/components/pwa/register-sw";
import { SplashGate } from "@/src/components/splash/splash-gate";
import { getSplashBootstrapScript, SPLASH_SHELL_ID } from "@/src/lib/splash";
import { getThemeBootstrapScript } from "@/src/lib/theme";
import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { getWorkspaceShellContext } from "@/src/lib/workspace-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
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
    { media: "(prefers-color-scheme: light)", color: "#15331e" },
    { media: "(prefers-color-scheme: dark)", color: "#15331e" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authenticatedUser = await getAuthenticatedUser();
  const workspaceShell = authenticatedUser ? await getWorkspaceShellContext() : null;

  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }} />
      </head>
      <body className="min-h-[100dvh] flex flex-col bg-background text-foreground">
        <div id={SPLASH_SHELL_ID} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-euro.png" alt="" width={168} height={168} decoding="sync" />
        </div>
        <script dangerouslySetInnerHTML={{ __html: getSplashBootstrapScript() }} />
        <SplashGate>
          <PostHogNavigationTracker userId={authenticatedUser?.id ?? null} />
          {authenticatedUser && workspaceShell ? (
            <AppShell
              workspace={workspaceShell.currentWorkspace}
              availableWorkspaces={workspaceShell.availableWorkspaces}
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
        </SplashGate>
      </body>
    </html>
  );
}
