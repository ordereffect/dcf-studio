import "server-only";
import type { CompanyData } from "@/lib/dcf/types";
import { isFinancial } from "@/lib/dcf/defaults";
import { fetchEdgar } from "./edgar";
import { fetchMarket, fetchRiskFree, fetchYahooFundamentals } from "./market";

export async function getCompany(ticker: string): Promise<CompanyData> {
  const t = ticker.trim().toUpperCase();
  const warnings: string[] = [];
  const sources: string[] = [];

  const [edgar, market, rf] = await Promise.allSettled([fetchEdgar(t), fetchMarket(t), fetchRiskFree()]);

  const e = edgar.status === "fulfilled" ? edgar.value : null;
  const secError = edgar.status === "rejected" ? String(edgar.reason?.message ?? edgar.reason) : null;
  if (e?.historicals.length) sources.push("SEC EDGAR (10-K / 20-F XBRL)");

  // Backup: Yahoo annual financials when SEC is unavailable or has no filings for this ticker.
  let historicals = e?.historicals ?? [];
  if (!historicals.length) {
    try {
      historicals = await fetchYahooFundamentals(t);
    } catch {
      historicals = [];
    }
    if (historicals.length) {
      sources.push("Yahoo Finance (annual financials)");
      warnings.push(
        secError
          ? `SEC filings unavailable (${secError}${/403/.test(secError) ? "; set SEC_USER_AGENT with a contact email in Vercel" : ""}), so history comes from Yahoo and covers fewer years.`
          : "No SEC filings for this ticker, so history comes from Yahoo Finance and covers fewer years.",
      );
    } else {
      warnings.push(
        secError
          ? `SEC filings unavailable: ${secError}. Enter financials by hand.`
          : "No financial history found for this ticker. Enter financials by hand.",
      );
    }
  }

  const m = market.status === "fulfilled" ? market.value : null;
  if (market.status === "rejected") warnings.push("Live price unavailable from Yahoo Finance. Enter the price by hand.");
  else sources.push("Yahoo Finance (price, beta, shares)");

  const r = rf.status === "fulfilled" ? rf.value : null;
  if (r) sources.push("US 10Y Treasury (^TNX)");

  if (!e && !m) throw new Error(`Could not find ${t}. Check the ticker, or start a blank model.`);

  if (e && m?.currency && e.currency !== m.currency) {
    warnings.push(`Financials are reported in ${e.currency} but the stock trades in ${m.currency}. Convert before comparing value to price.`);
  }

  const lastYear = historicals.at(-1);
  const financial = isFinancial({ sector: m?.sector, industry: m?.industry });
  // Financials get an approach note in the workbench instead, since it depends on the toggle.
  if (!financial && lastYear && lastYear.operatingIncome == null && lastYear.pretaxIncome != null) {
    warnings.push("The filings don't report operating income, so margins start from pre-tax income. Check them against the income statement.");
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
    historicals,
    riskFreeRate: r,
    sources,
    warnings,
    fetchedAt: new Date().toISOString(),
  };
}
