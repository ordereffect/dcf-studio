import { describe, expect, it } from "vitest";
import { runDcf, growthForYear } from "./engine";
import { reverseDcf, scenarioValues, defaultScenarios, sensitivityGrid } from "./analysis";
import type { Assumptions } from "./types";

const base: Assumptions = {
  forecastYears: 5,
  baseRevenue: 1000,
  revenueGrowth: 0.1,
  highGrowthYears: 5,
  currentMargin: 0.2,
  targetMargin: 0.2,
  marginConvergenceYear: 5,
  effectiveTaxRate: 0.25,
  marginalTaxRate: 0.25,
  salesToCapital: 2,
  riskFreeRate: 0.04,
  equityRiskPremium: 0.05,
  beta: 1,
  preTaxCostOfDebt: 0.05,
  debtToCapital: 0,
  waccOverride: null,
  terminalMethod: "perpetuity",
  terminalGrowth: 0.02,
  terminalRoic: 0.12,
  exitMultiple: 12,
  cash: 100,
  debt: 300,
  minorityInterest: 0,
  otherAdjustments: 0,
  sharesOutstanding: 100,
  midYear: false,
};

describe("runDcf", () => {
  it("matches a hand-computed valuation", () => {
    const v = runDcf(base);
    expect(v.wacc.wacc).toBeCloseTo(0.09, 10);
    // Year 1: revenue 1100, EBIT 220, NOPAT 165, reinvestment 50, FCFF 115
    expect(v.years[0].revenue).toBeCloseTo(1100);
    expect(v.years[0].fcff).toBeCloseTo(115);
    // Manual PV of explicit flows
    let rev = 1000;
    let pv = 0;
    for (let t = 1; t <= 5; t++) {
      const r = rev * 1.1;
      pv += (r * 0.2 * 0.75 - (r - rev) / 2) / 1.09 ** t;
      rev = r;
    }
    expect(v.sumPvFcff).toBeCloseTo(pv, 6);
    const tFcff = rev * 1.02 * 0.2 * 0.75 * (1 - 0.02 / 0.12);
    const tv = tFcff / (0.09 - 0.02);
    expect(v.terminal.value).toBeCloseTo(tv, 6);
    const ev = pv + tv / 1.09 ** 5;
    expect(v.enterpriseValue).toBeCloseTo(ev, 6);
    expect(v.valuePerShare).toBeCloseTo((ev + 100 - 300) / 100, 6);
  });

  it("mid-year convention raises value", () => {
    expect(runDcf({ ...base, midYear: true }).valuePerShare).toBeGreaterThan(runDcf(base).valuePerShare);
  });

  it("exit multiple terminal value uses final EBIT", () => {
    const v = runDcf({ ...base, terminalMethod: "exitMultiple" });
    expect(v.terminal.value).toBeCloseTo(v.years[4].ebit * 12, 6);
    expect(v.terminal.impliedExitMultiple).toBeCloseTo(12, 6);
  });

  it("fades growth to terminal", () => {
    const a = { ...base, forecastYears: 10, highGrowthYears: 5 };
    expect(growthForYear(a, 5)).toBeCloseTo(0.1);
    expect(growthForYear(a, 10)).toBeCloseTo(0.02);
  });

  it("flags g >= WACC", () => {
    const v = runDcf({ ...base, waccOverride: 0.02 });
    expect(v.warnings.length).toBeGreaterThan(0);
    expect(Number.isNaN(v.valuePerShare)).toBe(true);
  });
});

describe("analysis", () => {
  it("reverse DCF recovers the input growth", () => {
    const price = runDcf(base).valuePerShare;
    expect(reverseDcf(base, price, "revenueGrowth")).toBeCloseTo(0.1, 5);
    expect(reverseDcf(base, price, "wacc")).toBeCloseTo(0.09, 5);
  });

  it("weights scenarios by probability", () => {
    const { rows, weighted } = scenarioValues(base, defaultScenarios());
    expect(rows[0].value).toBeLessThan(rows[1].value);
    expect(rows[2].value).toBeGreaterThan(rows[1].value);
    expect(weighted).toBeCloseTo(0.25 * rows[0].value + 0.5 * rows[1].value + 0.25 * rows[2].value, 6);
  });

  it("sensitivity centre equals base value", () => {
    const g = sensitivityGrid(base, "wacc", "terminalGrowth", 0.01, 0.005);
    expect(g.values[2][2]).toBeCloseTo(runDcf(base).valuePerShare, 6);
  });
});
