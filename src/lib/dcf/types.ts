/** One fiscal year of reported financials, in the company's reporting currency. */
export interface HistoricalYear {
  fiscalYear: number;
  periodEnd: string; // ISO date
  revenue: number | null;
  operatingIncome: number | null; // EBIT (GAAP, SBC already expensed)
  pretaxIncome: number | null;
  incomeTax: number | null;
  netIncome: number | null;
  depreciation: number | null;
  capex: number | null; // positive number = cash spent
  sbc: number | null;
  cash: number | null; // cash + short-term investments
  totalDebt: number | null; // incl. current portion, excl. leases
  leaseLiabilities: number | null;
  equity: number | null; // book equity
  minorityInterest: number | null;
}

export interface CompanyData {
  ticker: string;
  name: string;
  exchange?: string;
  currency: string;
  sector?: string;
  industry?: string;
  description?: string;
  price: number | null;
  sharesOutstanding: number | null;
  marketCap: number | null;
  beta: number | null;
  historicals: HistoricalYear[]; // oldest -> newest
  riskFreeRate: number | null; // decimal, e.g. 0.043
  sources: string[];
  warnings: string[];
  /** Most recent stock split within the last year, if any. */
  lastSplit?: { date: string; ratio: number };
  fetchedAt: string;
}

export type TerminalMethod = "perpetuity" | "exitMultiple";

/**
 * "firm": classic FCFF model discounted at WACC, then cash added and debt subtracted.
 * "equity": for banks, brokers and insurers, whose debt and cash are part of operations.
 * Cash flow to equity (net income minus the equity retained to grow) is discounted at the
 * cost of equity, and there is no cash/debt bridge.
 */
export type Approach = "firm" | "equity";

/** Every input the model needs. Rates are decimals (0.08 = 8%). */
export interface Assumptions {
  approach: Approach;
  forecastYears: number; // 5..10
  baseRevenue: number;
  // Revenue growth: constant for `highGrowthYears`, then fades linearly to terminal growth.
  revenueGrowth: number;
  highGrowthYears: number;
  // Operating margin (pre-tax margin in the equity approach): moves linearly from current to target by `marginConvergenceYear`.
  currentMargin: number;
  targetMargin: number;
  marginConvergenceYear: number;
  // Tax: effective today, converging to marginal by the final year.
  effectiveTaxRate: number;
  marginalTaxRate: number;
  // Reinvestment: each $1 of new revenue requires 1/salesToCapital of invested capital
  // (of book equity in the equity approach).
  salesToCapital: number;
  // Cost of capital
  riskFreeRate: number;
  equityRiskPremium: number;
  beta: number;
  preTaxCostOfDebt: number;
  debtToCapital: number; // target weight of debt
  waccOverride: number | null;
  // Terminal value
  terminalMethod: TerminalMethod;
  terminalGrowth: number;
  terminalRoic: number; // return on new capital (ROE in the equity approach) in perpetuity
  exitMultiple: number; // EV / EBIT on final-year EBIT (P/E on net income in the equity approach)
  // Bridge from enterprise value to equity value
  cash: number;
  debt: number; // incl. leases if you choose to treat them as debt
  minorityInterest: number;
  otherAdjustments: number; // + non-operating assets, - other claims
  bookEquity?: number; // latest book equity; the equity approach starts from it
  sharesOutstanding: number;
  // Conventions
  midYear: boolean;
}

export interface ProjectionYear {
  year: number; // 1..N
  fiscalYear: number;
  growth: number;
  revenue: number;
  margin: number;
  ebit: number; // pre-tax income in the equity approach
  taxRate: number;
  nopat: number; // net income in the equity approach
  reinvestment: number;
  fcff: number; // free cash flow to equity in the equity approach
  investedCapital: number; // end of year (book equity in the equity approach)
  roic: number; // NOPAT / beginning invested capital (ROE in the equity approach)
  discountFactor: number;
  pvFcff: number;
}

export interface WaccBreakdown {
  costOfEquity: number;
  afterTaxCostOfDebt: number;
  equityWeight: number;
  debtWeight: number;
  wacc: number; // the discount rate actually used: cost of equity in the equity approach
}

export interface Valuation {
  wacc: WaccBreakdown;
  years: ProjectionYear[];
  terminal: {
    fcff: number;
    value: number;
    pv: number;
    impliedExitMultiple: number; // TV / final EBIT
    impliedPerpetuityGrowth: number; // growth implied if exit multiple used
    reinvestmentRate: number;
  };
  sumPvFcff: number;
  enterpriseValue: number; // NaN in the equity approach
  equityValue: number;
  valuePerShare: number;
  terminalShare: number; // PV(TV) / total PV; NaN when total PV is not positive
  warnings: string[];
}

/** Scenario shifts are relative to the base case, so editing the base moves every scenario with it. */
export interface ScenarioShifts {
  revenueGrowth: number; // added, in decimal points
  targetMargin: number; // added
  salesToCapital: number; // multiplier, 1 = unchanged
  wacc: number; // added
  terminalGrowth: number; // added
}

export interface Scenario {
  id: "bear" | "base" | "bull";
  label: string;
  probability: number;
  shifts: ScenarioShifts;
}
