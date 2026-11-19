import type { CompanyData } from "@/lib/dcf/types";

/**
 * A fictional company for trying the app offline or without live data.
 * The numbers are made up and describe no real business.
 */
export const DEMO_COMPANY: CompanyData = {
  ticker: "DEMO",
  name: "Northwind Software (sample)",
  currency: "USD",
  sector: "Technology",
  industry: "Software, application",
  description:
    "A fictional vertical-software company used to demo the app. It sells subscription workflow software to mid-sized logistics firms, growing in the high teens with expanding margins.",
  price: 84.5,
  sharesOutstanding: 412e6,
  marketCap: 84.5 * 412e6,
  beta: 1.15,
  riskFreeRate: 0.043,
  historicals: [
    [2016, 1180, 0.04, 0.17, 0.06],
    [2017, 1390, 0.06, 0.18, 0.065],
    [2018, 1655, 0.08, 0.2, 0.07],
    [2019, 1960, 0.1, 0.19, 0.07],
    [2020, 2280, 0.11, 0.18, 0.072],
    [2021, 2790, 0.13, 0.19, 0.075],
    [2022, 3310, 0.12, 0.2, 0.08],
    [2023, 3880, 0.15, 0.2, 0.078],
    [2024, 4560, 0.17, 0.21, 0.076],
    [2025, 5370, 0.19, 0.21, 0.074],
  ].map(([fy, revM, margin, tax, sbcPct], i) => {
    const revenue = revM * 1e6;
    const ebit = revenue * margin;
    const pretax = ebit * 1.02;
    return {
      fiscalYear: fy,
      periodEnd: `${fy}-12-31`,
      revenue,
      operatingIncome: ebit,
      pretaxIncome: pretax,
      incomeTax: pretax * tax,
      netIncome: pretax * (1 - tax),
      depreciation: revenue * 0.035,
      capex: revenue * 0.04,
      sbc: revenue * sbcPct,
      cash: (900 + i * 220) * 1e6,
      totalDebt: 1500e6,
      leaseLiabilities: 180e6,
      equity: (1600 + i * 330) * 1e6,
      minorityInterest: 0,
    };
  }),
  sources: ["Sample data (fictional)"],
  warnings: [],
  fetchedAt: new Date(0).toISOString(),
};
