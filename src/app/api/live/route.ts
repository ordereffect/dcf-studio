import { NextResponse } from "next/server";
import { fetchLiveQuotes } from "@/lib/data/live";

export const runtime = "nodejs";
export const maxDuration = 20;

const MAX = 60;

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("symbols") ?? "";
  const tickers = [...new Set(raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (!tickers.length) return NextResponse.json([]);
  if (tickers.length > MAX) return NextResponse.json({ error: `At most ${MAX} symbols at once.` }, { status: 400 });
  if (tickers.some((t) => !/^[A-Z0-9.\-^]{1,12}$/.test(t))) {
    return NextResponse.json({ error: "One of those doesn't look like a ticker." }, { status: 400 });
  }
  const quotes = await fetchLiveQuotes(tickers);
  // A 10-second shared cache: many viewers polling the same list cost one upstream call.
  return NextResponse.json(quotes, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" } });
}
