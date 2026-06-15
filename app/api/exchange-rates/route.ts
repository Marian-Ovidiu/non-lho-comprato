import { SUPPORTED_CURRENCIES } from "@/src/lib/workspace-currency";

export const revalidate = 86400; // 24 hours

const BASE = "EUR";

export async function GET() {
  const symbols = SUPPORTED_CURRENCIES.map((c) => c.code)
    .filter((code) => code !== BASE)
    .join(",");

  let rates: Record<string, number>;

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${BASE}&symbols=${symbols}`,
      { next: { revalidate: 86400 } },
    );

    if (!res.ok) {
      return Response.json({ error: "upstream error" }, { status: 502 });
    }

    const data = (await res.json()) as { rates?: Record<string, number> };
    rates = { [BASE]: 1, ...(data.rates ?? {}) };
  } catch {
    return Response.json({ error: "fetch failed" }, { status: 502 });
  }

  return Response.json({ base: BASE, rates });
}
