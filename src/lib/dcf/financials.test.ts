import { describe, expect, it } from "vitest";
import { deriveAssumptions, isFinancial } from "./defaults";
import { computeWacc, runDcf } from "./engine";
import type { CompanyData, HistoricalYear } from "./types";

// A fast-growing online broker shaped like HOOD: no operating income line in its filings,
// a balance sheet full of customer cash, and book equity far above what revenue alone needs.
const year = (fy: number, rev: number, pretax: number, tax: number, equity: number, cash: number): HistoricalYear => ({
  fiscalYear: fy,
  periodEnd: `${fy}-12-31`,
  revenue: rev * 1e9,
  operatingIncome: null,
  pretaxIncome: pretax * 1e9,
  incomeTax: tax * 1e9,
  netIncome: (pretax - tax) * 1e9,
  depreciation: null,
  capex: null,
  sbc: null,
  cash: cash * 1e9,
  totalDebt: 0,
  leaseLiabilities: 0.06e9,
  equity: equity * 1e9,
  minorityInterest: null,
});

const broker: CompanyData = {
  ticker: "BRKR",
  name: "Broker",
  currency: "USD",
  sector: "Financial Services",
  industry: "Capital Markets",
  price: 62.63,
  sharesOutstanding: 0.79e9,
  marketCap: 49.7e9,
  beta: 2.53,
  riskFreeRate: 0.049,
  historicals: [
    year(2022, 1.36, -1.03, 0, 6.76, 6.3),
    year(2023, 1.87, -0.54, 0, 7.0, 4.8),
    year(2024, 2.95, 1.06, -0.35, 7.96, 4.3),
    year(2025, 4.4, 2.2, 0.4, 8.6, 4.2),
  ],
  sources: [],
  warnings: [],
  fetchedAt: "",
};

describe("financial companies", () => {
  it("detects banks, brokers and insurers but not card networks or exchanges", () => {
    expect(isFinancial({ industry: "Capital Markets" })).toBe(true);
    expect(isFinancial({ industry: "Banks - Regional" })).toBe(true);
    expect(isFinancial({ industry: "Banks—Diversified" })).toBe(true);
    expect(isFinancial({ industry: "Insurance - Property & Casualty" })).toBe(true);
    expect(isFinancial({ industry: "Credit Services" })).toBe(false);
    expect(isFinancial({ industry: "Insurance Brokers" })).toBe(false);
    expect(isFinancial({ industry: "Financial Data & Stock Exchanges" })).toBe(false);
    expect(isFinancial({ industry: "Software - Application" })).toBe(false);
    expect(isFinancial({})).toBe(false);
  });

  it("values a broker on equity with a positive value", () => {
    const a = deriveAssumptions(broker);
    expect(a.approach).toBe("equity");
    expect(a.currentMargin).toBeCloseTo(0.5, 2); // pre-tax margin, not a 10% placeholder
    expect(a.bookEquity).toBeCloseTo(8.6e9);
    const v = runDcf(a);
    expect(v.wacc.wacc).toBeCloseTo(computeWacc(a).costOfEquity, 10);
    expect(Number.isNaN(v.enterpriseValue)).toBe(true);
    expect(v.equityValue).toBeGreaterThan(0);
    expect(v.valuePerShare).toBeGreaterThan(0);
    // Year-1 ROE uses reported book equity
    expect(v.years[0].roic).toBeCloseTo(v.years[0].nopat / 8.6e9, 6);
  });

  it("ignores cash and debt in the equity approach", () => {
    const a = deriveAssumptions(broker);
    const v1 = runDcf(a);
    const v2 = runDcf({ ...a, cash: a.cash + 5e9, debt: a.debt + 20e9 });
    expect(v2.equityValue).toBeCloseTo(v1.equityValue, 0);
  });

  it("falls back to pre-tax margin in the firm approach when operating income is missing", () => {
    const a = deriveAssumptions(broker, "firm");
    expect(a.approach).toBe("firm");
    expect(a.currentMargin).toBeCloseTo(0.5, 2);
    expect(runDcf(a).enterpriseValue).toBeGreaterThan(0);
  });

  it("reports no terminal share when total value is negative", () => {
    const a = { ...deriveAssumptions(broker, "firm"), currentMargin: 0.05, targetMargin: 0.05, salesToCapital: 0.5 };
    const v = runDcf(a);
    expect(v.sumPvFcff + v.terminal.pv).toBeLessThan(0);
    expect(Number.isNaN(v.terminalShare)).toBe(true);
    expect(v.warnings.some((w) => w.startsWith("The cash flows are worth less than zero"))).toBe(true);
  });
});
