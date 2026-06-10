"use client";

import { useState } from "react";

import { AppSplash } from "@/src/components/splash/app-splash";

type SplashGateProps = {
  children: React.ReactNode;
};

export function SplashGate({ children }: SplashGateProps) {
  const [show, setShow] = useState(true);

  return (
    <>
      {children}
      {show ? (
        <AppSplash
          minDuration={1800}
          fadeDuration={450}
          onDone={() => setShow(false)}
        />
      ) : null}
    </>
  );
}
