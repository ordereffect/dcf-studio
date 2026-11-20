import "server-only";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/** A last-trade price. changePct is a decimal (0.012 = 1.2%); time is epoch ms of the quote. */
export interface LiveQuote {
  ticker: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  previousClose: number | null;
  time: number | null;
  source: "finnhub" | "yahoo" | "none";
}

const FINNHUB = "https://finnhub.io/api/v1/quote";
const TTL_MS = 10_000;

/**
 * Per-instance cache so repeat polls inside 10s don't spend Finnhub calls. The free tier allows
 * 60 calls a minute; when it says 429 we stop asking until the next minute and use Yahoo instead.
 */
const cache = new Map<string, { at: number; q: LiveQuote }>();
let finnhubBlockedUntil = 0;

const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);

async function finnhubQuote(ticker: string, key: string): Promise<LiveQuote | null> {
  if (Date.now() < finnhubBlockedUntil) return null;
  const r = await fetch(`${FINNHUB}?symbol=${encodeURIComponent(ticker)}`, {
    headers: { "X-Finnhub-Token": key },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (r.status === 429) {
    finnhubBlockedUntil = Date.now() + 60_000;
    return null;
  }
  if (!r.ok) return null;
  const j = (await r.json()) as Record<string, unknown>;
  const price = num(j.c);
  // Finnhub answers unknown symbols with zeros rather than an error.
  if (!price) return null;
  const dp = num(j.dp);
  const t = num(j.t);
  return {
    ticker,
    price,
    change: num(j.d),
    changePct: dp == null ? null : dp / 100,
    previousClose: num(j.pc),
    time: t ? t * 1000 : null,
    source: "finnhub",
  };
}

async function yahooQuotes(tickers: string[]): Promise<Map<string, LiveQuote>> {
  const out = new Map<string, LiveQuote>();
  if (!tickers.length) return out;
  try {
    const symbols = tickers.map((t) => t.replace(".", "-"));
    const rows = await yf.quote(symbols, { return: "array" });
    for (const q of rows) {
      const ticker = tickers[symbols.indexOf(q.symbol)] ?? q.symbol;
      const pct = num(q.regularMarketChangePercent);
      const time = q.regularMarketTime instanceof Date ? q.regularMarketTime.getTime() : null;
      out.set(ticker, {
        ticker,
        price: num(q.regularMarketPrice),
        change: num(q.regularMarketChange),
        changePct: pct == null ? null : pct / 100, // quote() reports percent units
        previousClose: num(q.regularMarketPreviousClose),
        time,
        source: "yahoo",
      });
    }
  } catch {
    /* Yahoo down too: callers get source "none" */
  }
  return out;
}

/** Finnhub first when FINNHUB_API_KEY is set; Yahoo for anything Finnhub can't answer. */
export async function fetchLiveQuotes(tickers: string[]): Promise<LiveQuote[]> {
  const key = process.env.FINNHUB_API_KEY?.trim();
  const now = Date.now();
  const result = new Map<string, LiveQuote>();
  const todo: string[] = [];
  for (const t of tickers) {
    const hit = cache.get(t);
    if (hit && now - hit.at < TTL_MS) result.set(t, hit.q);
    else todo.push(t);
  }

  const missing: string[] = [];
  if (key) {
    // Sequential in small batches: Finnhub also caps bursts at 30 calls a second.
    for (let i = 0; i < todo.length; i += 10) {
      const batch = todo.slice(i, i + 10);
      const got = await Promise.all(batch.map((t) => finnhubQuote(t, key).catch(() => null)));
      batch.forEach((t, j) => {
        const q = got[j];
        if (q) {
          result.set(t, q);
          cache.set(t, { at: now, q });
        } else missing.push(t);
      });
    }
  } else missing.push(...todo);

  const fallback = await yahooQuotes(missing);
  for (const t of missing) {
    const q = fallback.get(t) ?? { ticker: t, price: null, change: null, changePct: null, previousClose: null, time: null, source: "none" as const };
    result.set(t, q);
    if (q.source === "yahoo") cache.set(t, { at: now, q });
  }
  return tickers.map((t) => result.get(t)!);
}

export const hasFinnhubKey = () => !!process.env.FINNHUB_API_KEY?.trim();
