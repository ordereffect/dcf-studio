import { NextResponse } from "next/server";
import { fetchWatchQuotes } from "@/lib/data/quotes";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX = 60;

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("symbols") ?? "";
  const tickers = [...new Set(raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (!tickers.length) return NextResponse.json([]);
  if (tickers.length > MAX) return NextResponse.json({ error: `At most ${MAX} symbols at once.` }, { status: 400 });
  if (tickers.some((t) => !/^[A-Z0-9.\-^]{1,12}$/.test(t))) {
    return NextResponse.json({ error: "One of those doesn't look like a ticker." }, { status: 400 });
  }
  const quotes = await fetchWatchQuotes(tickers);
  return NextResponse.json(quotes, {
    // Prices move: a short shared cache keeps a refreshing page cheap without going stale.
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
