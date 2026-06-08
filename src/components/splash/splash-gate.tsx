"use client";

import { useState } from "react";

import { AppSplash } from "@/src/components/splash/app-splash";
import { SPLASH_SEEN_KEY } from "@/src/lib/splash";

type SplashGateProps = {
  children: React.ReactNode;
};

function shouldShowSplash() {
  if (typeof window === "undefined") {
    return false;
  }

  return !sessionStorage.getItem(SPLASH_SEEN_KEY);
}

export function SplashGate({ children }: SplashGateProps) {
  const [show, setShow] = useState(shouldShowSplash);

  return (
    <>
      {children}
      {show ? (
        <AppSplash
          minDuration={2700}
          onDone={() => {
            sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
            setShow(false);
          }}
        />
      ) : null}
    </>
  );
}
