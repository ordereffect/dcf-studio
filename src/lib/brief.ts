import { runDcf } from "@/lib/dcf/engine";
import { reverseDcf, scenarioValues, tornado } from "@/lib/dcf/analysis";
import { historicalMetrics } from "@/lib/dcf/defaults";
import type { Assumptions, CompanyData, Scenario } from "@/lib/dcf/types";
import { big, money, mult, pct } from "@/lib/format";

/**
 * A structured markdown brief to paste into Claude. It carries the numbers and the open
 * questions, and asks Claude to argue with the model rather than restate it.
 */
export function buildBrief(c: CompanyData, a: Assumptions, scenarios: Scenario[], price: number | null, notes: string) {
  const v = runDcf(a);
  const ccy = c.currency;
  const sv = scenarioValues(a, scenarios);
  const tor = tornado(a);
  const hist = historicalMetrics(c.historicals).slice(-6);
  const upside = price ? v.valuePerShare / price - 1 : NaN;
  const impliedGrowth = price ? reverseDcf(a, price, "revenueGrowth") : NaN;
  const impliedMargin = price ? reverseDcf(a, price, "targetMargin") : NaN;

  const lines = [
    `# Valuation brief: ${c.name} (${c.ticker})`,
    "",
    `Please act as a sceptical buy-side analyst. Using the model below, help me build the investment narrative: what story do these numbers tell, which assumptions carry the value, what would have to be true for the bull and bear cases, and what evidence I should look for. Challenge any assumption that looks inconsistent with the history or the industry. Finish with a one-paragraph thesis, three key risks, and the two or three metrics to monitor.`,
    "",
    `## Snapshot`,
    `- Sector: ${c.sector ?? "n/a"} / ${c.industry ?? "n/a"}`,
    `- Price: ${money(price, ccy)} · Shares: ${big(a.sharesOutstanding)} · Market cap: ${big(price ? price * a.sharesOutstanding : null, ccy)}`,
    `- Intrinsic value (base): **${money(v.valuePerShare, ccy)}** per share (${Number.isFinite(upside) ? (upside >= 0 ? "+" : "") + pct(upside) : "n/a"} vs price)`,
    `- Probability-weighted value: ${money(sv.weighted, ccy)}`,
    c.description ? `- Business: ${c.description.slice(0, 600)}` : "",
    "",
    `## Recent history`,
    `| FY | Revenue | Growth | Op. margin | Tax rate | ROIC |`,
    `|---|---|---|---|---|---|`,
    ...hist.map((h) => `| ${h.fiscalYear} | ${big(h.revenue, ccy)} | ${pct(h.growth)} | ${pct(h.operatingMargin)} | ${pct(h.taxRate)} | ${pct(h.roic)} |`),
    "",
    `## Base-case assumptions`,
    `- Revenue growth ${pct(a.revenueGrowth)} for ${a.highGrowthYears} years, fading to ${pct(a.terminalGrowth)} by year ${a.forecastYears}`,
    `- Operating margin ${pct(a.currentMargin)} today → ${pct(a.targetMargin)} by year ${a.marginConvergenceYear}`,
    `- Sales-to-capital ${a.salesToCapital.toFixed(2)} (reinvestment per $ of new revenue)`,
    `- Tax ${pct(a.effectiveTaxRate)} effective → ${pct(a.marginalTaxRate)} marginal`,
    `- WACC ${pct(v.wacc.wacc, 2)} (cost of equity ${pct(v.wacc.costOfEquity, 2)} = rf ${pct(a.riskFreeRate, 2)} + β ${a.beta.toFixed(2)} × ERP ${pct(a.equityRiskPremium, 2)}; debt weight ${pct(v.wacc.debtWeight, 0)})`,
    a.terminalMethod === "perpetuity"
      ? `- Terminal: perpetuity growth ${pct(a.terminalGrowth)}, return on new capital ${pct(a.terminalRoic)} (implied exit ${mult(v.terminal.impliedExitMultiple)} EBIT)`
      : `- Terminal: exit at ${mult(a.exitMultiple)} EBIT (implied perpetuity growth ${pct(v.terminal.impliedPerpetuityGrowth)})`,
    "",
    `## Output`,
    `- Enterprise value ${big(v.enterpriseValue, ccy)}; equity value ${big(v.equityValue, ccy)} (cash ${big(a.cash, ccy)}, debt ${big(a.debt, ccy)})`,
    `- Terminal value is ${pct(v.terminalShare, 0)} of enterprise value`,
    `- Year ${a.forecastYears}: revenue ${big(v.years.at(-1)!.revenue, ccy)}, ROIC on invested capital ${pct(v.years.at(-1)!.roic)}`,
    "",
    `## Scenarios`,
    ...sv.rows.map((r) => `- ${r.scenario.label} (${pct(r.scenario.probability, 0)}): ${money(r.value, ccy)} — ${describeOverrides(r.scenario, a)}`),
    "",
    `## What the market is pricing in (reverse DCF)`,
    `- Holding everything else, the price implies revenue growth of ${pct(impliedGrowth)} (model: ${pct(a.revenueGrowth)})`,
    `- or a target operating margin of ${pct(impliedMargin)} (model: ${pct(a.targetMargin)})`,
    "",
    `## Biggest value drivers`,
    ...tor.slice(0, 4).map((t) => `- ${t.label}: ${money(t.low, ccy)} (${t.lowLabel}) to ${money(t.high, ccy)} (${t.highLabel})`),
    "",
    v.warnings.length ? `## Model warnings\n${v.warnings.map((w) => `- ${w}`).join("\n")}\n` : "",
    notes.trim() ? `## My notes\n${notes.trim()}\n` : "",
    `_Data: ${c.sources.join("; ")}. Generated ${new Date().toISOString().slice(0, 10)}._`,
  ];
  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
}

function describeOverrides(s: Scenario, a: Assumptions) {
  const k = s.shifts;
  const parts: string[] = [];
  const pts = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(1)} pts`;
  if (k.revenueGrowth) parts.push(`growth ${pts(k.revenueGrowth)}`);
  if (k.targetMargin) parts.push(`margin ${pts(k.targetMargin)}`);
  if (k.salesToCapital !== 1) parts.push(`sales/capital ×${k.salesToCapital.toFixed(2)}`);
  if (k.terminalGrowth) parts.push(`terminal g ${pts(k.terminalGrowth)}`);
  if (k.wacc) parts.push(`WACC ${pts(k.wacc)}`);
  return parts.length ? parts.join(", ") : `base case (growth ${pct(a.revenueGrowth)}, margin ${pct(a.targetMargin)})`;
}
