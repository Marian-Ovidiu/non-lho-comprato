import { cacheLife } from "next/cache";

import { SUPPORTED_CURRENCIES } from "@/src/lib/workspace-currency";

const BASE = "EUR";

async function fetchRates(): Promise<Record<string, number>> {
  "use cache";
  cacheLife("days");

  const symbols = SUPPORTED_CURRENCIES.map((c) => c.code)
    .filter((code) => code !== BASE)
    .join(",");

  const res = await fetch(
    `https://api.frankfurter.app/latest?from=${BASE}&symbols=${symbols}`,
  );

  if (!res.ok) {
    throw new Error(`upstream error: ${res.status}`);
  }

  const data = (await res.json()) as { rates?: Record<string, number> };
  return { [BASE]: 1, ...(data.rates ?? {}) };
}

export async function GET() {
  try {
    const rates = await fetchRates();
    return Response.json({ base: BASE, rates });
  } catch {
    return Response.json({ error: "fetch failed" }, { status: 502 });
  }
}
