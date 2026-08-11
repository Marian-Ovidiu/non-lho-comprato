import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";

import { AppShell } from "@/src/components/layout/app-shell";
import { PostHogNavigationTrackerLoader } from "@/src/components/analytics/posthog-navigation-tracker-loader";
import { RegisterSW } from "@/src/components/pwa/register-sw";
import { SplashBootstrapShell } from "@/src/components/splash/splash-bootstrap-shell";
import { SplashGate } from "@/src/components/splash/splash-gate";
import { ThemeProvider } from "@/src/components/theme/theme-provider";
import {
  getSplashBootstrapScript,
  getSplashCriticalCss,
} from "@/src/lib/splash";
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

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
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
  description: "Le spese di casa, condivise: chi ha pagato, per chi, e cosa cambia mese dopo mese.",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "NLC",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  // Era #0E0D0B, il fondo della vecchia palette oro: la barra di stato del
  // telefono restava calda mentre l'app sotto era salvia.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b1512" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1512" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${instrumentSans.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <style dangerouslySetInnerHTML={{ __html: getSplashCriticalCss() }} />
        <script dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }} />
        <script dangerouslySetInnerHTML={{ __html: getSplashBootstrapScript() }} />
      </head>
      <body className="min-h-[100dvh] flex flex-col bg-background text-foreground">
        <SplashBootstrapShell />
        <ThemeProvider>
          <SplashGate>
            <Suspense fallback={children}>
              <LayoutAuthShell>{children}</LayoutAuthShell>
            </Suspense>
            <RegisterSW />
          </SplashGate>
        </ThemeProvider>
      </body>
    </html>
  );
}

async function LayoutAuthShell({ children }: { children: React.ReactNode }) {
  const authenticatedUser = await getAuthenticatedUser();
  let workspaceShell: Awaited<ReturnType<typeof getWorkspaceShellContext>> | null =
    null;

  if (authenticatedUser) {
    try {
      workspaceShell = await getWorkspaceShellContext();
    } catch (error) {
      console.error("Failed to load workspace shell context:", error);
    }
  }

  return (
    <>
      <PostHogNavigationTrackerLoader userId={authenticatedUser?.id ?? null} />
      {authenticatedUser && workspaceShell ? (
        <AppShell
          workspace={workspaceShell.currentWorkspace}
          availableWorkspaces={workspaceShell.availableWorkspaces}
          currency={workspaceShell.currentWorkspace.currency ?? "EUR"}
          language={workspaceShell.currentWorkspace.language ?? "it"}
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
    </>
  );
}
