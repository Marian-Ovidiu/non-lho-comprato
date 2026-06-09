"use client";

import { useLayoutEffect, useState } from "react";

import { AppSplash } from "@/src/components/splash/app-splash";
import { SPLASH_SEEN_KEY } from "@/src/lib/splash";

type SplashGateProps = {
  children: React.ReactNode;
};

export function SplashGate({ children }: SplashGateProps) {
  // false on SSR + first paint — bootstrap shell covers the screen until we read sessionStorage.
  const [show, setShow] = useState(false);

  useLayoutEffect(() => {
    if (!sessionStorage.getItem(SPLASH_SEEN_KEY)) {
      setShow(true);
    }
  }, []);

  return (
    <>
      {children}
      {show ? (
        <AppSplash
          minDuration={1400}
          fadeDuration={400}
          onDone={() => {
            sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
            setShow(false);
          }}
        />
      ) : null}
    </>
  );
}
