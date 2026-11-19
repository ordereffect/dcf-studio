import type { Assumptions, ProjectionYear, Valuation, WaccBreakdown } from "./types";

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));

export function computeWacc(a: Assumptions): WaccBreakdown {
  const costOfEquity = a.riskFreeRate + a.beta * a.equityRiskPremium;
  const afterTaxCostOfDebt = a.preTaxCostOfDebt * (1 - a.marginalTaxRate);
  const debtWeight = Math.min(0.95, Math.max(0, a.debtToCapital));
  const equityWeight = 1 - debtWeight;
  const computed = equityWeight * costOfEquity + debtWeight * afterTaxCostOfDebt;
  return {
    costOfEquity,
    afterTaxCostOfDebt,
    equityWeight,
    debtWeight,
    wacc: a.waccOverride ?? computed,
  };
}

/** Growth for forecast year t (1-based): flat for the high-growth period, then a linear fade to terminal growth. */
export function growthForYear(a: Assumptions, t: number): number {
  const n = a.forecastYears;
  const h = Math.min(a.highGrowthYears, n);
  if (t <= h) return a.revenueGrowth;
  const fadeYears = n - h;
  if (fadeYears <= 0) return a.revenueGrowth;
  return lerp(a.revenueGrowth, a.terminalGrowth, (t - h) / fadeYears);
}

export function marginForYear(a: Assumptions, t: number): number {
  const c = Math.max(1, a.marginConvergenceYear);
  return lerp(a.currentMargin, a.targetMargin, t / c);
}

export function taxForYear(a: Assumptions, t: number): number {
  return lerp(a.effectiveTaxRate, a.marginalTaxRate, t / a.forecastYears);
}

export function runDcf(a: Assumptions, firstFiscalYear = new Date().getFullYear()): Valuation {
  const warnings: string[] = [];
  const wacc = computeWacc(a);
  const r = wacc.wacc;
  const n = Math.max(1, Math.round(a.forecastYears));

  const years: ProjectionYear[] = [];
  let prevRevenue = a.baseRevenue;
  // Starting invested capital is approximated from the sales-to-capital ratio so ROIC is
  // internally consistent with the reinvestment assumption.
  let investedCapital = a.baseRevenue / Math.max(0.01, a.salesToCapital);

  for (let t = 1; t <= n; t++) {
    const growth = growthForYear(a, t);
    const revenue = prevRevenue * (1 + growth);
    const margin = marginForYear(a, t);
    const ebit = revenue * margin;
    const taxRate = taxForYear(a, t);
    const nopat = ebit > 0 ? ebit * (1 - taxRate) : ebit; // no tax on losses (simplified, no NOL schedule)
    const reinvestment = (revenue - prevRevenue) / Math.max(0.01, a.salesToCapital);
    const fcff = nopat - reinvestment;
    const roic = investedCapital > 0 ? nopat / investedCapital : 0;
    investedCapital += reinvestment;
    const timing = a.midYear ? t - 0.5 : t;
    const discountFactor = 1 / Math.pow(1 + r, timing);
    years.push({
      year: t,
      fiscalYear: firstFiscalYear + t - 1,
      growth,
      revenue,
      margin,
      ebit,
      taxRate,
      nopat,
      reinvestment,
      fcff,
      investedCapital,
      roic,
      discountFactor,
      pvFcff: fcff * discountFactor,
    });
    prevRevenue = revenue;
  }

  const last = years[years.length - 1];
  const g = a.terminalGrowth;
  const terminalNopat = last.revenue * (1 + g) * last.margin * (1 - a.marginalTaxRate);
  const reinvestmentRate = a.terminalRoic > 0 ? Math.max(0, g / a.terminalRoic) : 0;
  const terminalFcff = terminalNopat * (1 - reinvestmentRate);

  let terminalValue: number;
  if (a.terminalMethod === "exitMultiple") {
    terminalValue = last.ebit * a.exitMultiple;
  } else {
    if (r <= g) {
      warnings.push("Terminal growth is at or above WACC, so the perpetuity value is undefined. Lower growth or raise WACC.");
      terminalValue = NaN;
    } else {
      terminalValue = terminalFcff / (r - g);
    }
  }
  // Terminal value sits at the end of year N. With the mid-year convention the perpetuity
  // cash flows also arrive mid-year, so the perpetuity TV is pulled forward half a year.
  const tvTiming = a.midYear && a.terminalMethod === "perpetuity" ? n - 0.5 : n;
  const terminalPv = terminalValue / Math.pow(1 + r, tvTiming);

  const sumPvFcff = years.reduce((s, y) => s + y.pvFcff, 0);
  const enterpriseValue = sumPvFcff + terminalPv;
  const equityValue = enterpriseValue + a.cash - a.debt - a.minorityInterest + a.otherAdjustments;
  const valuePerShare = a.sharesOutstanding > 0 ? equityValue / a.sharesOutstanding : NaN;

  // Cross-checks between the two terminal methods
  const impliedExitMultiple = last.ebit !== 0 ? terminalValue / last.ebit : NaN;
  const impliedPerpetuityGrowth =
    terminalValue > 0 ? solveImpliedGrowth(terminalValue, last, a, r) : NaN;

  const terminalShare = enterpriseValue !== 0 ? terminalPv / enterpriseValue : NaN;
  if (terminalShare > 0.8) warnings.push("Over 80% of value sits in the terminal value. The answer leans heavily on the long run.");
  if (a.terminalRoic < r && g > 0) warnings.push("Terminal ROIC is below WACC, so growth destroys value in perpetuity.");
  if (g > a.riskFreeRate) warnings.push("Terminal growth exceeds the risk-free rate, a common proxy for long-run nominal GDP.");
  if (equityValue < 0) warnings.push("Equity value is negative: debt and other claims exceed enterprise value.");

  return {
    wacc,
    years,
    terminal: {
      fcff: terminalFcff,
      value: terminalValue,
      pv: terminalPv,
      impliedExitMultiple,
      impliedPerpetuityGrowth,
      reinvestmentRate,
    },
    sumPvFcff,
    enterpriseValue,
    equityValue,
    valuePerShare,
    terminalShare,
    warnings,
  };
}

/** Perpetuity growth g that reproduces a given terminal value, keeping terminal ROIC fixed. */
function solveImpliedGrowth(tv: number, last: ProjectionYear, a: Assumptions, r: number): number {
  const f = (g: number) => {
    const nopat = last.revenue * (1 + g) * last.margin * (1 - a.marginalTaxRate);
    const fcff = nopat * (1 - (a.terminalRoic > 0 ? g / a.terminalRoic : 0));
    return fcff / (r - g) - tv;
  };
  return bisect(f, -0.05, r - 1e-4);
}

/** Bisection root finder. Returns NaN when the root is not bracketed. */
export function bisect(f: (x: number) => number, lo: number, hi: number, iters = 80): number {
  let flo = f(lo);
  const fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return NaN;
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (!Number.isFinite(fm)) return NaN;
    if (Math.abs(fm) < 1e-9) return mid;
    if (flo * fm < 0) hi = mid;
    else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}
