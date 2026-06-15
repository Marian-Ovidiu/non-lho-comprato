"use client";

import { createContext, useContext } from "react";

import { getCurrencySymbol } from "@/src/lib/workspace-currency";

const CurrencyContext = createContext("EUR");

export function CurrencyProvider({
  currency,
  children,
}: {
  currency: string;
  children: React.ReactNode;
}) {
  return (
    <CurrencyContext.Provider value={currency}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrencyCode(): string {
  return useContext(CurrencyContext);
}

export function useCurrencySymbol(): string {
  return getCurrencySymbol(useContext(CurrencyContext));
}
