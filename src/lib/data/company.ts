import "server-only";
import type { CompanyData } from "@/lib/dcf/types";
import { fetchEdgar } from "./edgar";
import { fetchMarket, fetchRiskFree } from "./market";

export async function getCompany(ticker: string): Promise<CompanyData> {
  const t = ticker.trim().toUpperCase();
  const warnings: string[] = [];
  const sources: string[] = [];

  const [edgar, market, rf] = await Promise.allSettled([fetchEdgar(t), fetchMarket(t), fetchRiskFree()]);

  const e = edgar.status === "fulfilled" ? edgar.value : null;
  if (edgar.status === "rejected") warnings.push(`SEC filings unavailable: ${String(edgar.reason?.message ?? edgar.reason)}`);
  else if (!e) warnings.push("No SEC filings found for this ticker. v1 covers US-listed companies; enter financials by hand for others.");
  else sources.push("SEC EDGAR (10-K / 20-F XBRL)");

  const m = market.status === "fulfilled" ? market.value : null;
  if (market.status === "rejected") warnings.push("Live price unavailable from Yahoo Finance. Enter the price by hand.");
  else sources.push("Yahoo Finance (price, beta, shares)");

  const r = rf.status === "fulfilled" ? rf.value : null;
  if (r) sources.push("US 10Y Treasury (^TNX)");

  if (!e && !m) throw new Error(`Could not find ${t}. Check the ticker, or start a blank model.`);

  if (e && m?.currency && e.currency !== m.currency) {
    warnings.push(`Financials are reported in ${e.currency} but the stock trades in ${m.currency}. Convert before comparing value to price.`);
  }

  return {
    ticker: t,
    name: m?.name ?? e?.name ?? t,
    exchange: m?.exchange,
    currency: e?.currency ?? m?.currency ?? "USD",
    sector: m?.sector,
    industry: m?.industry,
    description: m?.description,
    price: m?.price ?? null,
    sharesOutstanding: m?.sharesOutstanding ?? e?.sharesOutstanding ?? null,
    marketCap: m?.marketCap ?? null,
    beta: m?.beta ?? null,
    historicals: e?.historicals ?? [],
    riskFreeRate: r,
    sources,
    warnings,
    fetchedAt: new Date().toISOString(),
  };
}
