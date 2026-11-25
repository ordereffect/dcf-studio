import "server-only";
import YahooFinance from "yahoo-finance2";
import type { HistoricalYear } from "@/lib/dcf/types";
import type { Split } from "./shares";

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

/** Stock splits over the last few years, oldest first. Empty when Yahoo has none or is unreachable. */
export async function fetchSplits(ticker: string, years = 3): Promise<Split[]> {
  const symbol = ticker.toUpperCase().replace(".", "-");
  try {
    const r = await yf.chart(symbol, {
      period1: new Date(Date.now() - years * 365 * 86400_000),
      interval: "1mo",
      events: "split",
      return: "array",
    });
    return (r.events?.splits ?? [])
      .filter((s) => s.numerator > 0 && s.denominator > 0)
      .map((s) => ({ date: new Date(s.date).toISOString().slice(0, 10), ratio: s.numerator / s.denominator }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  } catch {
    return [];
  }
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

type Row = Record<string, unknown>;
const pickNum = (r: Row, key: string): number | null => {
  const cap = key[0].toUpperCase() + key.slice(1);
  for (const k of [key, `annual${cap}`]) {
    const v = r[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
};

/**
 * Annual financials from Yahoo Finance (usually the last 4–5 fiscal years). Used as a backup
 * when SEC EDGAR is unavailable, and for non-US tickers.
 */
export async function fetchYahooFundamentals(ticker: string): Promise<HistoricalYear[]> {
  const symbol = ticker.toUpperCase().replace(".", "-");
  const rows = (await yf.fundamentalsTimeSeries(
    symbol,
    { period1: "2010-01-01", type: "annual", module: "all" },
    { validateResult: false },
  )) as unknown as Row[];
  return rows
    .map((r) => {
      const d = r.date instanceof Date ? r.date : new Date(String(r.date));
      const capex = pickNum(r, "capitalExpenditure");
      return {
        fiscalYear: d.getUTCFullYear(),
        periodEnd: d.toISOString().slice(0, 10),
        revenue: pickNum(r, "totalRevenue"),
        operatingIncome: pickNum(r, "operatingIncome") ?? pickNum(r, "totalOperatingIncomeAsReported"),
        pretaxIncome: pickNum(r, "pretaxIncome"),
        incomeTax: pickNum(r, "taxProvision"),
        netIncome: pickNum(r, "netIncome") ?? pickNum(r, "netIncomeFromContinuingOperationNetMinorityInterest"),
        depreciation: pickNum(r, "reconciledDepreciation"),
        capex: capex == null ? null : Math.abs(capex),
        sbc: pickNum(r, "stockBasedCompensation"),
        cash: pickNum(r, "cashCashEquivalentsAndShortTermInvestments") ?? pickNum(r, "cashAndCashEquivalents"),
        totalDebt: pickNum(r, "totalDebt"), // Yahoo's total debt already includes lease obligations
        leaseLiabilities: null,
        equity: pickNum(r, "stockholdersEquity"),
        minorityInterest: pickNum(r, "minorityInterest"),
      };
    })
    .filter((y) => y.revenue != null && y.revenue > 0)
    .sort((a, b) => (a.periodEnd < b.periodEnd ? -1 : 1));
}
