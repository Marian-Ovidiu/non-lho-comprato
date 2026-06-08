"use client";

import { useEffect, useState } from "react";

import { AppSplash } from "@/src/components/splash/app-splash";

type SplashGateProps = {
  children: React.ReactNode;
};

export function SplashGate({ children }: SplashGateProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!sessionStorage.getItem("nlc-splash-seen"));
  }, []);

  return (
    <>
      {children}
      {show ? (
        <AppSplash
          minDuration={2200}
          onDone={() => {
            sessionStorage.setItem("nlc-splash-seen", "1");
            setShow(false);
          }}
        />
      ) : null}
    </>
  );
}
