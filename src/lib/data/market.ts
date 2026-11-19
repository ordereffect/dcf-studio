import "server-only";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface MarketData {
  name?: string;
  exchange?: string;
  currency?: string;
  price: number | null;
  sharesOutstanding: number | null;
  marketCap: number | null;
  beta: number | null;
  sector?: string;
  industry?: string;
  description?: string;
}

export async function fetchMarket(ticker: string): Promise<MarketData> {
  const symbol = ticker.toUpperCase().replace(".", "-");
  const q = await yf.quoteSummary(symbol, {
    modules: ["price", "summaryDetail", "defaultKeyStatistics", "assetProfile"],
  });
  return {
    name: q.price?.longName ?? q.price?.shortName ?? undefined,
    exchange: q.price?.exchangeName ?? undefined,
    currency: q.price?.currency ?? undefined,
    price: q.price?.regularMarketPrice ?? null,
    sharesOutstanding: q.defaultKeyStatistics?.sharesOutstanding ?? null,
    marketCap: q.price?.marketCap ?? q.summaryDetail?.marketCap ?? null,
    beta: q.summaryDetail?.beta ?? q.defaultKeyStatistics?.beta ?? null,
    sector: q.assetProfile?.sector ?? undefined,
    industry: q.assetProfile?.industry ?? undefined,
    description: q.assetProfile?.longBusinessSummary ?? undefined,
  };
}

/** US 10-year Treasury yield as a decimal, from the ^TNX index (quoted in percent). */
export async function fetchRiskFree(): Promise<number | null> {
  try {
    const q = await yf.quote("^TNX");
    const v = q?.regularMarketPrice;
    return typeof v === "number" && v > 0 ? v / 100 : null;
  } catch {
    return null;
  }
}
