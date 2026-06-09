"use client";

import { useEffect, useState } from "react";

import { AppSplash } from "@/src/components/splash/app-splash";
import { SPLASH_SEEN_KEY } from "@/src/lib/splash";

type SplashGateProps = {
  children: React.ReactNode;
};

export function SplashGate({ children }: SplashGateProps) {
  // Always false on SSR + first client paint so markup matches before sessionStorage is read.
  const [show, setShow] = useState(false);

  useEffect(() => {
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
