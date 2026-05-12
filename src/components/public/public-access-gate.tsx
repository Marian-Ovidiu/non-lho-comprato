"use client";

import { LoginPanel } from "@/src/components/auth/login-panel";
import { useDisplayMode } from "@/src/hooks/use-display-mode";

import { PublicLanding } from "./public-landing";

export function PublicAccessGate() {
  const { isStandalone } = useDisplayMode();

  if (isStandalone) {
    return <LoginPanel providers={["google"]} />;
  }

  return <PublicLanding />;
}
