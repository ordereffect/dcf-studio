import "server-only";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/** One watchlist row. Percentages and yields are decimals (0.012 = 1.2%); dates are ISO yyyy-mm-dd. */
export interface WatchQuote {
  ticker: string;
  name: string | null;
  currency: string | null;
  price: number | null;
  changePct: number | null;
  preMarketChangePct: number | null;
  postMarketChangePct: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  targetMeanPrice: number | null;
  analystCount: number | null;
  earningsDate: string | null;
  dividendDate: string | null;
  exDividendDate: string | null;
  forwardDividendYield: number | null;
  error?: string;
}

const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
const d = (x: unknown) => {
  const t = x instanceof Date ? x : typeof x === "string" || typeof x === "number" ? new Date(x) : null;
  return t && !Number.isNaN(t.getTime()) ? t.toISOString().slice(0, 10) : null;
};

/** The next upcoming date in a list, or the latest one if all are past. */
function nextDate(xs: unknown): string | null {
  const all = (Array.isArray(xs) ? xs : [xs]).map(d).filter((x): x is string => !!x).sort();
  const today = new Date().toISOString().slice(0, 10);
  return all.find((x) => x >= today) ?? all.at(-1) ?? null;
}

export async function fetchWatchQuote(ticker: string): Promise<WatchQuote> {
  const symbol = ticker.toUpperCase().replace(".", "-");
  const q = await yf.quoteSummary(symbol, {
    modules: ["price", "summaryDetail", "defaultKeyStatistics", "financialData", "calendarEvents"],
  });
  const p = q.price;
  const s = q.summaryDetail;
  const f = q.financialData;
  const c = q.calendarEvents;
  return {
    ticker: ticker.toUpperCase(),
    name: p?.shortName ?? p?.longName ?? null,
    currency: p?.currency ?? null,
    price: n(p?.regularMarketPrice),
    changePct: n(p?.regularMarketChangePercent),
    preMarketChangePct: n(p?.preMarketChangePercent),
    postMarketChangePct: n(p?.postMarketChangePercent),
    trailingPE: n(s?.trailingPE),
    forwardPE: n(s?.forwardPE) ?? n(q.defaultKeyStatistics?.forwardPE),
    targetMeanPrice: n(f?.targetMeanPrice),
    analystCount: n(f?.numberOfAnalystOpinions),
    earningsDate: nextDate(c?.earnings?.earningsDate),
    dividendDate: d(c?.dividendDate),
    exDividendDate: d(c?.exDividendDate ?? s?.exDividendDate),
    // summaryDetail.dividendYield is the forward annual dividend over price.
    forwardDividendYield: n(s?.dividendYield),
  };
}

const blank = (ticker: string, error: string): WatchQuote => ({
  ticker,
  name: null,
  currency: null,
  price: null,
  changePct: null,
  preMarketChangePct: null,
  postMarketChangePct: null,
  trailingPE: null,
  forwardPE: null,
  targetMeanPrice: null,
  analystCount: null,
  earningsDate: null,
  dividendDate: null,
  exDividendDate: null,
  forwardDividendYield: null,
  error,
});

/** Quotes for many tickers, a few at a time so Yahoo doesn't throttle us. One bad ticker never sinks the rest. */
export async function fetchWatchQuotes(tickers: string[], concurrency = 6): Promise<WatchQuote[]> {
  const out: WatchQuote[] = new Array(tickers.length);
  let next = 0;
  const worker = async () => {
    while (next < tickers.length) {
      const i = next++;
      try {
        out[i] = await fetchWatchQuote(tickers[i]);
      } catch (e) {
        out[i] = blank(tickers[i].toUpperCase(), e instanceof Error ? e.message : "Quote unavailable");
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, tickers.length) }, worker));
  return out;
}
