"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type BrowserInfo = {
  pathname: string;
  userAgent: string;
  viewport: string;
  timezone: string;
  locale: string;
  displayMode: string;
  online: boolean;
  swController: boolean;
  swRegistrations: number | null;
  localTime: string;
};

function readBrowserInfo(pathname: string): BrowserInfo {
  const nav = navigator as Navigator & { standalone?: boolean };
  const standalone =
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;

  return {
    pathname,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
    displayMode: standalone ? "standalone" : "browser",
    online: navigator.onLine,
    swController: Boolean(navigator.serviceWorker?.controller),
    swRegistrations: null,
    localTime: new Date().toISOString(),
  };
}

export function DebugBrowserInfo() {
  const pathname = usePathname();
  const [info, setInfo] = useState<BrowserInfo | null>(null);

  useEffect(() => {
    const base = readBrowserInfo(pathname);

    const swCountPromise: Promise<number | null> =
      "serviceWorker" in navigator
        ? navigator.serviceWorker
            .getRegistrations()
            .then((regs) => regs.length)
            .catch(() => 0)
        : Promise.resolve(null);

    void swCountPromise.then((swRegistrations) => {
      setInfo({ ...base, swRegistrations });
    });
  }, [pathname]);

  if (!info) {
    return <p className="text-xs text-muted-foreground">Caricamento…</p>;
  }

  return (
    <DebugTable
      rows={[
        ["Pathname", info.pathname],
        ["Viewport", info.viewport],
        ["Display mode", info.displayMode],
        ["Locale", info.locale],
        ["Timezone", info.timezone],
        ["Online", info.online ? "sì" : "no"],
        ["SW controller", info.swController ? "sì" : "no"],
        ["SW registrations", info.swRegistrations !== null ? String(info.swRegistrations) : "—"],
        ["Local time", info.localTime],
        ["User agent", info.userAgent],
      ]}
    />
  );
}

export function DebugTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="divide-y divide-line-soft overflow-hidden rounded-lg border border-line">
      {rows.map(([label, value]) => (
        <div key={label} className="flex min-h-10 items-start gap-3 px-3 py-2.5">
          <span className="w-36 shrink-0 text-xs font-medium text-muted-foreground">
            {label}
          </span>
          <span className="min-w-0 break-all font-mono text-xs text-foreground">
            {value || "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
