import "server-only";
import type { HistoricalYear } from "@/lib/dcf/types";

/**
 * SEC EDGAR XBRL "company facts" API. Free, no key. SEC asks every client to send a
 * descriptive User-Agent with a contact address: set SEC_USER_AGENT in your environment,
 * e.g. "DCF Studio you@example.com".
 */
const UA = process.env.SEC_USER_AGENT || "DCF Studio personal-research";

export const secHeaders = { "User-Agent": UA, Accept: "application/json" };
const headers = secHeaders;

interface TickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

let tickerCache: { at: number; map: Map<string, TickerEntry> } | null = null;

export async function loadTickerMap(): Promise<Map<string, TickerEntry>> {
  if (tickerCache && Date.now() - tickerCache.at < 24 * 3600_000) return tickerCache.map;
  const res = await fetch("https://www.sec.gov/files/company_tickers.json", { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`SEC ticker list returned ${res.status}`);
  const json = (await res.json()) as Record<string, TickerEntry>;
  const map = new Map<string, TickerEntry>();
  for (const e of Object.values(json)) map.set(e.ticker.toUpperCase(), e);
  tickerCache = { at: Date.now(), map };
  return map;
}

export async function searchTickers(q: string, limit = 8) {
  const map = await loadTickerMap();
  const query = q.trim().toUpperCase();
  if (!query) return [];
  const out: { ticker: string; name: string }[] = [];
  const exact = map.get(query);
  if (exact) out.push({ ticker: exact.ticker, name: exact.title });
  for (const e of map.values()) {
    if (out.length >= limit) break;
    if (e === exact) continue;
    if (e.ticker.startsWith(query) || e.title.toUpperCase().includes(query)) out.push({ ticker: e.ticker, name: e.title });
  }
  return out;
}

interface FactPoint {
  start?: string;
  end: string;
  val: number;
  fy?: number;
  fp?: string;
  form?: string;
  filed?: string;
}
type Facts = Record<string, Record<string, { units: Record<string, FactPoint[]> }>>;

const ANNUAL_FORMS = new Set(["10-K", "10-K/A", "20-F", "20-F/A", "40-F", "40-F/A", "10-KT"]);

function days(a: string, b: string) {
  return (Date.parse(b) - Date.parse(a)) / 86400_000;
}

/** Pick the unit list for a concept, preferring the reporting currency. */
function unitPoints(facts: Facts, taxonomy: string, tag: string, currency: string): FactPoint[] | null {
  const concept = facts[taxonomy]?.[tag];
  if (!concept) return null;
  return concept.units[currency] ?? concept.units.USD ?? Object.values(concept.units)[0] ?? null;
}

/** Annual values keyed by period-end date. Duration facts must span ~a year; latest filing wins. */
function annualSeries(points: FactPoint[], kind: "duration" | "instant"): Map<string, number> {
  const best = new Map<string, FactPoint>();
  for (const p of points) {
    if (!p.form || !ANNUAL_FORMS.has(p.form)) continue;
    if (kind === "duration") {
      if (!p.start) continue;
      const d = days(p.start, p.end);
      if (d < 340 || d > 390) continue;
    }
    const prev = best.get(p.end);
    if (!prev || (p.filed ?? "") > (prev.filed ?? "")) best.set(p.end, p);
  }
  return new Map([...best].map(([k, v]) => [k, v.val]));
}

/** First tag (in priority order) with data for a given period end. Merges across tags so renamed concepts still fill gaps. */
function pick(
  facts: Facts,
  tags: string[],
  kind: "duration" | "instant",
  currency: string,
): Map<string, number> {
  const merged = new Map<string, number>();
  for (const tag of tags) {
    const [tax, name] = tag.includes(":") ? tag.split(":") : ["us-gaap", tag];
    const pts = unitPoints(facts, tax, name, currency);
    if (!pts) continue;
    for (const [end, v] of annualSeries(pts, kind)) if (!merged.has(end)) merged.set(end, v);
  }
  return merged;
}

const TAGS = {
  revenue: [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "SalesRevenueNet",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
    "SalesRevenueGoodsNet",
    "ifrs-full:Revenue",
  ],
  operatingIncome: ["OperatingIncomeLoss", "ifrs-full:ProfitLossFromOperatingActivities"],
  pretaxIncome: [
    "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
    "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments",
    "IncomeLossFromContinuingOperationsBeforeIncomeTaxesDomestic",
    "ifrs-full:ProfitLossBeforeTax",
  ],
  incomeTax: ["IncomeTaxExpenseBenefit", "ifrs-full:IncomeTaxExpenseContinuingOperations"],
  netIncome: ["NetIncomeLoss", "ifrs-full:ProfitLossAttributableToOwnersOfParent", "ifrs-full:ProfitLoss"],
  depreciation: [
    "DepreciationDepletionAndAmortization",
    "DepreciationAmortizationAndAccretionNet",
    "DepreciationAndAmortization",
    "Depreciation",
    "ifrs-full:DepreciationAndAmortisationExpense",
  ],
  capex: [
    "PaymentsToAcquirePropertyPlantAndEquipment",
    "PaymentsToAcquireProductiveAssets",
    "ifrs-full:PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities",
  ],
  sbc: ["ShareBasedCompensation", "AllocatedShareBasedCompensationExpense"],
  cash: [
    "CashAndCashEquivalentsAtCarryingValue",
    "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
    "ifrs-full:CashAndCashEquivalents",
  ],
  shortTermInvestments: ["ShortTermInvestments", "MarketableSecuritiesCurrent", "AvailableForSaleSecuritiesDebtSecuritiesCurrent"],
  longTermDebt: ["LongTermDebtNoncurrent", "LongTermDebt", "ifrs-full:NoncurrentPortionOfNoncurrentBorrowings"],
  currentDebt: ["LongTermDebtCurrent", "DebtCurrent", "ifrs-full:CurrentPortionOfNoncurrentBorrowings"],
  shortTermBorrowings: ["ShortTermBorrowings", "CommercialPaper", "ifrs-full:ShorttermBorrowings"],
  leases: ["OperatingLeaseLiability", "ifrs-full:LeaseLiabilities"],
  leasesNoncurrent: ["OperatingLeaseLiabilityNoncurrent"],
  equity: [
    "StockholdersEquity",
    "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    "ifrs-full:EquityAttributableToOwnersOfParent",
  ],
  minority: ["MinorityInterest", "ifrs-full:NoncontrollingInterests"],
};

export interface EdgarResult {
  cik: string;
  name: string;
  currency: string;
  historicals: HistoricalYear[];
  sharesOutstanding: number | null;
}

export async function fetchEdgar(ticker: string, years = 10): Promise<EdgarResult | null> {
  const map = await loadTickerMap();
  const entry = map.get(ticker.toUpperCase()) ?? map.get(ticker.toUpperCase().replace(".", "-"));
  if (!entry) return null;
  const cik = String(entry.cik_str).padStart(10, "0");
  const res = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`SEC company facts returned ${res.status}`);
  const json = (await res.json()) as { entityName: string; facts: Facts };
  const facts = json.facts;

  // Reporting currency: whichever unit the revenue concept uses.
  const revConcept = TAGS.revenue
    .map((t) => (t.includes(":") ? facts[t.split(":")[0]]?.[t.split(":")[1]] : facts["us-gaap"]?.[t]))
    .find(Boolean);
  const currency = revConcept ? (Object.keys(revConcept.units).find((u) => /^[A-Z]{3}$/.test(u)) ?? "USD") : "USD";

  const s = Object.fromEntries(
    Object.entries(TAGS).map(([k, tags]) => {
      const instant = ["cash", "shortTermInvestments", "longTermDebt", "currentDebt", "shortTermBorrowings", "leases", "leasesNoncurrent", "equity", "minority"].includes(k);
      return [k, pick(facts, tags, instant ? "instant" : "duration", currency)];
    }),
  ) as Record<keyof typeof TAGS, Map<string, number>>;

  const ends = [...s.revenue.keys()].sort().slice(-years);
  const g = (m: Map<string, number>, e: string) => (m.has(e) ? m.get(e)! : null);
  const sum = (...xs: (number | null)[]) => (xs.every((x) => x == null) ? null : xs.reduce<number>((a, x) => a + (x ?? 0), 0));

  const historicals: HistoricalYear[] = ends.map((end) => ({
    fiscalYear: Number(end.slice(0, 4)),
    periodEnd: end,
    revenue: g(s.revenue, end),
    operatingIncome: g(s.operatingIncome, end),
    pretaxIncome: g(s.pretaxIncome, end),
    incomeTax: g(s.incomeTax, end),
    netIncome: g(s.netIncome, end),
    depreciation: g(s.depreciation, end),
    capex: g(s.capex, end),
    sbc: g(s.sbc, end),
    cash: sum(g(s.cash, end), g(s.shortTermInvestments, end)),
    totalDebt: sum(g(s.longTermDebt, end), g(s.currentDebt, end), g(s.shortTermBorrowings, end)),
    leaseLiabilities: g(s.leases, end) ?? g(s.leasesNoncurrent, end),
    equity: g(s.equity, end),
    minorityInterest: g(s.minority, end),
  }));

  const sharesPts = facts.dei?.EntityCommonStockSharesOutstanding?.units?.shares ?? [];
  const latestShares = [...sharesPts].sort((a, b) => (a.end < b.end ? 1 : -1));
  // Multi-class companies report one fact per class on the same date: sum them.
  let sharesOutstanding: number | null = null;
  if (latestShares.length) {
    const d = latestShares[0].end;
    const sameDay = latestShares.filter((p) => p.end === d && p.filed === latestShares[0].filed);
    sharesOutstanding = sameDay.reduce((a, p) => a + p.val, 0);
  }

  return { cik, name: json.entityName, currency, historicals, sharesOutstanding };
}
