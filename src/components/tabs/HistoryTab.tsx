"use client";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel, chartColors, tooltipStyle } from "../ui";
import { historicalMetrics } from "@/lib/dcf/defaults";
import { big, mm, pct } from "@/lib/format";
import type { CompanyData } from "@/lib/dcf/types";

export function HistoryTab({ c }: { c: CompanyData }) {
  const h = c.historicals;
  const m = historicalMetrics(h);
  if (!h.length)
    return (
      <Panel title="Reported history">
        <p className="text-[13px] text-muted">
          No filings were found for this ticker. Set the base revenue, margins and balance sheet in the assumptions panel to model it by hand.
        </p>
      </Panel>
    );

  const data = m.map((x) => ({ fy: `FY${String(x.fiscalYear).slice(-2)}`, revenue: (x.revenue ?? 0) / 1e6, margin: x.operatingMargin }));
  const rows: { label: string; get: (i: number) => string; sub?: boolean; strong?: boolean }[] = [
    { label: "Revenue", get: (i) => mm(h[i].revenue), strong: true },
    { label: "Growth", get: (i) => pct(m[i].growth), sub: true },
    { label: "Operating income", get: (i) => mm(h[i].operatingIncome) },
    { label: "Operating margin", get: (i) => pct(m[i].operatingMargin), sub: true },
    { label: "Pre-tax income", get: (i) => mm(h[i].pretaxIncome) },
    { label: "Pre-tax margin", get: (i) => pct(m[i].pretaxMargin), sub: true },
    { label: "Effective tax rate", get: (i) => pct(m[i].taxRate), sub: true },
    { label: "Net income", get: (i) => mm(h[i].netIncome) },
    { label: "D&A", get: (i) => mm(h[i].depreciation) },
    { label: "Capex", get: (i) => mm(h[i].capex) },
    { label: "Stock-based comp", get: (i) => mm(h[i].sbc) },
    { label: "SBC % revenue", get: (i) => pct(m[i].sbcPct), sub: true },
    { label: "Cash & investments", get: (i) => mm(h[i].cash) },
    { label: "Debt", get: (i) => mm(h[i].totalDebt) },
    { label: "Lease liabilities", get: (i) => mm(h[i].leaseLiabilities) },
    { label: "Book equity", get: (i) => mm(h[i].equity) },
    { label: "ROIC (after tax)", get: (i) => pct(m[i].roic), sub: true },
    { label: "ROE", get: (i) => pct(m[i].roe), sub: true },
  ];

  return (
    <div className="grid gap-5">
      <Panel title="Revenue and operating margin" info="history">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: -8, right: 0, top: 4 }}>
              <CartesianGrid vertical={false} stroke={chartColors.rule} />
              <XAxis dataKey="fy" tick={{ fill: chartColors.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="r" tick={{ fill: chartColors.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(x) => big(x * 1e6)} width={56} />
              <YAxis yAxisId="m" orientation="right" tick={{ fill: chartColors.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(x) => pct(x, 0)} width={44} />
              <Tooltip
                {...tooltipStyle}
                formatter={(x, n) => (n === "revenue" ? [big(Number(x) * 1e6, c.currency), "Revenue"] : [pct(Number(x)), "Operating margin"])}
              />
              <Bar yAxisId="r" dataKey="revenue" fill={chartColors.faint} radius={[2, 2, 0, 0]} />
              <Line yAxisId="m" dataKey="margin" stroke={chartColors.brass} strokeWidth={2} dot={{ r: 2.5, fill: chartColors.brass }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="Reported financials" note={`${c.currency} millions · from annual filings`}>
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="num w-full min-w-[640px] text-right text-[13px]">
            <thead>
              <tr className="text-[12px] text-muted">
                <th className="sticky left-0 bg-surface pb-2" />
                {h.map((y) => (
                  <th key={y.periodEnd} className="pb-2 pl-3 font-medium" title={`Period ending ${y.periodEnd}`}>
                    FY{String(y.fiscalYear).slice(-2)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className={r.strong ? "font-semibold" : ""}>
                  <td className={`sticky left-0 bg-surface py-1 pr-3 text-left ${r.sub ? "text-muted" : ""}`}>{r.label}</td>
                  {h.map((_, i) => (
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
    </div>
  );
}
