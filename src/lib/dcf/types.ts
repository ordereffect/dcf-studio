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
  fetchedAt: string;
}

export type TerminalMethod = "perpetuity" | "exitMultiple";

/** Every input the model needs. Rates are decimals (0.08 = 8%). */
export interface Assumptions {
  forecastYears: number; // 5..10
  baseRevenue: number;
  // Revenue growth: constant for `highGrowthYears`, then fades linearly to terminal growth.
  revenueGrowth: number;
  highGrowthYears: number;
  // Operating margin: moves linearly from current to target by `marginConvergenceYear`.
  currentMargin: number;
  targetMargin: number;
  marginConvergenceYear: number;
  // Tax: effective today, converging to marginal by the final year.
  effectiveTaxRate: number;
  marginalTaxRate: number;
  // Reinvestment: each $1 of new revenue requires 1/salesToCapital of invested capital.
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
  terminalRoic: number; // return on new capital in perpetuity
  exitMultiple: number; // EV / EBIT applied to final-year EBIT
  // Bridge from enterprise value to equity value
  cash: number;
  debt: number; // incl. leases if you choose to treat them as debt
  minorityInterest: number;
  otherAdjustments: number; // + non-operating assets, - other claims
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
  ebit: number;
  taxRate: number;
  nopat: number;
  reinvestment: number;
  fcff: number;
  investedCapital: number; // end of year
  roic: number; // NOPAT / beginning invested capital
  discountFactor: number;
  pvFcff: number;
}

export interface WaccBreakdown {
  costOfEquity: number;
  afterTaxCostOfDebt: number;
  equityWeight: number;
  debtWeight: number;
  wacc: number;
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
  enterpriseValue: number;
  equityValue: number;
  valuePerShare: number;
  terminalShare: number; // PV(TV) / EV
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
