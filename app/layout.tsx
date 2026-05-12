import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/src/components/layout/app-shell";
import { RegisterSW } from "@/src/components/pwa/register-sw";
import { getThemeBootstrapScript } from "@/src/lib/theme";
import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { getCurrentWorkspaceUiContext } from "@/src/lib/workspace-context";
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
  icons: {
    icon: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const workspace = await getCurrentWorkspaceUiContext();
  const authenticatedUser = await getAuthenticatedUser();

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
        <AppShell
          workspace={workspace}
          auth={{
            isAuthenticated: Boolean(authenticatedUser),
            userLabel:
              authenticatedUser?.name ?? authenticatedUser?.email ?? null,
          }}
        >
          {children}
        </AppShell>
        <RegisterSW />
      </body>
    </html>
  );
}
