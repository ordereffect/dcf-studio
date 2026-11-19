import type { Assumptions, CompanyData, HistoricalYear } from "./types";

export const DEFAULT_ERP = 0.043; // Damodaran implied ERP, approx. Edit in the app.
export const DEFAULT_RF = 0.043;
export const DEFAULT_MARGINAL_TAX = 0.25; // US federal 21% + state

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const num = (x: number | null | undefined, d = 0) => (x == null || !Number.isFinite(x) ? d : x);

function cagr(first: number, last: number, years: number) {
  if (first <= 0 || last <= 0 || years <= 0) return NaN;
  return Math.pow(last / first, 1 / years) - 1;
}

export interface HistoricalMetrics {
  fiscalYear: number;
  revenue: number | null;
  growth: number | null;
  operatingMargin: number | null;
  taxRate: number | null;
  sbcPct: number | null;
  capexPct: number | null;
  roic: number | null;
}

export function historicalMetrics(h: HistoricalYear[]): HistoricalMetrics[] {
  return h.map((y, i) => {
    const prev = h[i - 1];
    const rev = y.revenue;
    const ic = num(y.equity, NaN) + num(y.totalDebt) + num(y.leaseLiabilities) - num(y.cash);
    const nopat =
      y.operatingIncome != null && y.pretaxIncome && y.incomeTax != null
        ? y.operatingIncome * (1 - clamp(y.incomeTax / y.pretaxIncome, 0, 0.5))
        : null;
    return {
      fiscalYear: y.fiscalYear,
      revenue: rev,
      growth: rev && prev?.revenue ? rev / prev.revenue - 1 : null,
      operatingMargin: rev && y.operatingIncome != null ? y.operatingIncome / rev : null,
      taxRate: y.pretaxIncome && y.pretaxIncome > 0 && y.incomeTax != null ? y.incomeTax / y.pretaxIncome : null,
      sbcPct: rev && y.sbc != null ? y.sbc / rev : null,
      capexPct: rev && y.capex != null ? y.capex / rev : null,
      roic: nopat != null && Number.isFinite(ic) && ic > 0 ? nopat / ic : null,
    };
  });
}

const median = (xs: number[]) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return NaN;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Build a sensible starting model from reported data. Every number is editable afterwards. */
export function deriveAssumptions(c: CompanyData): Assumptions {
  const h = c.historicals.filter((y) => y.revenue && y.revenue > 0);
  const last = h[h.length - 1];
  const m = historicalMetrics(h);
  const recent = m.slice(-3);

  const baseRevenue = num(last?.revenue, 1000);
  const n = h.length;
  const growth3 = n >= 4 ? cagr(h[n - 4].revenue!, last.revenue!, 3) : n >= 2 ? cagr(h[0].revenue!, last.revenue!, n - 1) : 0.05;
  const revenueGrowth = clamp(Number.isFinite(growth3) ? growth3 : 0.05, -0.1, 0.4);

  const currentMargin = clamp(num(recent[recent.length - 1]?.operatingMargin, 0.1), -0.5, 0.7);
  const avgMargin = median(recent.map((x) => x.operatingMargin ?? NaN));
  const targetMargin = clamp(Number.isFinite(avgMargin) ? Math.max(avgMargin, currentMargin) : currentMargin, -0.2, 0.6);

  const eff = median(recent.map((x) => x.taxRate ?? NaN));
  const effectiveTaxRate = clamp(Number.isFinite(eff) ? eff : 0.2, 0, 0.4);

  // Sales-to-capital: revenue / (book equity + debt - cash), bounded to a sane range.
  const ic = num(last?.equity) + num(last?.totalDebt) + num(last?.leaseLiabilities) - num(last?.cash);
  const stc = ic > 0 ? baseRevenue / ic : 2;
  const salesToCapital = clamp(stc, 0.5, 5);

  const rf = c.riskFreeRate ?? DEFAULT_RF;
  const beta = clamp(num(c.beta, 1), 0.4, 2.5);
  const debt = num(last?.totalDebt) + num(last?.leaseLiabilities);
  const mcap = num(c.marketCap, NaN);
  const debtToCapital = Number.isFinite(mcap) && mcap + debt > 0 ? clamp(debt / (mcap + debt), 0, 0.7) : 0.15;

  const terminalGrowth = Math.min(0.03, rf);
  const wacc0 = (1 - debtToCapital) * (rf + beta * DEFAULT_ERP) + debtToCapital * (rf + 0.015) * (1 - DEFAULT_MARGINAL_TAX);

  return {
    forecastYears: 10,
    baseRevenue,
    revenueGrowth,
    highGrowthYears: 5,
    currentMargin,
    targetMargin,
    marginConvergenceYear: 5,
    effectiveTaxRate,
    marginalTaxRate: DEFAULT_MARGINAL_TAX,
    salesToCapital,
    riskFreeRate: rf,
    equityRiskPremium: DEFAULT_ERP,
    beta,
    preTaxCostOfDebt: rf + 0.015,
    debtToCapital,
    waccOverride: null,
    terminalMethod: "perpetuity",
    terminalGrowth,
    terminalRoic: Math.max(wacc0 + 0.02, 0.1),
    exitMultiple: 15,
    cash: num(last?.cash),
    debt,
    minorityInterest: num(last?.minorityInterest),
    otherAdjustments: 0,
    sharesOutstanding: num(c.sharesOutstanding, 1),
    midYear: true,
  };
}
