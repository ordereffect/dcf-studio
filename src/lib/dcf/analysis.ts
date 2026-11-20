import { bisect, runDcf } from "./engine";
import type { Assumptions, Scenario, ScenarioShifts } from "./types";

export const valueOf = (a: Assumptions) => runDcf(a).valuePerShare;

export const NO_SHIFT: ScenarioShifts = { revenueGrowth: 0, targetMargin: 0, salesToCapital: 1, wacc: 0, terminalGrowth: 0 };

export function applyScenario(base: Assumptions, s: Scenario): Assumptions {
  const k = { ...NO_SHIFT, ...s.shifts };
  const w = runDcf(base).wacc.wacc;
  return {
    ...base,
    revenueGrowth: base.revenueGrowth + k.revenueGrowth,
    targetMargin: base.targetMargin + k.targetMargin,
    salesToCapital: base.salesToCapital * k.salesToCapital,
    terminalGrowth: base.terminalGrowth + k.terminalGrowth,
    waccOverride: k.wacc !== 0 ? w + k.wacc : base.waccOverride,
  };
}

export function scenarioValues(base: Assumptions, scenarios: Scenario[]) {
  const rows = scenarios.map((s) => ({ scenario: s, value: valueOf(applyScenario(base, s)) }));
  const totalP = scenarios.reduce((s, x) => s + x.probability, 0) || 1;
  const weighted = rows.reduce((s, r) => s + (r.value * r.scenario.probability) / totalP, 0);
  return { rows, weighted };
}

export function defaultScenarios(): Scenario[] {
  return [
    {
      id: "bear",
      label: "Bear",
      probability: 0.25,
      shifts: { ...NO_SHIFT, revenueGrowth: -0.04, targetMargin: -0.04, salesToCapital: 0.85 },
    },
    { id: "base", label: "Base", probability: 0.5, shifts: { ...NO_SHIFT } },
    {
      id: "bull",
      label: "Bull",
      probability: 0.25,
      shifts: { ...NO_SHIFT, revenueGrowth: 0.04, targetMargin: 0.03, salesToCapital: 1.15 },
    },
  ];
}

export type SensitivityKey = "wacc" | "terminalGrowth" | "revenueGrowth" | "targetMargin" | "exitMultiple";

export const SENSITIVITY_LABELS: Record<SensitivityKey, string> = {
  wacc: "WACC",
  terminalGrowth: "Terminal growth",
  revenueGrowth: "Revenue growth",
  targetMargin: "Target margin",
  exitMultiple: "Exit EV/EBIT",
};

function setParam(a: Assumptions, key: SensitivityKey, v: number): Assumptions {
  if (key === "wacc") return { ...a, waccOverride: v };
  return { ...a, [key]: v };
}

export function currentParam(a: Assumptions, key: SensitivityKey): number {
  if (key === "wacc") return runDcf(a).wacc.wacc;
  return a[key];
}

export function sensitivityGrid(
  a: Assumptions,
  rowKey: SensitivityKey,
  colKey: SensitivityKey,
  rowStep: number,
  colStep: number,
  size = 5,
) {
  const half = Math.floor(size / 2);
  const r0 = currentParam(a, rowKey);
  const c0 = currentParam(a, colKey);
  const rows = Array.from({ length: size }, (_, i) => r0 + (i - half) * rowStep);
  const cols = Array.from({ length: size }, (_, j) => c0 + (j - half) * colStep);
  const values = rows.map((rv) => cols.map((cv) => valueOf(setParam(setParam(a, rowKey, rv), colKey, cv))));
  return { rows, cols, values };
}

export type ReverseTarget = "revenueGrowth" | "targetMargin" | "wacc";

/** Solve for the single input that makes intrinsic value equal the market price, holding everything else. */
export function reverseDcf(a: Assumptions, price: number, target: ReverseTarget): number {
  const ranges: Record<ReverseTarget, [number, number]> = {
    revenueGrowth: [-0.3, 0.8],
    targetMargin: [-0.2, 0.7],
    wacc: [Math.max(a.terminalGrowth + 0.002, 0.02), 0.3],
  };
  const [lo, hi] = ranges[target];
  const f = (x: number) => {
    const next: Assumptions =
      target === "wacc" ? { ...a, waccOverride: x } : { ...a, [target]: x };
    return valueOf(next) - price;
  };
  return bisect(f, lo, hi);
}

/** One-at-a-time swings for a tornado chart: value at low / high for each driver. */
export function tornado(a: Assumptions) {
  const w = runDcf(a).wacc.wacc;
  const drivers: { label: string; low: Assumptions; high: Assumptions; lowLabel: string; highLabel: string }[] = [
    {
      label: "Revenue growth",
      low: { ...a, revenueGrowth: a.revenueGrowth - 0.03 },
      high: { ...a, revenueGrowth: a.revenueGrowth + 0.03 },
      lowLabel: "−3 pts",
      highLabel: "+3 pts",
    },
    {
      label: "Target margin",
      low: { ...a, targetMargin: a.targetMargin - 0.03 },
      high: { ...a, targetMargin: a.targetMargin + 0.03 },
      lowLabel: "−3 pts",
      highLabel: "+3 pts",
    },
    {
      label: a.approach === "equity" ? "Cost of equity" : "WACC",
      low: { ...a, waccOverride: w + 0.01 },
      high: { ...a, waccOverride: w - 0.01 },
      lowLabel: "+1 pt",
      highLabel: "−1 pt",
    },
    {
      label: "Terminal growth",
      low: { ...a, terminalGrowth: a.terminalGrowth - 0.005 },
      high: { ...a, terminalGrowth: a.terminalGrowth + 0.005 },
      lowLabel: "−0.5 pt",
      highLabel: "+0.5 pt",
    },
    {
      label: "Sales to capital",
      low: { ...a, salesToCapital: a.salesToCapital * 0.8 },
      high: { ...a, salesToCapital: a.salesToCapital * 1.2 },
      lowLabel: "−20%",
      highLabel: "+20%",
    },
  ];
  return drivers
    .map((d) => ({ label: d.label, low: valueOf(d.low), high: valueOf(d.high), lowLabel: d.lowLabel, highLabel: d.highLabel }))
    .sort((x, y) => Math.abs(y.high - y.low) - Math.abs(x.high - x.low));
}

/** Simple Monte Carlo over the key drivers using independent normal shocks. */
export function monteCarlo(a: Assumptions, n = 2000, seed = 7) {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const normal = () => {
    const u = Math.max(1e-12, rand());
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const w = runDcf(a).wacc.wacc;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = valueOf({
      ...a,
      revenueGrowth: a.revenueGrowth + normal() * 0.03,
      targetMargin: a.targetMargin + normal() * 0.025,
      waccOverride: Math.max(a.terminalGrowth + 0.01, w + normal() * 0.0075),
      salesToCapital: Math.max(0.3, a.salesToCapital * (1 + normal() * 0.15)),
    });
    if (Number.isFinite(v)) out.push(v);
  }
  out.sort((x, y) => x - y);
  const q = (p: number) => out[Math.min(out.length - 1, Math.floor(p * out.length))];
  return { samples: out, p10: q(0.1), p50: q(0.5), p90: q(0.9) };
}
