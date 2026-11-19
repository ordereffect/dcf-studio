"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel, chartColors, tooltipStyle } from "../ui";
import { big, mm, mult, pct } from "@/lib/format";
import type { Assumptions, Valuation } from "@/lib/dcf/types";

export function ModelTab({ v, a, currency, lastFy }: { v: Valuation; a: Assumptions; currency: string; lastFy: number }) {
  const rows: { label: string; get: (i: number) => string; strong?: boolean; sub?: boolean }[] = [
    { label: "Revenue growth", get: (i) => pct(v.years[i].growth), sub: true },
    { label: "Revenue", get: (i) => mm(v.years[i].revenue), strong: true },
    { label: "Operating margin", get: (i) => pct(v.years[i].margin), sub: true },
    { label: "EBIT", get: (i) => mm(v.years[i].ebit) },
    { label: "Tax rate", get: (i) => pct(v.years[i].taxRate), sub: true },
    { label: "NOPAT", get: (i) => mm(v.years[i].nopat) },
    { label: "Reinvestment", get: (i) => mm(-v.years[i].reinvestment) },
    { label: "Free cash flow to firm", get: (i) => mm(v.years[i].fcff), strong: true },
    { label: "Discount factor", get: (i) => v.years[i].discountFactor.toFixed(3), sub: true },
    { label: "Present value", get: (i) => mm(v.years[i].pvFcff) },
    { label: "ROIC", get: (i) => pct(v.years[i].roic), sub: true },
  ];

  const chart = v.years.map((y) => ({ name: `FY${String(lastFy + y.year).slice(-2)}`, fcff: y.fcff / 1e6, pv: y.pvFcff / 1e6 }));

  const bridge = [
    { label: "PV of forecast cash flows", value: v.sumPvFcff },
    { label: "PV of terminal value", value: v.terminal.pv },
    { label: "Enterprise value", value: v.enterpriseValue, total: true },
    { label: "Plus cash", value: a.cash },
    { label: "Less debt", value: -a.debt },
    { label: "Less minority interest", value: -a.minorityInterest },
    { label: "Other adjustments", value: a.otherAdjustments },
    { label: "Equity value", value: v.equityValue, total: true },
  ].filter((r) => r.total || r.value !== 0);

  return (
    <div className="grid gap-5">
      <Panel title="Projection" info="projection" tour="projection" note={`${currency} millions · fiscal years after FY${lastFy}`}>
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="num w-full min-w-[640px] text-right text-[13px]">
            <thead>
              <tr className="text-[12px] text-muted">
                <th className="sticky left-0 bg-surface pb-2 text-left font-normal" />
                {v.years.map((y) => (
                  <th key={y.year} className="pb-2 pl-3 font-medium">
                    FY{String(lastFy + y.year).slice(-2)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className={r.strong ? "border-t border-rule font-semibold" : ""}>
                  <td className={`sticky left-0 bg-surface py-1 pr-3 text-left ${r.sub ? "text-muted" : ""}`}>{r.label}</td>
                  {v.years.map((_, i) => (
                    <td key={i} className={`py-1 pl-3 ${r.sub ? "text-muted" : ""}`}>
                      {r.get(i)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Panel title="Free cash flow" info="fcff" note="Nominal vs present value">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} barGap={2} margin={{ left: -8, right: 4, top: 4 }}>
                <CartesianGrid vertical={false} stroke={chartColors.rule} />
                <XAxis dataKey="name" tick={{ fill: chartColors.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartColors.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(x) => big(x * 1e6)} width={56} />
                <Tooltip {...tooltipStyle} formatter={(x, n) => [big(Number(x) * 1e6, currency), n === "fcff" ? "FCFF" : "Present value"]} />
                <Bar dataKey="fcff" fill={chartColors.faint} radius={[2, 2, 0, 0]} />
                <Bar dataKey="pv" fill={chartColors.brass} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="From cash flows to equity" info="bridge" tour="bridge">
          <dl className="num text-[13.5px]">
            {bridge.map((r) => (
              <div key={r.label} className={`flex justify-between py-1.5 ${r.total ? "border-t border-rule font-semibold" : "text-muted"}`}>
                <dt>{r.label}</dt>
                <dd className={r.total ? "text-ink" : ""}>{big(r.value, currency)}</dd>
              </div>
            ))}
          </dl>
          <div className="num mt-3 grid grid-cols-2 gap-3 border-t border-rule pt-3 text-[12px] text-muted">
            <div>
              Terminal value share <span className="block text-[15px] font-semibold text-ink">{pct(v.terminalShare, 0)}</span>
            </div>
            <div>
              {a.terminalMethod === "perpetuity" ? "Implied exit EV/EBIT" : "Implied perpetuity growth"}
              <span className="block text-[15px] font-semibold text-ink">
                {a.terminalMethod === "perpetuity" ? mult(v.terminal.impliedExitMultiple) : pct(v.terminal.impliedPerpetuityGrowth, 2)}
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
